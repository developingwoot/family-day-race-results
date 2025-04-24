import { CommonModule } from "@angular/common";
import { Component, inject, OnDestroy, signal } from "@angular/core";
import { DataService } from "../../services/data.service";
import { RaceData, Result } from "../../models/race-data";
import { catchError, EMPTY, Subscription } from "rxjs";
import { MatCardModule } from "@angular/material/card";

@Component({
  selector: 'app-best-records',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="records-container">
      <!-- Best Lap Card -->
      <mat-card class="record-card">
        <mat-card-header>
          <div mat-card-avatar>
            <img *ngIf="bestLapDriver()" [src]="getDriverIcon(bestLapDriver())" class="driver-icon" alt="Driver Icon">
          </div>
          <mat-card-title>Best Lap Time</mat-card-title>
          <mat-card-subtitle *ngIf="bestLapDriver()">{{ bestLapDriver() }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="record-time">{{ formatTime(bestLapTime()) }}</p>
        </mat-card-content>
      </mat-card>

      <!-- Best Race Time Card -->
      <mat-card class="record-card">
        <mat-card-header>
          <div mat-card-avatar>
            <img *ngIf="bestRaceDriver()" [src]="getDriverIcon(bestRaceDriver())" class="driver-icon" alt="Driver Icon">
          </div>
          <mat-card-title>Best Race Time</mat-card-title>
          <mat-card-subtitle *ngIf="bestRaceDriver()">{{ bestRaceDriver() }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="record-time">{{ formatTime(bestRaceTime()) }}</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .records-container {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .record-card {
      flex: 1;
      min-width: 250px;
    }
    
    .driver-icon {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 50%;
    }
    
    .record-time {
      font-size: 24px;
      font-weight: bold;
      margin: 16px 0;
    }
    
    .record-track {
      font-style: italic;
      color: #666;
    }
    
    .record-card {
      position: relative;
      overflow: hidden;
    }
  `]
})
export class BestRecordsComponent implements OnDestroy {
  private dataService = inject(DataService);
  private subscription: Subscription;
  
  bestLapTime = signal<number | null>(null);
  bestLapDriver = signal<string | null>(null);
  
  bestRaceTime = signal<number | null>(null);
  bestRaceDriver = signal<string | null>(null);
  
  constructor() {
    this.subscription = this.dataService.getAllRacesStream()
      .pipe(
        catchError(error => {
          console.error('Error in stream:', error);
          return EMPTY;
        })
      )
      .subscribe({
        next: (races) => {
          this.calculateBestRecords(races);
        },
        error: (error) => {
          console.error('Subscription error:', error);
        }
      });
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
  
  calculateBestRecords(races: RaceData[]) {
    let bestLap = Number.MAX_VALUE;
    let bestRace = Number.MAX_VALUE;
    let bestLapDriverName = null;
    let bestRaceDriverName = null;
    
    // Minimum acceptable times
    const MIN_LAP_TIME = 49000;  // 49 seconds
    const MIN_RACE_TIME = 118000;  // 1:58
    
    races.forEach(race => {
      if (!race.Result || !race.Laps) return;
      
      race.Result.forEach(result => {
        // Skip invalid lap times
        if (result.BestLap === 999999999) return;
        
        // Skip lap times that are too fast (below 49 seconds)
        if (result.BestLap < MIN_LAP_TIME) return;
        
        // Check if this lap has no cuts
        const matchingLap = race.Laps.find(lap => 
          lap.DriverGuid === result.DriverGuid && 
          lap.LapTime === result.BestLap
        );
        
        // Only consider laps with no cuts
        if (matchingLap && matchingLap.Cuts === 0) {
          if (result.BestLap < bestLap) {
            bestLap = result.BestLap;
            bestLapDriverName = result.DriverName;
          }
        }
        
        // For race time, we can't easily check cuts, so just use the minimum time filter
        if (result.TotalTime < bestRace && result.TotalTime >= MIN_RACE_TIME) {
          bestRace = result.TotalTime;
          bestRaceDriverName = result.DriverName;
        }
      });
    });
    
    this.bestLapTime.set(bestLap !== Number.MAX_VALUE ? bestLap : null);
    this.bestLapDriver.set(bestLapDriverName);
    
    this.bestRaceTime.set(bestRace !== Number.MAX_VALUE ? bestRace : null);
    this.bestRaceDriver.set(bestRaceDriverName);
  }
  
  formatTime(timeInMs: number | null): string {
    if (!timeInMs) return '-';
    
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    const milliseconds = Math.floor(timeInMs % 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  getDriverIcon(driverName: string | null): string {
    if (!driverName) return 'assets/helmet.jpg';
    
    // Available icons: Fishkill_Icon.png, Patterson_Icon.png, San_Juan_Icon.png, Wallkill_Icon.png, Warwick_Icon.png
    type IconKey = 'Fishkill' | 'Patterson' | 'San Juan' | 'Wallkill' | 'Warwick';
    const iconPrefixes: IconKey[] = ['Fishkill', 'Patterson', 'San Juan', 'Wallkill', 'Warwick'];
    const iconFileNames: Record<IconKey, string> = {
      'Fishkill': 'Fishkill_Icon.png',
      'Patterson': 'Patterson_Icon.png',
      'San Juan': 'San_Juan_Icon.png',
      'Wallkill': 'Wallkill_Icon.png',
      'Warwick': 'Warwick_Icon.png'
    };
    
    // Check if the driver name starts with any of the icon prefixes
    for (const prefix of iconPrefixes) {
      if (driverName.startsWith(prefix)) {
        return `assets/${iconFileNames[prefix]}`;
      }
    }
    
    // Default icon if no match is found
    return 'assets/helmet.jpg';
  }
}
