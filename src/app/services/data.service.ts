import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  DocumentData 
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { RaceData } from '../models/race-data';
import { SiteStats } from '../models/site-stats';

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
      
      // Sort results by total time (ascending)
      // Filter out invalid times: 999999999 (no valid lap) and 0 (didn't participate)
      const sortedResults = [...race.Result]
        .filter(result => result.TotalTime !== 999999999 && result.TotalTime !== 0)
        .sort((a, b) => a.TotalTime - b.TotalTime);
      
      // Count placements
      sortedResults.forEach((result, index) => {
        // Extract driver prefix (e.g., "Fishkill" from "Fishkill Driver 1")
        const driverPrefix = this.extractDriverPrefix(result.DriverName);
        
        if (driverPrefix && siteStats[driverPrefix]) {
          // Increment total races
          siteStats[driverPrefix].totalRaces++;
          
          // Increment placement count based on position
          switch (index) {
            case 0: siteStats[driverPrefix].firstPlaceCount++; break;
            case 1: siteStats[driverPrefix].secondPlaceCount++; break;
            case 2: siteStats[driverPrefix].thirdPlaceCount++; break;
            case 3: siteStats[driverPrefix].fourthPlaceCount++; break;
            case 4: siteStats[driverPrefix].fifthPlaceCount++; break;
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
      fourthPlaceCount: 0,
      fifthPlaceCount: 0,
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
}
