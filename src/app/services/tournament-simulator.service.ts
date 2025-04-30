import { Injectable, inject } from '@angular/core';
import { TournamentService } from './tournament.service';
import { Tournament } from '../models/tournament';
import { Observable, of, switchMap, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TournamentSimulatorService {
  private tournamentService = inject(TournamentService);
  
  // Store the current simulated tournament ID
  private simulatedTournamentId: string | null = null;
  
  // Create a new simulated tournament
  createSimulatedTournament(name: string = 'Simulated Tournament'): Observable<string> {
    const today = new Date();
    
    // Set up dates for the tournament
    const qualifyingStart = new Date(today);
    const qualifyingEnd = new Date(today);
    qualifyingEnd.setHours(qualifyingEnd.getHours() + 1); // 1 hour qualifying period
    
    const heatsStart = new Date(qualifyingEnd);
    heatsStart.setMinutes(heatsStart.getMinutes() + 10); // 10 minutes after qualifying
    
    const finalStart = new Date(heatsStart);
    finalStart.setMinutes(finalStart.getMinutes() + 30); // 30 minutes after heats
    
    // Create tournament data
    const tournamentData: Partial<Tournament> = {
      name: name,
      date: today,
      tournamentType: 'singleDay',
      qualifyingStart,
      qualifyingEnd,
      heatsStart,
      finalStart,
      sitesIncluded: ['Fishkill', 'Patterson', 'San Juan', 'Wallkill', 'Warwick'],
      qualifiersPerSite: 2 // Top 2 from each site qualify
    };
    
    // Create the tournament
    return this.tournamentService.createTournament(tournamentData)
      .pipe(
        tap(id => {
          console.log('Created simulated tournament with ID:', id);
          this.simulatedTournamentId = id;
        })
      );
  }
  
  // Get the current simulated tournament
  getSimulatedTournament(): Observable<Tournament | null> {
    if (!this.simulatedTournamentId) {
      return of(null);
    }
    
    return this.tournamentService.getTournamentById(this.simulatedTournamentId);
  }
  
  // Start the qualifying stage
  startQualifying(): Observable<void> {
    if (!this.simulatedTournamentId) {
      return of(void 0);
    }
    
    return this.tournamentService.startTournament(this.simulatedTournamentId);
  }
  
  // Populate qualifying results with mock data
  populateQualifyingResults(): Observable<void> {
    if (!this.simulatedTournamentId) {
      return of(void 0);
    }
    
    return this.getSimulatedTournament().pipe(
      switchMap(tournament => {
        if (!tournament) {
          return of(void 0);
        }
        
        const qualifyingResults: { [siteId: string]: any[] } = {};
        
        // Generate mock qualifying results for each site
        tournament.sitesIncluded.forEach(site => {
          qualifyingResults[site] = this.generateMockQualifiers(site, 5); // 5 qualifiers per site
        });
        
        // Update the tournament with qualifying results
        return this.tournamentService.updateTournament(
          this.simulatedTournamentId!,
          { qualifyingResults }
        );
      })
    );
  }
  
  // Advance to heat races
  advanceToHeats(): Observable<void> {
    if (!this.simulatedTournamentId) {
      return of(void 0);
    }
    
    return this.getSimulatedTournament().pipe(
      switchMap(tournament => {
        if (!tournament) {
          return of(void 0);
        }
        
        // Generate heats based on qualifying results
        const heats = this.generateMockHeats(tournament);
        
        // Update tournament with heats and advance to heats stage
        return this.tournamentService.updateTournament(
          this.simulatedTournamentId!,
          { heats }
        ).pipe(
          switchMap(() => this.tournamentService.advanceTournament(
            this.simulatedTournamentId!,
            'heats'
          ))
        );
      })
    );
  }
  
  // Complete heat races with results
  completeHeatRaces(): Observable<void> {
    if (!this.simulatedTournamentId) {
      return of(void 0);
    }
    
    return this.getSimulatedTournament().pipe(
      switchMap(tournament => {
        if (!tournament || !tournament.heats) {
          return of(void 0);
        }
        
        // Add results to each heat
        const updatedHeats = tournament.heats.map(heat => {
          // Sort participants randomly to simulate race results
          const participants = [...heat.participants]
            .sort(() => Math.random() - 0.5)
            .map((participant, index) => {
              // Assign position and points based on position
              const position = index + 1;
              const points = this.calculatePoints(position);
              
              return {
                ...participant,
                position,
                points
              };
            });
          
          return {
            ...heat,
            status: 'completed' as 'completed',
            participants
          };
        });
        
        // Update tournament with completed heats
        return this.tournamentService.updateTournament(
          this.simulatedTournamentId!,
          { heats: updatedHeats }
        );
      })
    );
  }
  
  // Advance to final race
  advanceToFinal(): Observable<void> {
    if (!this.simulatedTournamentId) {
      return of(void 0);
    }
    
    return this.getSimulatedTournament().pipe(
      switchMap(tournament => {
        if (!tournament || !tournament.heats) {
          return of(void 0);
        }
        
        // Calculate total points for each participant across all heats
        const pointsMap = new Map<string, { 
          playerId: string; 
          playerName: string; 
          site: string; 
          totalPoints: number;
        }>();
        
        // Collect points from all heats
        tournament.heats.forEach(heat => {
          heat.participants.forEach(participant => {
            if (!participant.points) return;
            
            const key = participant.playerId;
            const existingData = pointsMap.get(key);
            
            if (existingData) {
              existingData.totalPoints += participant.points;
            } else {
              pointsMap.set(key, {
                playerId: participant.playerId,
                playerName: participant.playerName,
                site: participant.site,
                totalPoints: participant.points
              });
            }
          });
        });
        
        // Convert to array and sort by points (highest first)
        const finalParticipants = Array.from(pointsMap.values())
          .sort((a, b) => b.totalPoints - a.totalPoints);
        
        // Create final heat data
        const finalHeat = {
          status: 'scheduled' as 'scheduled',
          scheduledTime: tournament.finalStart,
          participants: finalParticipants
        };
        
        // Update tournament with final heat and advance to final stage
        return this.tournamentService.updateTournament(
          this.simulatedTournamentId!,
          { finalHeat }
        ).pipe(
          switchMap(() => this.tournamentService.advanceTournament(
            this.simulatedTournamentId!,
            'final'
          ))
        );
      })
    );
  }
  
  // Complete the tournament with final results
  completeTournament(): Observable<void> {
    if (!this.simulatedTournamentId) {
      return of(void 0);
    }
    
    return this.getSimulatedTournament().pipe(
      switchMap(tournament => {
        if (!tournament || !tournament.finalHeat) {
          return of(void 0);
        }
        
        // Sort participants randomly to simulate final race results
        const participants = [...tournament.finalHeat.participants]
          .sort(() => Math.random() - 0.5)
          .map((participant, index) => {
            return {
              ...participant,
              position: index + 1
            };
          });
        
        // Get top 3 finishers for winners podium
        const winners = {
          first: {
            playerId: participants[0].playerId,
            playerName: participants[0].playerName,
            site: participants[0].site
          },
          second: {
            playerId: participants[1].playerId,
            playerName: participants[1].playerName,
            site: participants[1].site
          },
          third: {
            playerId: participants[2].playerId,
            playerName: participants[2].playerName,
            site: participants[2].site
          }
        };
        
        // Update tournament with final results and advance to completed stage
        return this.tournamentService.updateTournament(
          this.simulatedTournamentId!,
          { 
            finalHeat: {
              ...tournament.finalHeat,
              status: 'completed' as 'completed',
              participants
            },
            winners
          }
        ).pipe(
          switchMap(() => this.tournamentService.advanceTournament(
            this.simulatedTournamentId!,
            'completed'
          ))
        );
      })
    );
  }
  
  // Helper method to generate mock qualifiers for a site
  private generateMockQualifiers(site: string, count: number): any[] {
    const qualifiers = [];
    
    for (let i = 1; i <= count; i++) {
      qualifiers.push({
        playerId: `${site.toLowerCase()}-player-${i}`,
        playerName: `${site} Player ${i}`,
        time: 60000 + Math.floor(Math.random() * 30000), // Random time between 1:00 and 1:30
        raceId: `mock-race-${site.toLowerCase()}`
      });
    }
    
    // Sort by time (fastest first)
    return qualifiers.sort((a, b) => a.time - b.time);
  }
  
  // Helper method to generate mock heats
  private generateMockHeats(tournament: Tournament): any[] {
    const heats = [];
    const qualifiedDrivers = [];
    
    // Collect qualified drivers from each site
    for (const site of tournament.sitesIncluded) {
      const siteQualifiers = tournament.qualifyingResults[site] || [];
      const qualifiers = siteQualifiers
        .slice(0, tournament.qualifiersPerSite)
        .map(qualifier => ({
          playerId: qualifier.playerId,
          playerName: qualifier.playerName,
          site: site
        }));
      
      qualifiedDrivers.push(...qualifiers);
    }
    
    // Shuffle qualified drivers to randomize heat assignments
    const shuffledDrivers = [...qualifiedDrivers].sort(() => Math.random() - 0.5);
    
    // Create 2 heats with equal distribution of drivers
    const heatSize = Math.ceil(shuffledDrivers.length / 2);
    
    for (let i = 0; i < 2; i++) {
      const startIdx = i * heatSize;
      const endIdx = Math.min(startIdx + heatSize, shuffledDrivers.length);
      const heatParticipants = shuffledDrivers.slice(startIdx, endIdx);
      
      heats.push({
        heatId: `heat-${i + 1}`,
        heatNumber: i + 1,
        status: 'scheduled',
        scheduledTime: tournament.heatsStart,
        participants: heatParticipants
      });
    }
    
    return heats;
  }
  
  // Helper method to calculate points based on position
  private calculatePoints(position: number): number {
    // Simple points system: 10 for 1st, 8 for 2nd, 6 for 3rd, etc.
    const pointsMap: { [key: number]: number } = {
      1: 10,
      2: 8,
      3: 6,
      4: 5,
      5: 4,
      6: 3,
      7: 2,
      8: 1
    };
    
    return pointsMap[position] || 0;
  }
}
