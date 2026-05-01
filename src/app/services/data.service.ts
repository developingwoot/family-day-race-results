import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
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
import { combineLatest, Observable, map } from 'rxjs';
import { RaceData } from '../models/race-data';
import { SiteStats } from '../models/site-stats';
import { Tournament } from '../models/tournament';
import { SitesService } from './sites.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private firestore: Firestore = inject(Firestore);
  private sitesService = inject(SitesService);

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
    const sites$ = toObservable(this.sitesService.availableSites);
    return combineLatest([this.getAllRacesStream(), sites$]).pipe(
      map(([races, siteNames]: [RaceData[], string[]]) => this.calculateSiteStats(races, siteNames))
    );
  }

  private calculateSiteStats(races: RaceData[], siteNames: string[]): SiteStats[] {
    const siteStats: Record<string, SiteStats> = {};
    siteNames.forEach(site => { siteStats[site] = this.initSiteStats(site); });

    // Process each race
    races.forEach(race => {
      if (!race.Result) return;

      // First, count total races for each site (without lap completion restriction)
      race.Result.forEach(result => {
        // Skip invalid times: 999999999 (no valid lap) and 0 (didn't participate)
        if (result.TotalTime !== 999999999 && result.TotalTime !== 0) {
          const driverPrefix = this.extractDriverPrefix(result.DriverName, siteNames);
          if (driverPrefix && siteStats[driverPrefix]) {
            siteStats[driverPrefix].totalRaces++;
          }
        }
      });

      // Then, calculate place finishes with lap completion restriction
      if (!race.Laps) return;

      const sortedResults = [...race.Result]
        .filter(result => {
          if (result.TotalTime === 999999999 || result.TotalTime === 0) return false;
          const driverLaps = race.Laps.filter(lap => lap.DriverGuid === result.DriverGuid);
          return driverLaps.length >= race.RaceLaps && driverLaps.every(lap => lap.Cuts === 0);
        })
        .sort((a, b) => a.TotalTime - b.TotalTime);

      sortedResults.forEach((result, index) => {
        if (index > 2) return;
        const driverPrefix = this.extractDriverPrefix(result.DriverName, siteNames);
        if (driverPrefix && siteStats[driverPrefix]) {
          switch (index) {
            case 0: siteStats[driverPrefix].firstPlaceCount++; break;
            case 1: siteStats[driverPrefix].secondPlaceCount++; break;
            case 2: siteStats[driverPrefix].thirdPlaceCount++; break;
          }
        }
      });
    });

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

  private extractDriverPrefix(driverName: string, knownSites: string[]): string | null {
    for (const prefix of knownSites) {
      if (driverName.startsWith(prefix + ' ') || driverName === prefix) {
        return prefix;
      }
    }
    return null;
  }
  
  getMostRecentRaceBySiteStream(site: string): Observable<RaceData | null> {
    return new Observable<RaceData | null>(subscriber => {
      const racesCollection = collection(this.firestore, 'race-data');
      const q = query(
        racesCollection,
        orderBy('uploadedAt', 'desc'),
        limit(50)
      );
      const unsubscribe = onSnapshot(q,
        snapshot => {
          if (snapshot.empty) { subscriber.next(null); return; }
          const match = snapshot.docs.find(d => {
            const data = d.data();
            const results: any[] = data['Result'] || [];
            return results.some(r => (r.DriverName as string)?.startsWith(site));
          });
          subscriber.next(match ? { id: match.id, ...match.data() } as RaceData : null);
        },
        error => subscriber.error(error)
      );
      return () => unsubscribe();
    });
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
