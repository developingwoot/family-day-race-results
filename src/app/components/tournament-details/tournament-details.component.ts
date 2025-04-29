import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { TournamentService } from '../../services/tournament.service';
import { Tournament } from '../../models/tournament';

@Component({
  selector: 'app-tournament-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  template: `
    <div class="tournament-details-container">
      <!-- Header actions removed -->
      
      @if (tournament(); as tournament) {
        <h1 class="tournament-title">{{ tournament.name }}</h1>
        
        <div class="tournament-status">
          <span class="status-badge">{{ getTournamentStatusText(tournament.status) }}</span>
          <span class="type-badge">{{ getTournamentTypeText(tournament.tournamentType) }}</span>
        </div>
        
        <mat-card class="tournament-info-card">
          <mat-card-content>
            <div class="tournament-dates">
              <div class="date-item">
                <div class="date-label">Qualifying Period:</div>
                <div class="date-value">
                  {{ formatDateRange(tournament.qualifyingStart, tournament.qualifyingEnd) }}
                </div>
              </div>
              
              @if (tournament.status !== 'qualifying') {
                <div class="date-item">
                  <div class="date-label">Heat Races:</div>
                  <div class="date-value">{{ formatDate(tournament.heatsStart) }}</div>
                </div>
                
                <div class="date-item">
                  <div class="date-label">Grand Final:</div>
                  <div class="date-value">{{ formatDate(tournament.finalStart) }}</div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
        
        <mat-tab-group>
          <!-- Qualifying Tab -->
          <mat-tab label="Qualifying">
            <div class="tab-content">
              @if (tournament.status === 'qualifying') {
                <div class="qualifying-progress">
                  <h3>Qualifying in Progress</h3>
                  <p>Top {{ tournament.qualifiersPerSite }} racers from each site will advance to the heat races.</p>
                  
                  <div class="time-remaining">
                    <div class="time-label">Time Remaining:</div>
                    <div class="time-value">{{ getTimeRemaining(tournament.qualifyingEnd) }}</div>
                  </div>
                </div>
              }
              
              <div class="site-qualifiers-grid">
                @for (site of tournament.sitesIncluded; track site) {
                  <mat-card class="site-card">
                    <mat-card-header>
                      <div class="site-header">
                        <img [src]="getSiteIcon(site)" class="site-icon" alt="Site Icon">
                        <span>{{ site }}</span>
                      </div>
                    </mat-card-header>
                    
                    <mat-card-content>
                      @if (tournament.qualifyingResults[site].length; as qualifierCount) {
                        <table class="qualifiers-table">
                          <thead>
                            <tr>
                              <th>Pos</th>
                              <th>Name</th>
                              <th>Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (qualifier of tournament.qualifyingResults[site]; track qualifier.playerId; let i = $index) {
                              <tr [class.qualified]="i < tournament.qualifiersPerSite">
                                <td>{{ i + 1 }}</td>
                                <td>{{ qualifier.playerName }}</td>
                                <td>{{ formatTime(qualifier.time) }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      } @else {
                        <div class="no-qualifiers">
                          No qualifiers yet
                        </div>
                      }
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </div>
          </mat-tab>
          
          <!-- Heats Tab -->
          <mat-tab label="Heat Races" [disabled]="tournament.status === 'qualifying'">
            <div class="tab-content">
              <div class="heats-grid">
                @for (heat of tournament.heats; track heat.heatId) {
                  <mat-card class="heat-card" [class.completed]="heat.status === 'completed'">
                    <mat-card-header>
                      <mat-card-title>Heat {{ heat.heatNumber }}</mat-card-title>
                      <mat-card-subtitle>{{ formatDate(heat.scheduledTime) }}</mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      <table class="heat-participants-table">
                        <thead>
                          <tr>
                            <th>Driver</th>
                            <th>Site</th>
                            @if (heat.status === 'completed') {
                              <th>Position</th>
                              <th>Points</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (participant of heat.participants; track participant.playerId) {
                            <tr>
                              <td>{{ participant.playerName }}</td>
                              <td>
                                <div class="site-badge">
                                  <img [src]="getSiteIcon(participant.site)" class="site-icon-small" alt="Site Icon">
                                  <span>{{ participant.site }}</span>
                                </div>
                              </td>
                              @if (heat.status === 'completed') {
                                <td>{{ participant.position }}</td>
                                <td>{{ participant.points }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </div>
          </mat-tab>
          
          <!-- Final Tab -->
          <mat-tab label="Grand Final" [disabled]="tournament.status === 'qualifying' || tournament.status === 'heats'">
            <div class="tab-content">
              <mat-card class="final-card">
                <mat-card-header>
                  <mat-card-title>Grand Final</mat-card-title>
                  <mat-card-subtitle>{{ formatDate(tournament.finalHeat.scheduledTime) }}</mat-card-subtitle>
                </mat-card-header>
                
                <mat-card-content>
                  @if (tournament.status === 'completed') {
                    <div class="winners-podium">
                      <div class="podium-place second">
                        <div class="trophy silver">🥈</div>
                        <div class="place-number">2</div>
                        <div class="winner-name">{{ tournament.winners.second.playerName }}</div>
                        <div class="site-badge">
                          <img [src]="getSiteIcon(tournament.winners.second.site)" class="site-icon-small" alt="Site Icon">
                          <span>{{ tournament.winners.second.site }}</span>
                        </div>
                      </div>
                      
                      <div class="podium-place first">
                        <div class="trophy gold">🏆</div>
                        <div class="place-number">1</div>
                        <div class="winner-name">{{ tournament.winners.first.playerName }}</div>
                        <div class="site-badge">
                          <img [src]="getSiteIcon(tournament.winners.first.site)" class="site-icon-small" alt="Site Icon">
                          <span>{{ tournament.winners.first.site }}</span>
                        </div>
                      </div>
                      
                      <div class="podium-place third">
                        <div class="trophy bronze">🥉</div>
                        <div class="place-number">3</div>
                        <div class="winner-name">{{ tournament.winners.third.playerName }}</div>
                        <div class="site-badge">
                          <img [src]="getSiteIcon(tournament.winners.third.site)" class="site-icon-small" alt="Site Icon">
                          <span>{{ tournament.winners.third.site }}</span>
                        </div>
                      </div>
                    </div>
                  }
                  
                  <table class="final-participants-table">
                    <thead>
                      <tr>
                        <th>Driver</th>
                        <th>Site</th>
                        <th>Points</th>
                        @if (tournament.status === 'completed') {
                          <th>Final Position</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (participant of tournament.finalHeat.participants; track participant.playerId) {
                        <tr>
                          <td>{{ participant.playerName }}</td>
                          <td>
                            <div class="site-badge">
                              <img [src]="getSiteIcon(participant.site)" class="site-icon-small" alt="Site Icon">
                              <span>{{ participant.site }}</span>
                            </div>
                          </td>
                          <td>{{ participant.totalPoints }}</td>
                          @if (tournament.status === 'completed') {
                            <td>{{ participant.position }}</td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>
      } @else {
        <div class="loading-tournament">
          <p>Loading tournament details...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .tournament-details-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header-actions {
      margin-bottom: 20px;
    }
    
    .tournament-title {
      margin-bottom: 10px;
    }
    
    .tournament-status {
      margin-bottom: 20px;
    }
    
    .tournament-status {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .status-badge {
      background-color: #ff9800;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 1em;
    }
    
    .type-badge {
      background-color: #3f51b5;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 1em;
    }
    
    .tournament-info-card {
      margin-bottom: 20px;
    }
    
    .tournament-dates {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .date-item {
      flex: 1;
      min-width: 200px;
    }
    
    .date-label {
      font-weight: 500;
      margin-bottom: 5px;
    }
    
    .date-value {
      font-family: monospace;
    }
    
    .tab-content {
      padding: 20px 0;
    }
    
    .qualifying-progress {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #424242;
      border-radius: 4px;
    }
    
    .time-remaining {
      display: flex;
      align-items: center;
      margin-top: 10px;
    }
    
    .time-label {
      font-weight: 500;
      margin-right: 10px;
    }
    
    .time-value {
      font-family: monospace;
      font-size: 1.2em;
    }
    
    .site-qualifiers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .site-card {
      margin-bottom: 10px;
    }
    
    .site-header {
      display: flex;
      align-items: center;
      font-weight: 500;
    }
    
    .site-icon {
      width: 24px;
      height: 24px;
      margin-right: 8px;
      border-radius: 50%;
    }
    
    .site-icon-small {
      width: 16px;
      height: 16px;
      margin-right: 4px;
      border-radius: 50%;
    }
    
    .qualifiers-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .qualifiers-table th, .qualifiers-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    .qualifiers-table th {
      font-weight: 500;
    }
    
    .qualified {
      background-color: #e8f5e9;
    }
    
    .no-qualifiers {
      padding: 20px;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
      font-style: italic;
    }
    
    .heats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }
    
    .heat-card {
      margin-bottom: 10px;
      border-left: 3px solid #ff9800;
    }
    
    .heat-card.completed {
      border-left-color: #4caf50;
    }
    
    .heat-participants-table, .final-participants-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .heat-participants-table th, .heat-participants-table td,
    .final-participants-table th, .final-participants-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    .heat-participants-table th, .final-participants-table th {
      font-weight: 500;
    }
    
    .site-badge {
      display: flex;
      align-items: center;
    }
    
    .final-card {
      margin-bottom: 20px;
      border-left: 3px solid #3f51b5;
    }
    
    .winners-podium {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      margin: 30px 0;
      height: 200px;
    }
    
    .podium-place {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 120px;
      margin: 0 10px;
      text-align: center;
    }
    
    .podium-place.first {
      height: 180px;
      z-index: 3;
    }
    
    .podium-place.second {
      height: 140px;
      z-index: 2;
    }
    
    .podium-place.third {
      height: 100px;
      z-index: 1;
    }
    
    .trophy {
      font-size: 2em;
      margin-bottom: 10px;
    }
    
    .place-number {
      font-size: 1.5em;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .winner-name {
      font-weight: 500;
      margin-bottom: 5px;
    }
    
    .loading-tournament {
      padding: 40px;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
    }
  `]
})
export class TournamentDetailsComponent implements OnInit {
  private tournamentService = inject(TournamentService);
  
  // Use the tournament signal
  tournament = this.tournamentService.getActiveTournament();
  
  ngOnInit(): void {
    // No need to subscribe manually, the signal is already initialized in the service
  }
  
  getTournamentStatusText(status: string): string {
    switch (status) {
      case 'qualifying': return 'Qualifying Round';
      case 'heats': return 'Heat Races';
      case 'final': return 'Grand Final';
      case 'completed': return 'Tournament Completed';
      default: return 'Setup';
    }
  }
  
  getTournamentTypeText(type: string | undefined): string {
    if (!type) {
      // For backward compatibility with existing tournaments
      return 'Multi-Day Tournament';
    }
    
    switch (type) {
      case 'singleDay': return 'Single-Day Tournament';
      case 'multiDay': return 'Multi-Day Tournament';
      default: return 'Tournament';
    }
  }
  
  getTimeRemaining(endDate: Date | string | null | undefined): string {
    if (!endDate) return '00:00:00';
    
    try {
      const now = new Date();
      const end = new Date(endDate);
      
      if (isNaN(end.getTime())) return '00:00:00';
      
      const diff = end.getTime() - now.getTime();
      
      if (diff <= 0) {
        return '00:00:00';
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating time remaining:', error);
      return '00:00:00';
    }
  }
  
  formatTime(timeInMs: number): string {
    if (!timeInMs) return '-';
    
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    const milliseconds = Math.floor(timeInMs % 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'Not scheduled';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      // Get the current tournament
      const tournament = this.tournament();
      
      // Check if it's a single-day tournament
      if (tournament?.tournamentType === 'singleDay') {
        // For single-day tournaments, only show the time
        return dateObj.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit'
        });
      } else {
        // For multi-day tournaments, show the full date and time
        return dateObj.toLocaleString([], { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit'
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }
  
  formatDateRange(startDate: Date | string | null | undefined, endDate: Date | string | null | undefined): string {
    if (!startDate || !endDate) return 'Not scheduled';
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid date range';
      
      // Get the current tournament
      const tournament = this.tournament();
      
      // Check if it's a single-day tournament
      if (tournament?.tournamentType === 'singleDay') {
        // For single-day tournaments, show the date once and then the time range
        const date = start.toLocaleDateString([], { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric'
        });
        
        const startTime = start.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit'
        });
        
        const endTime = end.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit'
        });
        
        return `${date}: ${startTime} - ${endTime}`;
      } else {
        // For multi-day tournaments, show the date range
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      }
    } catch (error) {
      console.error('Error formatting date range:', error);
      return 'Invalid date range';
    }
  }
  
  getSiteIcon(siteName: string): string {
    const iconFileNames: Record<string, string> = {
      'Fishkill': 'Fishkill_Icon.png',
      'Patterson': 'Patterson_Icon.png',
      'San Juan': 'San_Juan_Icon.png',
      'Wallkill': 'Wallkill_Icon.png',
      'Warwick': 'Warwick_Icon.png'
    };
    
    return `assets/${iconFileNames[siteName] || 'helmet.jpg'}`;
  }
}
