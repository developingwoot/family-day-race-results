import { Component, Input, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { interval, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

interface RaceParticipant {
  playerId: string;
  playerName: string;
  site: string;
  position?: number;
  points?: number;
  progress?: number;
  lane?: number;
  color?: string;
  finished?: boolean;
  speed?: number;
}

interface RaceResult {
  playerId: string;
  playerName: string;
  site: string;
  position: number;
  points?: number;
}

@Component({
  selector: 'app-race-visualization',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule
  ],
  template: `
    <div class="race-visualization-container">
      <mat-card class="race-card">
        <mat-card-header>
          <mat-card-title>{{ title() }}</mat-card-title>
          <mat-card-subtitle *ngIf="subtitle()">{{ subtitle() }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <!-- Race track visualization -->
          <div class="race-track">
            <div class="start-line"></div>
            <div class="finish-line"></div>
            
            <!-- Lanes with cars -->
            @for (participant of participants(); track participant.playerId) {
              <div class="lane">
                <div class="lane-number">{{ participant.lane }}</div>
                <div class="car" 
                     [style.left.%]="participant.progress" 
                     [style.background-color]="participant.color">
                  <div class="car-label">{{ participant.site.substring(0, 3) }}</div>
                </div>
                <div class="driver-name">{{ participant.playerName }}</div>
              </div>
            }
          </div>
          
          <!-- Race status -->
          <div class="race-status">
            <div *ngIf="isRacing()" class="racing-message">
              Race in progress...
            </div>
            
            <div *ngIf="isComplete()" class="results-container">
              <h3>Race Results</h3>
              <div class="results-list">
                @for (result of results(); track result.position) {
                  <div class="result-item">
                    <div class="position">{{ result.position }}</div>
                    <div class="driver-info">
                      <div class="driver-name">{{ result.playerName }}</div>
                      <div class="driver-site">{{ result.site }}</div>
                    </div>
                    @if (result.points !== undefined) {
                      <div class="points">{{ result.points }} pts</div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </mat-card-content>
        
        <mat-card-actions>
          <button mat-raised-button color="primary" 
                  *ngIf="!isRacing() && !isComplete()" 
                  (click)="startRace()">
            Start Race
          </button>
          <button mat-raised-button color="accent" 
                  *ngIf="isComplete()" 
                  (click)="onRaceComplete()">
            Continue
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .race-visualization-container {
      margin-bottom: 20px;
    }
    
    .race-card {
      overflow: hidden;
    }
    
    .race-track {
      position: relative;
      height: 300px;
      background-color: #333;
      border-radius: 8px;
      margin: 20px 0;
      overflow: hidden;
    }
    
    .start-line {
      position: absolute;
      left: 5%;
      top: 0;
      height: 100%;
      width: 2px;
      background-color: white;
      z-index: 1;
    }
    
    .finish-line {
      position: absolute;
      right: 5%;
      top: 0;
      height: 100%;
      width: 4px;
      background: repeating-linear-gradient(
        to bottom,
        black,
        black 10px,
        white 10px,
        white 20px
      );
      z-index: 1;
    }
    
    .lane {
      position: relative;
      height: 40px;
      margin: 10px 0;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
    }
    
    .lane-number {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      z-index: 1;
    }
    
    .car {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 50px;
      height: 25px;
      border-radius: 5px;
      transition: left 0.5s ease-in-out;
      z-index: 2;
    }
    
    .car-label {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: bold;
      font-size: 10px;
      text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
    }
    
    .driver-name {
      position: absolute;
      left: 40px;
      top: 50%;
      transform: translateY(-50%);
      color: white;
      font-size: 14px;
      z-index: 1;
    }
    
    .race-status {
      min-height: 100px;
      padding: 10px;
    }
    
    .racing-message {
      text-align: center;
      font-size: 18px;
      color: #ff9800;
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    
    .results-container {
      margin-top: 10px;
    }
    
    .results-container h3 {
      margin-bottom: 10px;
      text-align: center;
    }
    
    .results-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .result-item {
      display: flex;
      align-items: center;
      padding: 8px;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    
    .position {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: #3f51b5;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      margin-right: 10px;
    }
    
    .result-item:nth-child(1) .position {
      background-color: gold;
      color: #333;
    }
    
    .result-item:nth-child(2) .position {
      background-color: silver;
      color: #333;
    }
    
    .result-item:nth-child(3) .position {
      background-color: #cd7f32; /* bronze */
      color: white;
    }
    
    .driver-info {
      flex-grow: 1;
    }
    
    .driver-site {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .points {
      font-weight: bold;
      color: #4caf50;
    }
  `]
})
export class RaceVisualizationComponent implements OnInit, OnDestroy {
  @Input() raceType: 'heat' | 'final' = 'heat';
  @Input() heatNumber?: number;
  @Input() raceParticipants: RaceParticipant[] = [];
  @Input() onComplete: (results: RaceResult[]) => void = () => {};
  
  // Site colors for visualization
  private siteColors: { [key: string]: string } = {
    'Fishkill': '#3f51b5',  // blue
    'Patterson': '#f44336', // red
    'San Juan': '#4caf50',  // green
    'Wallkill': '#ff9800',  // orange
    'Warwick': '#9c27b0'    // purple
  };
  
  // Signals for reactive state
  private _participants = signal<RaceParticipant[]>([]);
  private _results = signal<RaceResult[]>([]);
  private _isRacing = signal(false);
  private _isComplete = signal(false);
  
  // Computed values
  title = computed(() => {
    if (this.raceType === 'heat') {
      return `Heat Race ${this.heatNumber}`;
    } else {
      return 'Grand Final';
    }
  });
  
  subtitle = computed(() => {
    if (this._isRacing()) {
      return 'Race in progress';
    } else if (this._isComplete()) {
      return 'Race completed';
    } else {
      return 'Ready to start';
    }
  });
  
  // Expose signals as readable
  participants = this._participants.asReadonly();
  results = this._results.asReadonly();
  isRacing = this._isRacing.asReadonly();
  isComplete = this._isComplete.asReadonly();
  
  // Race simulation
  private raceInterval?: Subscription;
  private readonly RACE_DURATION = 5000; // 5 seconds
  private readonly UPDATE_INTERVAL = 100; // 100ms
  private readonly TOTAL_STEPS = this.RACE_DURATION / this.UPDATE_INTERVAL;
  
  ngOnInit(): void {
    // Initialize participants with lane assignments and colors
    const initializedParticipants = this.raceParticipants.map((participant, index) => {
      return {
        ...participant,
        lane: index + 1,
        color: this.siteColors[participant.site] || '#777777',
        progress: 5, // Start at 5%
        finished: false
      };
    });
    
    this._participants.set(initializedParticipants);
  }
  
  ngOnDestroy(): void {
    // Clean up any subscriptions
    if (this.raceInterval) {
      this.raceInterval.unsubscribe();
    }
  }
  
  startRace(): void {
    this._isRacing.set(true);
    
    // Create a copy of participants to work with
    const racers = [...this._participants()];
    
    // Assign random speeds to each participant
    racers.forEach(racer => {
      // Random speed factor between 0.8 and 1.2
      racer.speed = 0.8 + Math.random() * 0.4;
    });
    
    // Start the race simulation
    let step = 0;
    this.raceInterval = interval(this.UPDATE_INTERVAL).pipe(
      take(this.TOTAL_STEPS)
    ).subscribe({
      next: () => {
        step++;
        const progress = step / this.TOTAL_STEPS;
        
        // Update each racer's position
        racers.forEach(racer => {
          if (!racer.finished) {
            // Non-linear progress to make it more interesting
            // Easing function to make the race more dynamic
            const easing = this.easeInOutQuad(progress);
            
            // Apply the racer's speed factor
            const adjustedProgress = easing * (racer.speed || 1);
            
            // Calculate new position (5% to 95%)
            racer.progress = 5 + adjustedProgress * 90;
            
            // Check if racer has finished
            if (racer.progress >= 95) {
              racer.progress = 95;
              racer.finished = true;
            }
          }
        });
        
        // Update the participants signal
        this._participants.set([...racers]);
      },
      complete: () => {
        // Race is complete, determine final positions
        this.finalizeRace(racers);
      }
    });
  }
  
  private finalizeRace(racers: RaceParticipant[]): void {
    // Sort racers by progress (highest first)
    const sortedRacers = [...racers].sort((a, b) => (b.progress || 0) - (a.progress || 0));
    
    // Assign final positions
    sortedRacers.forEach((racer, index) => {
      racer.position = index + 1;
      
      // Assign points for heat races
      if (this.raceType === 'heat') {
        racer.points = this.calculatePoints(racer.position || 0);
      }
    });
    
    // Update participants with final positions
    this._participants.set(sortedRacers);
    
    // Create results
    const results: RaceResult[] = sortedRacers.map(racer => ({
      playerId: racer.playerId,
      playerName: racer.playerName,
      site: racer.site,
      position: racer.position || 0,
      points: racer.points
    }));
    
    // Update results signal
    this._results.set(results);
    
    // Update race status
    this._isRacing.set(false);
    this._isComplete.set(true);
  }
  
  onRaceComplete(): void {
    // Call the onComplete callback with the results
    this.onComplete(this._results());
  }
  
  // Easing function to make the race more dynamic
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  // Calculate points based on position
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
