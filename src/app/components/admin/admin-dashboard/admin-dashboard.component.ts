import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { TournamentService } from '../../../services/tournament.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  template: `
    <div class="admin-dashboard-container">
      <h1>Admin Dashboard</h1>
      
      <div class="admin-section">
        <h2>Tournament Management</h2>
        
        <div class="admin-cards">
          <mat-card class="admin-card">
            <mat-card-header>
              <mat-card-title>Create New Tournament</mat-card-title>
            </mat-card-header>
            
            <mat-card-content>
              <p>Set up a new tournament with qualifying periods, heat races, and finals.</p>
            </mat-card-content>
            
            <mat-card-actions>
              <a mat-raised-button color="primary" routerLink="/admin/tournament/new">
                <mat-icon>add</mat-icon> Create Tournament
              </a>
            </mat-card-actions>
          </mat-card>
          
          <mat-card class="admin-card">
            <mat-card-header>
              <mat-card-title>Tournament Simulator</mat-card-title>
            </mat-card-header>
            
            <mat-card-content>
              <p>Simulate a tournament with mock data to test the tournament functionality.</p>
            </mat-card-content>
            
            <mat-card-actions>
              <a mat-raised-button color="primary" routerLink="/admin/tournament/simulator">
                <mat-icon>science</mat-icon> Simulator
              </a>
            </mat-card-actions>
          </mat-card>
          
          @if (activeTournament(); as tournament) {
            <mat-card class="admin-card">
              <mat-card-header>
                <mat-card-title>Manage Active Tournament</mat-card-title>
                <mat-card-subtitle>{{ tournament?.name }}</mat-card-subtitle>
              </mat-card-header>
              
              <mat-card-content>
                <p>Current status: <strong>{{ getTournamentStatusText(tournament?.status || 'unknown') }}</strong></p>
                
                @if (tournament?.status === 'setup') {
                  <p>Tournament is in setup mode. Start qualifying when ready.</p>
                } @else if (tournament?.status === 'qualifying') {
                  <p>Qualifying ends: {{ formatDate(tournament.qualifyingEnd) }}</p>
                } @else if (tournament?.status === 'heats') {
                  <p>Heat races scheduled for: {{ formatDate(tournament.heatsStart) }}</p>
                } @else if (tournament?.status === 'final') {
                  <p>Final race scheduled for: {{ formatDate(tournament.finalStart) }}</p>
                }
              </mat-card-content>
              
              <mat-card-actions>
                @if (tournament?.status === 'setup') {
                  <button mat-raised-button color="accent" (click)="startTournament(tournament.id)">
                    <mat-icon>play_arrow</mat-icon> Start Qualifying
                  </button>
                } @else if (tournament?.status === 'qualifying') {
                  <button mat-raised-button color="accent" (click)="advanceTournament(tournament.id, 'heats')">
                    <mat-icon>skip_next</mat-icon> End Qualifying & Start Heats
                  </button>
                } @else if (tournament?.status === 'heats') {
                  <button mat-raised-button color="accent" (click)="advanceTournament(tournament.id, 'final')">
                    <mat-icon>skip_next</mat-icon> End Heats & Start Final
                  </button>
                } @else if (tournament?.status === 'final') {
                  <button mat-raised-button color="accent" (click)="advanceTournament(tournament.id, 'completed')">
                    <mat-icon>done_all</mat-icon> Complete Tournament
                  </button>
                }
                
                <a mat-button [routerLink]="['/admin/tournament/edit', tournament.id]">
                  <mat-icon>edit</mat-icon> Edit
                </a>
                
                <a mat-button routerLink="/tournament">
                  <mat-icon>visibility</mat-icon> View Tournament
                </a>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      </div>
      
      <div class="admin-section">
        <h2>System Management</h2>
        
        <div class="admin-cards">
          <mat-card class="admin-card">
            <mat-card-header>
              <mat-card-title>User Management</mat-card-title>
            </mat-card-header>
            
            <mat-card-content>
              <p>Manage user accounts, permissions, and roles.</p>
            </mat-card-content>
            
            <mat-card-actions>
              <button mat-button disabled>
                <mat-icon>people</mat-icon> Manage Users
              </button>
              <p class="coming-soon">Coming soon</p>
            </mat-card-actions>
          </mat-card>
          
          <mat-card class="admin-card">
            <mat-card-header>
              <mat-card-title>Site Configuration</mat-card-title>
            </mat-card-header>
            
            <mat-card-content>
              <p>Configure site settings, appearance, and behavior.</p>
            </mat-card-content>
            
            <mat-card-actions>
              <button mat-button disabled>
                <mat-icon>settings</mat-icon> Site Settings
              </button>
              <p class="coming-soon">Coming soon</p>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    h1 {
      margin-bottom: 20px;
    }
    
    .admin-section {
      margin-bottom: 40px;
    }
    
    h2 {
      margin-bottom: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 10px;
    }
    
    .admin-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    
    .admin-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    mat-card-content {
      flex-grow: 1;
    }
    
    mat-card-actions {
      display: flex;
      justify-content: flex-start;
      padding: 16px;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .coming-soon {
      font-size: 0.8em;
      font-style: italic;
      color: rgba(255, 255, 255, 0.5);
      margin: 0;
      padding-left: 10px;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private tournamentService = inject(TournamentService);
  private snackBar = inject(MatSnackBar);
  
  // Use the tournament signal
  activeTournament = this.tournamentService.getActiveTournament();
  
  ngOnInit(): void {
    // No need to subscribe manually, the signal is already initialized in the service
  }
  
  startTournament(tournamentId: string): void {
    this.tournamentService.startTournament(tournamentId).subscribe({
      next: () => {
        this.snackBar.open('Tournament started successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error starting tournament:', error);
        this.snackBar.open('Error starting tournament', 'Close', { duration: 3000 });
      }
    });
  }
  
  advanceTournament(tournamentId: string, nextStage: 'heats' | 'final' | 'completed'): void {
    this.tournamentService.advanceTournament(tournamentId, nextStage).subscribe({
      next: () => {
        this.snackBar.open(`Tournament advanced to ${nextStage} stage`, 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error advancing tournament:', error);
        this.snackBar.open('Error advancing tournament', 'Close', { duration: 3000 });
      }
    });
  }
  
  getTournamentStatusText(status: string): string {
    switch (status) {
      case 'setup': return 'Setup';
      case 'qualifying': return 'Qualifying Round';
      case 'heats': return 'Heat Races';
      case 'final': return 'Grand Final';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  }
  
  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'Not scheduled';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      
      return dateObj.toLocaleString([], { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  }
}
