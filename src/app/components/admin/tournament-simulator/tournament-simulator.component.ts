import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { TournamentSimulatorService } from '../../../services/tournament-simulator.service';
import { TournamentService } from '../../../services/tournament.service';
import { Tournament } from '../../../models/tournament';
import { RaceVisualizationComponent } from '../race-visualization/race-visualization.component';
import { RaceVisualizationDialogComponent, RaceVisualizationDialogData } from '../race-visualization-dialog/race-visualization-dialog.component';
import { catchError, finalize, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-tournament-simulator',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    RouterModule,
    RaceVisualizationComponent
  ],
  template: `
    <div class="simulator-container">
      <div class="header-actions">
        <a mat-button routerLink="/admin">
          <mat-icon>arrow_back</mat-icon> Back to Admin
        </a>
      </div>
      
      <h1>Tournament Simulator</h1>
      
      <p class="description">
        This tool allows you to simulate a tournament by creating mock data and advancing through each stage.
        Use this to test the tournament functionality without having to run a real tournament.
      </p>
      
      <mat-card class="simulator-card">
        <mat-card-header>
          <mat-card-title>Tournament Simulation Steps</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <div class="simulation-steps">
            <!-- Step 1: Create Tournament -->
            <div class="step" [class.active]="currentStep() >= 1" [class.completed]="currentStep() > 1">
              <div class="step-header">
                <div class="step-number">1</div>
                <div class="step-title">Create Tournament</div>
                @if (currentStep() === 1 && isLoading()) {
                  <mat-progress-bar mode="indeterminate" class="step-progress"></mat-progress-bar>
                }
              </div>
              
              <div class="step-content">
                <p>Create a new simulated tournament with default settings.</p>
                
                @if (currentStep() === 0) {
                  <button mat-raised-button color="primary" (click)="createTournament()" [disabled]="isLoading()">
                    Create Tournament
                  </button>
                } @else if (currentStep() === 1 && !isLoading()) {
                  <div class="step-result">
                    <mat-icon class="success-icon">check_circle</mat-icon>
                    <span>Tournament created successfully!</span>
                  </div>
                }
              </div>
            </div>
            
            <!-- Step 2: Start Qualifying -->
            <div class="step" [class.active]="currentStep() >= 2" [class.completed]="currentStep() > 2">
              <div class="step-header">
                <div class="step-number">2</div>
                <div class="step-title">Start Qualifying</div>
                @if (currentStep() === 2 && isLoading()) {
                  <mat-progress-bar mode="indeterminate" class="step-progress"></mat-progress-bar>
                }
              </div>
              
              <div class="step-content">
                <p>Start the qualifying stage of the tournament.</p>
                
                @if (currentStep() === 1 && !isLoading()) {
                  <button mat-raised-button color="primary" (click)="startQualifying()" [disabled]="isLoading()">
                    Start Qualifying
                  </button>
                } @else if (currentStep() === 2 && !isLoading()) {
                  <div class="step-result">
                    <mat-icon class="success-icon">check_circle</mat-icon>
                    <span>Qualifying started!</span>
                  </div>
                }
              </div>
            </div>
            
            <!-- Step 3: Populate Qualifying Results -->
            <div class="step" [class.active]="currentStep() >= 3" [class.completed]="currentStep() > 3">
              <div class="step-header">
                <div class="step-number">3</div>
                <div class="step-title">Populate Qualifying Results</div>
                @if (currentStep() === 3 && isLoading()) {
                  <mat-progress-bar mode="indeterminate" class="step-progress"></mat-progress-bar>
                }
              </div>
              
              <div class="step-content">
                <p>Add mock qualifying results for each site.</p>
                
                @if (currentStep() === 2 && !isLoading()) {
                  <button mat-raised-button color="primary" (click)="populateQualifyingResults()" [disabled]="isLoading()">
                    Add Qualifying Results
                  </button>
                } @else if (currentStep() === 3 && !isLoading()) {
                  <div class="step-result">
                    <mat-icon class="success-icon">check_circle</mat-icon>
                    <span>Qualifying results added!</span>
                  </div>
                }
              </div>
            </div>
            
            <!-- Step 4: Advance to Heat Races -->
            <div class="step" [class.active]="currentStep() >= 4" [class.completed]="currentStep() > 4">
              <div class="step-header">
                <div class="step-number">4</div>
                <div class="step-title">Advance to Heat Races</div>
                @if (currentStep() === 4 && isLoading()) {
                  <mat-progress-bar mode="indeterminate" class="step-progress"></mat-progress-bar>
                }
              </div>
              
              <div class="step-content">
                <p>Create heat races based on qualifying results and advance to the heats stage.</p>
                
                @if (currentStep() === 3 && !isLoading()) {
                  <button mat-raised-button color="primary" (click)="advanceToHeats()" [disabled]="isLoading()">
                    Advance to Heats
                  </button>
                } @else if (currentStep() === 4 && !isLoading()) {
                  <div class="step-result">
                    <mat-icon class="success-icon">check_circle</mat-icon>
                    <span>Advanced to heat races!</span>
                  </div>
                }
              </div>
            </div>
            
            <!-- Step 5: Complete Heat Races -->
            <div class="step" [class.active]="currentStep() >= 5" [class.completed]="currentStep() > 5">
              <div class="step-header">
                <div class="step-number">5</div>
                <div class="step-title">Complete Heat Races</div>
                @if (currentStep() === 5 && isLoading()) {
                  <mat-progress-bar mode="indeterminate" class="step-progress"></mat-progress-bar>
                }
              </div>
              
              <div class="step-content">
                <p>Add results to the heat races.</p>
                
                @if (currentStep() === 4 && !isLoading()) {
                  <button mat-raised-button color="primary" (click)="completeHeatRaces()" [disabled]="isLoading()">
                    Complete Heat Races
                  </button>
                } @else if (currentStep() === 5 && !isLoading()) {
                  <div class="step-result">
                    <mat-icon class="success-icon">check_circle</mat-icon>
                    <span>Heat races completed!</span>
                  </div>
                }
              </div>
            </div>
            
            <!-- Step 6: Advance to Final -->
            <div class="step" [class.active]="currentStep() >= 6" [class.completed]="currentStep() > 6">
              <div class="step-header">
                <div class="step-number">6</div>
                <div class="step-title">Advance to Final</div>
                @if (currentStep() === 6 && isLoading()) {
                  <mat-progress-bar mode="indeterminate" class="step-progress"></mat-progress-bar>
                }
              </div>
              
              <div class="step-content">
                <p>Create the final race based on heat results and advance to the final stage.</p>
                
                @if (currentStep() === 5 && !isLoading()) {
                  <button mat-raised-button color="primary" (click)="advanceToFinal()" [disabled]="isLoading()">
                    Advance to Final
                  </button>
                } @else if (currentStep() === 6 && !isLoading()) {
                  <div class="step-result">
                    <mat-icon class="success-icon">check_circle</mat-icon>
                    <span>Advanced to final race!</span>
                  </div>
                }
              </div>
            </div>
            
            <!-- Step 7: Complete Tournament -->
            <div class="step" [class.active]="currentStep() >= 7" [class.completed]="currentStep() > 7">
              <div class="step-header">
                <div class="step-number">7</div>
                <div class="step-title">Complete Tournament</div>
                @if (currentStep() === 7 && isLoading()) {
                  <mat-progress-bar mode="indeterminate" class="step-progress"></mat-progress-bar>
                }
              </div>
              
              <div class="step-content">
                <p>Add results to the final race and complete the tournament.</p>
                
                @if (currentStep() === 6 && !isLoading()) {
                  <button mat-raised-button color="primary" (click)="completeTournament()" [disabled]="isLoading()">
                    Complete Tournament
                  </button>
                } @else if (currentStep() === 7 && !isLoading()) {
                  <div class="step-result">
                    <mat-icon class="success-icon">check_circle</mat-icon>
                    <span>Tournament completed!</span>
                  </div>
                }
              </div>
            </div>
          </div>
        </mat-card-content>
        
        <mat-card-actions>
          @if (currentStep() === 7 && !isLoading()) {
            <a mat-raised-button color="primary" routerLink="/tournament">
              View Tournament
            </a>
          }
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .simulator-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header-actions {
      margin-bottom: 20px;
    }
    
    h1 {
      margin-bottom: 10px;
    }
    
    .description {
      margin-bottom: 20px;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .simulator-card {
      margin-bottom: 20px;
    }
    
    .simulation-steps {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .step {
      border: 1px solid #424242;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .step.active {
      border-color: #3f51b5;
    }
    
    .step.completed {
      border-color: #4caf50;
    }
    
    .step-header {
      display: flex;
      align-items: center;
      padding: 10px;
      background-color: #424242;
      position: relative;
    }
    
    .step.active .step-header {
      background-color: #3f51b5;
    }
    
    .step.completed .step-header {
      background-color: #4caf50;
    }
    
    .step-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #616161;
      color: white;
      font-weight: bold;
      margin-right: 10px;
    }
    
    .step.active .step-number,
    .step.completed .step-number {
      background-color: white;
      color: #424242;
    }
    
    .step-title {
      font-weight: 500;
    }
    
    .step-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
    }
    
    .step-content {
      padding: 15px;
    }
    
    .step-result {
      display: flex;
      align-items: center;
      margin-top: 10px;
    }
    
    .success-icon {
      color: #4caf50;
      margin-right: 8px;
    }
  `]
})
export class TournamentSimulatorComponent implements OnInit {
  private simulatorService = inject(TournamentSimulatorService);
  private tournamentService = inject(TournamentService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  
  // Track the current step in the simulation process
  currentStep = signal<number>(0);
  isLoading = signal<boolean>(false);
  
  // Current tournament
  tournament = signal<Tournament | null>(null);
  
  ngOnInit(): void {
    // Check if there's an active tournament
    const activeTournament = this.tournamentService.getActiveTournamentValue();
    
    if (activeTournament) {
      this.tournament.set(activeTournament);
      this.updateStepFromTournament(activeTournament);
    }
    
    // Set up a subscription to the active tournament signal
    this.tournamentService.getActiveTournament();
  }
  
  // Helper method to update the current step based on tournament status
  private updateStepFromTournament(tournament: Tournament): void {
    switch (tournament.status) {
      case 'setup':
        this.currentStep.set(1);
        break;
      case 'qualifying':
        // Check if there are qualifying results
        const hasQualifyingResults = Object.values(tournament.qualifyingResults).some(
          (results: any[]) => results.length > 0
        );
        this.currentStep.set(hasQualifyingResults ? 3 : 2);
        break;
      case 'heats':
        // Check if heats have results
        const heatsCompleted = tournament.heats.every((heat: any) => heat.status === 'completed');
        this.currentStep.set(heatsCompleted ? 5 : 4);
        break;
      case 'final':
        this.currentStep.set(6);
        break;
      case 'completed':
        this.currentStep.set(7);
        break;
    }
  }
  
  // Step 1: Create a new tournament
  createTournament(): void {
    this.isLoading.set(true);
    console.log('Creating tournament...');
    
    this.simulatorService.createSimulatedTournament('Simulated Tournament')
      .pipe(
        catchError(error => {
          console.error('Error creating tournament:', error);
          this.snackBar.open('Error creating tournament', 'Close', { duration: 3000 });
          return of(null);
        }),
        finalize(() => {
          this.isLoading.set(false);
          console.log('Tournament creation completed, isLoading:', this.isLoading());
        })
      )
      .subscribe(tournamentId => {
        if (tournamentId) {
          console.log('Tournament created with ID:', tournamentId);
          this.currentStep.set(1);
          console.log('Current step set to:', this.currentStep());
          this.snackBar.open('Tournament created successfully', 'Close', { duration: 3000 });
          
          // Force update of the tournament data
          this.simulatorService.getSimulatedTournament().subscribe(tournament => {
            console.log('Retrieved tournament:', tournament);
            if (tournament) {
              this.tournament.set(tournament);
              this.updateStepFromTournament(tournament);
              console.log('Updated step from tournament:', this.currentStep());
            }
          });
        }
      });
  }
  
  // Step 2: Start qualifying
  startQualifying(): void {
    this.isLoading.set(true);
    
    this.simulatorService.startQualifying()
      .pipe(
        catchError(error => {
          console.error('Error starting qualifying:', error);
          this.snackBar.open('Error starting qualifying', 'Close', { duration: 3000 });
          return of(void 0);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.currentStep.set(2);
        this.snackBar.open('Qualifying started successfully', 'Close', { duration: 3000 });
      });
  }
  
  // Step 3: Populate qualifying results
  populateQualifyingResults(): void {
    this.isLoading.set(true);
    
    this.simulatorService.populateQualifyingResults()
      .pipe(
        catchError(error => {
          console.error('Error populating qualifying results:', error);
          this.snackBar.open('Error populating qualifying results', 'Close', { duration: 3000 });
          return of(void 0);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.currentStep.set(3);
        this.snackBar.open('Qualifying results added successfully', 'Close', { duration: 3000 });
      });
  }
  
  // Step 4: Advance to heat races
  advanceToHeats(): void {
    this.isLoading.set(true);
    
    this.simulatorService.advanceToHeats()
      .pipe(
        catchError(error => {
          console.error('Error advancing to heats:', error);
          this.snackBar.open('Error advancing to heats', 'Close', { duration: 3000 });
          return of(void 0);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.currentStep.set(4);
        this.snackBar.open('Advanced to heat races successfully', 'Close', { duration: 3000 });
      });
  }
  
  // Step 5: Complete heat races
  completeHeatRaces(): void {
    this.isLoading.set(true);
    
    // First get the current tournament to access the heats
    this.simulatorService.getSimulatedTournament()
      .pipe(
        switchMap(tournament => {
          if (!tournament || !tournament.heats || tournament.heats.length === 0) {
            this.snackBar.open('No heats found to complete', 'Close', { duration: 3000 });
            return of(void 0);
          }
          
          // Show visualization for the first heat
          this.showHeatRaceVisualization(tournament, 0);
          
          // Return the completeHeatRaces observable
          return this.simulatorService.completeHeatRaces();
        }),
        catchError(error => {
          console.error('Error completing heat races:', error);
          this.snackBar.open('Error completing heat races', 'Close', { duration: 3000 });
          return of(void 0);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.currentStep.set(5);
        this.snackBar.open('Heat races completed successfully', 'Close', { duration: 3000 });
      });
  }
  
  // Helper method to show heat race visualization
  private showHeatRaceVisualization(tournament: Tournament, heatIndex: number): void {
    if (!tournament.heats || heatIndex >= tournament.heats.length) {
      return;
    }
    
    const heat = tournament.heats[heatIndex];
    
    // Open dialog with race visualization
    const dialogRef = this.dialog.open(RaceVisualizationDialogComponent, {
      width: '800px',
      disableClose: true,
      data: {
        raceType: 'heat',
        heatNumber: heat.heatNumber,
        participants: heat.participants,
        onComplete: (results: any[]) => {
          console.log(`Heat ${heat.heatNumber} completed with results:`, results);
          
          // Show next heat if available
          if (heatIndex < tournament.heats.length - 1) {
            setTimeout(() => {
              this.showHeatRaceVisualization(tournament, heatIndex + 1);
            }, 500);
          }
        }
      } as RaceVisualizationDialogData
    });
  }
  
  // Step 6: Advance to final
  advanceToFinal(): void {
    this.isLoading.set(true);
    
    this.simulatorService.advanceToFinal()
      .pipe(
        catchError(error => {
          console.error('Error advancing to final:', error);
          this.snackBar.open('Error advancing to final', 'Close', { duration: 3000 });
          return of(void 0);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.currentStep.set(6);
        this.snackBar.open('Advanced to final race successfully', 'Close', { duration: 3000 });
      });
  }
  
  // Step 7: Complete tournament
  completeTournament(): void {
    this.isLoading.set(true);
    
    // First get the current tournament to access the final heat
    this.simulatorService.getSimulatedTournament()
      .pipe(
        switchMap(tournament => {
          if (!tournament || !tournament.finalHeat || !tournament.finalHeat.participants) {
            this.snackBar.open('No final heat found to complete', 'Close', { duration: 3000 });
            return of(void 0);
          }
          
          // Show visualization for the final race
          this.showFinalRaceVisualization(tournament);
          
          // Return the completeTournament observable
          return this.simulatorService.completeTournament();
        }),
        catchError(error => {
          console.error('Error completing tournament:', error);
          this.snackBar.open('Error completing tournament', 'Close', { duration: 3000 });
          return of(void 0);
        }),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe(() => {
        this.currentStep.set(7);
        this.snackBar.open('Tournament completed successfully', 'Close', { duration: 3000 });
      });
  }
  
  // Helper method to show final race visualization
  private showFinalRaceVisualization(tournament: Tournament): void {
    if (!tournament.finalHeat || !tournament.finalHeat.participants) {
      return;
    }
    
    // Open dialog with race visualization
    const dialogRef = this.dialog.open(RaceVisualizationDialogComponent, {
      width: '800px',
      disableClose: true,
      data: {
        raceType: 'final',
        participants: tournament.finalHeat.participants,
        onComplete: (results: any[]) => {
          console.log('Final race completed with results:', results);
        }
      } as RaceVisualizationDialogData
    });
  }
}
