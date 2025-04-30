import { Injectable, inject, signal } from '@angular/core';
import { 
  Firestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

// Interfaces for claimed races
export interface ClaimedRace {
  id: string;
  raceId: string;
  driverGuid: string;
  playerName: string;
  playerEmail: string | null;
  site: string;
  claimedAt: any; // Firestore timestamp
  qualifying: boolean;
  tournamentId: string | null;
}

export interface ClaimRaceData {
  raceId: string;
  driverGuid: string;
  playerName: string;
  playerEmail?: string;
  site: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClaimService {
  private firestore: Firestore = inject(Firestore);
  
  // Cache of claimed races
  private claimedRacesCache = new Map<string, Set<string>>();
  
  // Generate QR code URL for claiming a race
  generateQRCodeUrl(raceId: string, driverGuid: string, site: string): string {
    // Create a claim token that encodes race ID, driver GUID, and site
    const claimToken = btoa(JSON.stringify({
      raceId,
      driverGuid,
      site,
      timestamp: Date.now()
    }));
    
    // Generate URL to the claim page with the token
    // This would be your deployed web app URL
    return `${window.location.origin}/claim?token=${claimToken}`;
  }
  
  // Check if a result is claimed
  isResultClaimed(raceId: string, driverGuid: string): boolean {
    if (!this.claimedRacesCache.has(raceId)) return false;
    return this.claimedRacesCache.get(raceId)!.has(driverGuid);
  }
  
  // Get player name for a claimed race
  getClaimPlayerName(raceId: string, driverGuid: string): Observable<string | null> {
    const claimedRacesCollection = collection(this.firestore, 'claimed-races');
    const claimQuery = query(
      claimedRacesCollection,
      where('raceId', '==', raceId),
      where('driverGuid', '==', driverGuid)
    );
    
    return new Observable<string | null>(subscriber => {
      const unsubscribe = onSnapshot(claimQuery, 
        (snapshot) => {
          if (snapshot.empty) {
            subscriber.next(null);
            return;
          }
          
          // Get the first matching claim (should only be one)
          const claim = snapshot.docs[0].data() as ClaimedRace;
          subscriber.next(claim.playerName);
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
  
  // Get claimed races for a specific race
  getClaimedRaces(raceId: string): Observable<ClaimedRace[]> {
    const claimedRacesCollection = collection(this.firestore, 'claimed-races');
    const claimedRacesQuery = query(
      claimedRacesCollection,
      where('raceId', '==', raceId)
    );
    
    return new Observable<ClaimedRace[]>(subscriber => {
      const unsubscribe = onSnapshot(claimedRacesQuery, 
        (snapshot) => {
          if (snapshot.empty) {
            // No claimed races for this race
            this.claimedRacesCache.set(raceId, new Set<string>());
            subscriber.next([]);
            return;
          }
          
          const claimedRaces = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data
            } as ClaimedRace;
          });
          
          // Update cache
          const driverGuids = new Set<string>();
          claimedRaces.forEach(claim => driverGuids.add(claim.driverGuid));
          this.claimedRacesCache.set(raceId, driverGuids);
          
          subscriber.next(claimedRaces);
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
  
  // Claim a race result
  claimRace(claimData: ClaimRaceData): Observable<string> {
    return new Observable<string>(subscriber => {
      // Create a new document in the claimed-races collection
      const claimedRacesCollection = collection(this.firestore, 'claimed-races');
      const newClaimRef = doc(claimedRacesCollection);
      
      const claimDoc = {
        id: newClaimRef.id,
        raceId: claimData.raceId,
        driverGuid: claimData.driverGuid,
        playerName: claimData.playerName,
        playerEmail: claimData.playerEmail || null,
        site: claimData.site,
        claimedAt: serverTimestamp(),
        qualifying: true, // Default to qualifying
        tournamentId: null // Will be set if part of a tournament
      };
      
      setDoc(newClaimRef, claimDoc)
        .then(() => {
          // Update cache
          if (!this.claimedRacesCache.has(claimData.raceId)) {
            this.claimedRacesCache.set(claimData.raceId, new Set<string>());
          }
          this.claimedRacesCache.get(claimData.raceId)!.add(claimData.driverGuid);
          
          subscriber.next(newClaimRef.id);
          subscriber.complete();
        })
        .catch(error => {
          console.error('Error claiming race:', error);
          subscriber.error(error);
        });
    });
  }
}
