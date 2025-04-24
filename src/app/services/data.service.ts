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
import { Observable } from 'rxjs';
import { RaceData } from '../models/race-data';

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
}
