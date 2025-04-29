import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { DataService } from '../../services/data.service';
import { Tournament } from '../../models/tournament';

@Component({
  selector: 'app-tournament-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    RouterModule
  ],
  template: `
    <mat-card class="tournament-card">
      <mat-card-header>
        <mat-card-title>Tournament Status</mat-card-title>
      </mat-card-header>
      
      <mat-card-content>
        @if (activeTournament(); as tournament) {
          <div class="tournament-info">
            <h3>{{ tournament.name }}</h3>
            
            <div class="status-section">
              <div class="status-label">Status:</div>
              <div class="status-value">{{ getTournamentStatusText(tournament.status) }}</div>
            </div>
            
            @if (tournament.status === 'qualifying') {
              <div class="qualifying-info">
                <div class="time-remaining">
                  <div class="time-label">Qualifying ends in:</div>
                  <div class="time-value">{{ getTimeRemaining(tournament.qualifyingEnd) }}</div>
                </div>
                
                <mat-progress-bar 
                  mode="determinate" 
                  [value]="getQualifyingProgress(tournament)"
                ></mat-progress-bar>
              </div>
              
              <div class="site-qualifiers">
                <h4>Current Qualifiers</h4>
                
                @for (site of tournament.sitesIncluded; track site) {
                  <div class="site-section">
                    <div class="site-header">
                      <img [src]="getSiteIcon(site)" class="site-icon" alt="Site Icon">
                      <span>{{ site }}</span>
                    </div>
                    
                    @if (tournament.qualifyingResults[site].length; as qualifierCount) {
                      <div class="qualifiers-list">
                        @for (qualifier of tournament.qualifyingResults[site].slice(0, 3); track qualifier.playerId) {
                          <div class="qualifier">
                            <span class="qualifier-name">{{ qualifier.playerName }}</span>
                            <span class="qualifier-time">{{ formatTime(qualifier.time) }}</span>
                          </div>
                        }
                        
                        @if (qualifierCount > 3) {
                          <div class="more-qualifiers">
                            +{{ qualifierCount - 3 }} more
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="no-qualifiers">
                        No qualifiers yet
                      </div>
                    }
                  </div>
                }
              </div>
            } @else if (tournament.status === 'heats') {
              <div class="heats-info">
                <h4>Heat Races</h4>
                
                @for (heat of tournament.heats; track heat.heatId) {
                  <div class="heat-item" [class.completed]="heat.status === 'completed'">
                    <div class="heat-header">
                      <span class="heat-number">Heat {{ heat.heatNumber }}</span>
                      <span class="heat-time">{{ formatDate(heat.scheduledTime) }}</span>
                    </div>
                    
                    @if (heat.status === 'completed') {
                      <div class="heat-results">
                        <span class="results-label">Results available</span>
                      </div>
                    } @else {
                      <div class="heat-scheduled">
                        <span class="scheduled-label">Scheduled</span>
                      </div>
                    }
                  </div>
                }
                
                <div class="heat-item final" [class.completed]="tournament.finalHeat.status === 'completed'">
                  <div class="heat-header">
                    <span class="heat-number">Grand Final</span>
                    <span class="heat-time">{{ formatDate(tournament.finalHeat.scheduledTime) }}</span>
                  </div>
                  
                  @if (tournament.finalHeat.status === 'completed') {
                    <div class="heat-results">
                      <span class="results-label">Results available</span>
                    </div>
                  } @else {
                    <div class="heat-scheduled">
                      <span class="scheduled-label">Scheduled</span>
                    </div>
                  }
                </div>
              </div>
            } @else if (tournament.status === 'final') {
              <div class="final-info">
                <h4>Grand Final</h4>
                
                <div class="final-time">
                  <div class="time-label">Starting at:</div>
                  <div class="time-value">{{ formatDate(tournament.finalHeat.scheduledTime) }}</div>
                </div>
                
                <div class="finalists">
                  <h5>Finalists</h5>
                  
                  @for (participant of tournament.finalHeat.participants; track participant.playerId) {
                    <div class="finalist">
                      <div class="site-badge">
                        <img [src]="getSiteIcon(participant.site)" class="site-icon" alt="Site Icon">
                      </div>
                      <span class="finalist-name">{{ participant.playerName }}</span>
                      <span class="finalist-points">{{ participant.totalPoints }} pts</span>
                    </div>
                  }
                </div>
              </div>
            } @else if (tournament.status === 'completed') {
              <div class="completed-info">
                <h4>Tournament Completed</h4>
                
                <div class="winners">
                  <div class="winner first">
                    <div class="trophy gold">🏆</div>
                    <div class="winner-name">{{ tournament.winners.first.playerName }}</div>
                    <div class="winner-site">{{ tournament.winners.first.site }}</div>
                  </div>
                  
                  <div class="winner second">
                    <div class="trophy silver">🥈</div>
                    <div class="winner-name">{{ tournament.winners.second.playerName }}</div>
                    <div class="winner-site">{{ tournament.winners.second.site }}</div>
                  </div>
                  
                  <div class="winner third">
                    <div class="trophy bronze">🥉</div>
                    <div class="winner-name">{{ tournament.winners.third.playerName }}</div>
                    <div class="winner-site">{{ tournament.winners.third.site }}</div>
                  </div>
                </div>
              </div>
            }
            
            <div class="view-details">
              <a mat-button color="primary" routerLink="/tournament">
                View Full Tournament Details
              </a>
            </div>
          </div>
        } @else {
          <div class="no-tournament">
            <p>No active tournament at this time.</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .tournament-card {
      margin-bottom: 20px;
      background-color: #424242;
      border-left: 4px solid #ff9800;
    }
    
    .tournament-info {
      padding: 10px 0;
    }
    
    .status-section {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .status-label {
      font-weight: 500;
      margin-right: 10px;
    }
    
    .status-value {
      background-color: #ff9800;
      color: white;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.9em;
    }
    
    .qualifying-info {
      margin-bottom: 20px;
    }
    
    .time-remaining {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .time-label {
      font-weight: 500;
      margin-right: 10px;
    }
    
    .time-value {
      font-family: monospace;
      font-size: 1.1em;
    }
    
    .site-qualifiers {
      margin-top: 20px;
    }
    
    .site-section {
      margin-bottom: 15px;
      padding: 10px;
      background-color: #424242;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    
    .site-header {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      font-weight: 500;
    }
    
    .site-icon {
      width: 24px;
      height: 24px;
      margin-right: 8px;
      border-radius: 50%;
    }
    
    .qualifiers-list {
      padding-left: 10px;
    }
    
    .qualifier {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .qualifier-time {
      font-family: monospace;
    }
    
    .more-qualifiers {
      text-align: center;
      font-style: italic;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.9em;
      margin-top: 5px;
    }
    
    .no-qualifiers {
      font-style: italic;
      color: rgba(255, 255, 255, 0.7);
      padding: 5px 0;
    }
    
    .heats-info {
      margin-top: 20px;
    }
    
    .heat-item {
      margin-bottom: 10px;
      padding: 10px;
      background-color: #424242;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      border-left: 3px solid #ff9800;
    }
    
    .heat-item.completed {
      border-left-color: #4caf50;
    }
    
    .heat-item.final {
      border-left-color: #3f51b5;
      background-color: #424242;
    }
    
    .heat-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .heat-number {
      font-weight: 500;
    }
    
    .heat-results, .heat-scheduled {
      font-size: 0.9em;
      padding: 2px 0;
    }
    
    .results-label {
      color: #4caf50;
    }
    
    .scheduled-label {
      color: #ff9800;
    }
    
    .final-info {
      margin-top: 20px;
    }
    
    .final-time {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .finalists {
      margin-top: 15px;
    }
    
    .finalist {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding: 5px;
      background-color: #424242;
      border-radius: 4px;
    }
    
    .finalist-name {
      flex: 1;
      margin-left: 10px;
    }
    
    .finalist-points {
      font-weight: 500;
    }
    
    .completed-info {
      margin-top: 20px;
    }
    
    .winners {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
      text-align: center;
    }
    
    .winner {
      flex: 1;
      padding: 10px;
    }
    
    .trophy {
      font-size: 2em;
      margin-bottom: 10px;
    }
    
    .winner-name {
      font-weight: 500;
    }
    
    .winner-site {
      font-size: 0.9em;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .view-details {
      margin-top: 20px;
      text-align: center;
    }
    
    .no-tournament {
      padding: 20px;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
    }
  `]
})
export class TournamentStatusComponent {
  private dataService = inject(DataService);
  
  activeTournament = signal<Tournament | null>(null);
  private subscription: any;
  
  ngOnInit(): void {
    // Subscribe to active tournament
    this.subscription = this.dataService.getActiveTournament().subscribe({
      next: (tournament) => {
        this.activeTournament.set(tournament);
      },
      error: (error) => {
        console.error('Error getting active tournament:', error);
      }
    });
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
  getTournamentStatusText(status: string): string {
    switch (status) {
      case 'qualifying': return 'Qualifying Round';
      case 'heats': return 'Heat Races';
      case 'final': return 'Grand Final';
      case 'completed': return 'Completed';
      default: return 'Setup';
    }
  }
  
  getTimeRemaining(endDate: Date): string {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) {
      return '00:00:00';
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  getQualifyingProgress(tournament: Tournament): number {
    const now = new Date();
    const start = new Date(tournament.qualifyingStart);
    const end = new Date(tournament.qualifyingEnd);
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    if (elapsed <= 0) return 0;
    if (elapsed >= total) return 100;
    
    return (elapsed / total) * 100;
  }
  
  formatTime(timeInMs: number): string {
    if (!timeInMs) return '-';
    
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    const milliseconds = Math.floor(timeInMs % 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
