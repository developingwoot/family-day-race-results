import { Injectable, inject, signal, computed } from '@angular/core';
import { 
  Firestore, 
  collection, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Tournament } from '../models/tournament';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private firestore = inject(Firestore);
  
  // Signal for active tournament
  private activeTournamentSignal = signal<Tournament | null>(null);
  
  // Signal for all tournaments
  private allTournamentsSignal = signal<Tournament[]>([]);
  
  // Computed signal for tournament status
  readonly isTournamentActive = computed(() => !!this.activeTournamentSignal());
  
  constructor() {
    // Initialize the active tournament subscription
    this.initActiveTournamentSubscription();
    
    // Initialize all tournaments subscription
    this.initAllTournamentsSubscription();
  }
  
  private initActiveTournamentSubscription(): void {
    const tournamentsCollection = collection(this.firestore, 'tournaments');
    // Include 'setup' status in the query to make newly created tournaments visible
    const activeQuery = query(
      tournamentsCollection,
      where('status', 'in', ['setup', 'qualifying', 'heats', 'final']),
      limit(1)
    );
    
    onSnapshot(activeQuery, 
      (snapshot) => {
        if (snapshot.empty) {
          this.activeTournamentSignal.set(null);
          return;
        }
        
        const doc = snapshot.docs[0];
        const data = doc.data();
        const tournament = this.convertToTournament(doc.id, data);
        
        this.activeTournamentSignal.set(tournament);
      },
      (error) => {
        console.error('Firestore stream error:', error);
        this.activeTournamentSignal.set(null);
      }
    );
  }
  
  private initAllTournamentsSubscription(): void {
    const tournamentsCollection = collection(this.firestore, 'tournaments');
    const allQuery = query(
      tournamentsCollection,
      orderBy('date', 'desc')
    );
    
    onSnapshot(allQuery, 
      (snapshot) => {
        if (snapshot.empty) {
          this.allTournamentsSignal.set([]);
          return;
        }
        
        const tournaments = snapshot.docs.map(doc => {
          const data = doc.data();
          return this.convertToTournament(doc.id, data);
        });
        
        this.allTournamentsSignal.set(tournaments);
      },
      (error) => {
        console.error('Firestore stream error:', error);
        this.allTournamentsSignal.set([]);
      }
    );
  }
  
  // Get active tournament as a signal
  getActiveTournament() {
    return this.activeTournamentSignal;
  }
  
  // Get active tournament value directly
  getActiveTournamentValue() {
    return this.activeTournamentSignal();
  }
  
  // Get all tournaments as a signal
  getAllTournaments() {
    return this.allTournamentsSignal;
  }
  
  // Helper method to convert Firestore data to proper Tournament object
  private convertToTournament(docId: string, data: any): Tournament {
    // Convert Firestore Timestamp objects to JavaScript Date objects
    const tournament: any = {
      id: docId,
      ...data
    };
    
    // Convert date fields from Timestamp to Date
    const dateFields = ['date', 'qualifyingStart', 'qualifyingEnd', 'heatsStart', 'finalStart'];
    
    dateFields.forEach(field => {
      if (tournament[field]) {
        if (tournament[field] instanceof Timestamp) {
          tournament[field] = tournament[field].toDate();
        } else if (typeof tournament[field] === 'string') {
          tournament[field] = new Date(tournament[field]);
        }
      } else {
        // Default to current date if field is missing
        tournament[field] = new Date();
      }
    });
    
    // Handle missing tournamentType field for existing tournaments
    if (!tournament.tournamentType) {
      // Infer tournament type based on dates
      try {
        const isSingleDay = 
          tournament.qualifyingStart.toDateString() === tournament.qualifyingEnd.toDateString() &&
          tournament.qualifyingStart.toDateString() === tournament.heatsStart.toDateString() &&
          tournament.qualifyingStart.toDateString() === tournament.finalStart.toDateString();
        
        tournament.tournamentType = isSingleDay ? 'singleDay' : 'multiDay';
        
        // Update the tournament in Firestore with the inferred type
        this.updateTournament(docId, { tournamentType: tournament.tournamentType }).subscribe();
      } catch (error) {
        console.error('Error inferring tournament type:', error);
        // Default to multiDay if there's an error
        tournament.tournamentType = 'multiDay';
      }
    }
    
    return tournament as Tournament;
  }
  
  // Get tournament by ID
  getTournamentById(id: string): Observable<Tournament | null> {
    return new Observable<Tournament | null>(subscriber => {
      const tournamentDocRef = doc(this.firestore, 'tournaments', id);
      
      getDoc(tournamentDocRef)
        .then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const tournament = this.convertToTournament(docSnap.id, data);
            
            subscriber.next(tournament);
          } else {
            subscriber.next(null);
          }
          subscriber.complete();
        })
        .catch(error => {
          console.error('Error getting tournament document:', error);
          subscriber.error(error);
        });
    });
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
  
  // Delete a tournament
  deleteTournament(tournamentId: string): Observable<void> {
    return new Observable<void>(subscriber => {
      const tournamentDocRef = doc(this.firestore, 'tournaments', tournamentId);
      
      deleteDoc(tournamentDocRef)
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch(error => {
          console.error('Error deleting tournament:', error);
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
