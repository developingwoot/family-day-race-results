import { Injectable, inject, signal } from '@angular/core';
import { 
  Firestore, 
  collection, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  doc,
  getDoc,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { RaceData } from '../models/race-data';

@Injectable({
  providedIn: 'root'
})
export class RaceService {
  private firestore = inject(Firestore);
  
  // Signal for all races
  private allRacesSignal = signal<RaceData[]>([]);
  
  // Signal for most recent race
  private mostRecentRaceSignal = signal<RaceData | null>(null);
  
  constructor() {
    // Initialize the races subscription
    this.initRacesSubscription();
    
    // Initialize the most recent race subscription
    this.initMostRecentRaceSubscription();
  }
  
  private initRacesSubscription(): void {
    const racesCollection = collection(this.firestore, 'race-data');
    const racesQuery = query(
      racesCollection,
      orderBy('uploadedAt', 'desc')
    );

    onSnapshot(racesQuery, 
      (snapshot) => {
        if (snapshot.empty) {
          this.allRacesSignal.set([]);
          return;
        }

        const races = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          } as RaceData;
        });

        this.allRacesSignal.set(races);
      },
      (error) => {
        console.error('Firestore stream error:', error);
        this.allRacesSignal.set([]);
      }
    );
  }
  
  private initMostRecentRaceSubscription(): void {
    const racesCollection = collection(this.firestore, 'race-data');
    const recentRaceQuery = query(
      racesCollection,
      orderBy('uploadedAt', 'desc'),
      limit(1)
    );

    onSnapshot(recentRaceQuery, 
      (snapshot) => {
        if (snapshot.empty) {
          this.mostRecentRaceSignal.set(null);
          return;
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        const raceData: RaceData = {
          id: doc.id,
          ...data
        } as RaceData;

        this.mostRecentRaceSignal.set(raceData);
      },
      (error) => {
        console.error('Firestore stream error:', error);
        this.mostRecentRaceSignal.set(null);
      }
    );
  }
  
  // Get all races as a signal
  getAllRaces() {
    return this.allRacesSignal;
  }
  
  // Get most recent race as a signal
  getMostRecentRace() {
    return this.mostRecentRaceSignal;
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
  
  // Get races by site
  getRacesBySite(site: string) {
    const racesCollection = collection(this.firestore, 'race-data');
    const siteRacesQuery = query(
      racesCollection,
      where('Site', '==', site),
      orderBy('uploadedAt', 'desc')
    );
    
    return new Observable<RaceData[]>(subscriber => {
      const unsubscribe = onSnapshot(siteRacesQuery, 
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
}
