import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  DocumentData,
  doc,
  getDoc,
  where,
  addDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { RaceData } from '../models/race-data';
import { SiteStats } from '../models/site-stats';
import { Tournament } from '../models/tournament';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private firestore: Firestore = inject(Firestore);

  getAllRacesStream(): Observable<RaceData[]> {
    return new Observable<RaceData[]>(subscriber => {
      const racesCollection = collection(this.firestore, 'race-data');
      const racesQuery = query(
        racesCollection,
        orderBy('uploadedAt', 'desc')
      );

      const unsubscribe = onSnapshot(racesQuery, 
        (snapshot) => {
          if (snapshot.empty) {
            subscriber.next([]);
            return;
          }

          const races = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data
            } as RaceData;
          });

          subscriber.next(races);
        },
        (error) => {
          console.error('Firestore stream error:', error);
          subscriber.error(error);
        }
      );

      // Cleanup when unsubscribing
      return () => unsubscribe();
    });
  }

  getMostRecentRaceStream(): Observable<RaceData | null> {
    return new Observable<RaceData | null>(subscriber => {
      const racesCollection = collection(this.firestore, 'race-data');
      const recentRaceQuery = query(
        racesCollection,
        orderBy('uploadedAt', 'desc'),
        limit(1)
      );

      const unsubscribe = onSnapshot(recentRaceQuery, 
        (snapshot) => {
          if (snapshot.empty) {
            subscriber.next(null);
            return;
          }

          const doc = snapshot.docs[0];
          const data = doc.data();
          const raceData: RaceData = {
            id: doc.id,
            ...data
          } as RaceData;

          subscriber.next(raceData);
        },
        (error) => {
          console.error('Firestore stream error:', error);
          subscriber.error(error);
        }
      );

      // Cleanup when unsubscribing
      return () => unsubscribe();
    });
  }

  getSiteStatsStream(): Observable<SiteStats[]> {
    return this.getAllRacesStream().pipe(
      map(races => this.calculateSiteStats(races))
    );
  }

  private calculateSiteStats(races: RaceData[]): SiteStats[] {
    // Initialize stats for each driver
    const siteStats: Record<string, SiteStats> = {
      'Fishkill': this.initSiteStats('Fishkill'),
      'Wallkill': this.initSiteStats('Wallkill'),
      'Warwick': this.initSiteStats('Warwick'),
      'San Juan': this.initSiteStats('San Juan'),
      'Patterson': this.initSiteStats('Patterson')
    };
    
    // Process each race
    races.forEach(race => {
      if (!race.Result) return;
      
      // First, count total races for each site (without lap completion restriction)
      race.Result.forEach(result => {
        // Skip invalid times: 999999999 (no valid lap) and 0 (didn't participate)
        if (result.TotalTime !== 999999999 && result.TotalTime !== 0) {
          const driverPrefix = this.extractDriverPrefix(result.DriverName);
          if (driverPrefix && siteStats[driverPrefix]) {
            // Increment total races
            siteStats[driverPrefix].totalRaces++;
          }
        }
      });
      
      // Then, calculate place finishes with lap completion restriction
      if (!race.Laps) return;
      
      const sortedResults = [...race.Result]
        .filter(result => {
          // Filter out invalid times
          if (result.TotalTime === 999999999 || result.TotalTime === 0) {
            return false;
          }
          
          // Count how many laps this driver completed
          const driverLaps = race.Laps.filter(lap => lap.DriverGuid === result.DriverGuid);
          const lapCount = driverLaps.length;
          
          // Check if all laps have 0 cuts
          const allLapsHaveZeroCuts = driverLaps.every(lap => lap.Cuts === 0);
          
          // Only include drivers who completed at least the required number of laps
          // and have no cuts on any lap
          return lapCount >= race.RaceLaps && allLapsHaveZeroCuts;
        })
        .sort((a, b) => a.TotalTime - b.TotalTime);
      
      // Count only 1st, 2nd, and 3rd place finishes
      sortedResults.forEach((result, index) => {
        if (index > 2) return; // Only process first 3 positions
        
        // Extract driver prefix (e.g., "Fishkill" from "Fishkill Driver 1")
        const driverPrefix = this.extractDriverPrefix(result.DriverName);
        
        if (driverPrefix && siteStats[driverPrefix]) {
          // Increment placement count based on position
          switch (index) {
            case 0: siteStats[driverPrefix].firstPlaceCount++; break;
            case 1: siteStats[driverPrefix].secondPlaceCount++; break;
            case 2: siteStats[driverPrefix].thirdPlaceCount++; break;
          }
        }
      });
    });
    
    // Convert to array and return
    return Object.values(siteStats);
  }

  private initSiteStats(driverName: string): SiteStats {
    return {
      driverName,
      firstPlaceCount: 0,
      secondPlaceCount: 0,
      thirdPlaceCount: 0,
      totalRaces: 0
    };
  }

  private extractDriverPrefix(driverName: string): string | null {
    const prefixes = ['Fishkill', 'Wallkill', 'Warwick', 'San Juan', 'Patterson'];
    for (const prefix of prefixes) {
      if (driverName.startsWith(prefix)) {
        return prefix;
      }
    }
    return null;
  }
  
  // Get a specific race by ID
  getRaceById(raceId: string): Observable<RaceData | null> {
    return new Observable<RaceData | null>(subscriber => {
      const raceDocRef = doc(this.firestore, 'race-data', raceId);
      
      getDoc(raceDocRef)
        .then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const raceData: RaceData = {
              id: docSnap.id,
              ...data
            } as RaceData;
            
            subscriber.next(raceData);
          } else {
            subscriber.next(null);
          }
          subscriber.complete();
        })
        .catch(error => {
          console.error('Error getting race document:', error);
          subscriber.error(error);
        });
    });
  }
  
  // Check if tournament is active
  isTournamentActive$ = new Observable<boolean>(subscriber => {
    const tournamentsCollection = collection(this.firestore, 'tournaments');
    const activeQuery = query(
      tournamentsCollection,
      where('status', 'in', ['qualifying', 'heats', 'final']),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(activeQuery, 
      (snapshot) => {
        subscriber.next(!snapshot.empty);
      },
      (error) => {
        console.error('Firestore stream error:', error);
        subscriber.error(error);
      }
    );
    
    // Cleanup when unsubscribing
    return () => unsubscribe();
  });
  
  // Get active tournament
  getActiveTournament(): Observable<Tournament | null> {
    const tournamentsCollection = collection(this.firestore, 'tournaments');
    const activeQuery = query(
      tournamentsCollection,
      where('status', 'in', ['qualifying', 'heats', 'final']),
      limit(1)
    );
    
    return new Observable<Tournament | null>(subscriber => {
      const unsubscribe = onSnapshot(activeQuery, 
        (snapshot) => {
          if (snapshot.empty) {
            subscriber.next(null);
            return;
          }
          
          const doc = snapshot.docs[0];
          const data = doc.data();
          const tournament = {
            id: doc.id,
            ...data
          } as Tournament;
          
          subscriber.next(tournament);
        },
        (error) => {
          console.error('Firestore stream error:', error);
          subscriber.error(error);
        }
      );
      
      // Cleanup when unsubscribing
      return () => unsubscribe();
    });
  }
  
  // For backward compatibility
  isTournamentActive(): boolean {
    // This is a placeholder - in a real implementation, you would check if there's an active tournament
    // For now, we'll return false
    return false;
  }
  
  // Create a new tournament
  createTournament(tournamentData: Partial<Tournament>): Observable<string> {
    return new Observable<string>(subscriber => {
      const tournamentsCollection = collection(this.firestore, 'tournaments');
      
      // Initialize empty structures for results tracking
      const tournament: Partial<Tournament> = {
        ...tournamentData,
        status: 'setup',
        qualifyingResults: {},
        heats: [],
        finalHeat: {
          status: 'scheduled',
          scheduledTime: tournamentData.finalStart || new Date(),
          participants: []
        },
        winners: {
          first: { playerId: '', playerName: '', site: '' },
          second: { playerId: '', playerName: '', site: '' },
          third: { playerId: '', playerName: '', site: '' }
        }
      };
      
      // Initialize qualifyingResults for each included site
      if (tournament.sitesIncluded) {
        tournament.sitesIncluded.forEach(site => {
          tournament.qualifyingResults![site] = [];
        });
      }
      
      // Add the document to Firestore
      addDoc(tournamentsCollection, tournament)
        .then(docRef => {
          subscriber.next(docRef.id);
          subscriber.complete();
        })
        .catch(error => {
          console.error('Error creating tournament:', error);
          subscriber.error(error);
        });
    });
  }

  // Update an existing tournament
  updateTournament(tournamentId: string, tournamentData: Partial<Tournament>): Observable<void> {
    return new Observable<void>(subscriber => {
      const tournamentDocRef = doc(this.firestore, 'tournaments', tournamentId);
      
      updateDoc(tournamentDocRef, tournamentData)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch(error => {
          console.error('Error updating tournament:', error);
          subscriber.error(error);
        });
    });
  }

  // Start the tournament (change status from setup to qualifying)
  startTournament(tournamentId: string): Observable<void> {
    return this.updateTournament(tournamentId, { status: 'qualifying' });
  }

  // Advance tournament to next stage
  advanceTournament(tournamentId: string, nextStage: 'heats' | 'final' | 'completed'): Observable<void> {
    return this.updateTournament(tournamentId, { status: nextStage });
  }
}
