import { CommonModule } from "@angular/common";
import { Component, inject, OnDestroy, signal, effect } from "@angular/core";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { RaceData, Result } from "../../models/race-data";
import { catchError, EMPTY, Subscription } from "rxjs";
import { MatCardModule } from "@angular/material/card";

// Interface for site-specific records
interface SiteRecord {
  siteName: string;
  bestLapTime: number;
  bestLapDriver: string;
  bestRaceTime: number;
  bestRaceDriver: string;
}

@Component({
  selector: 'app-best-records',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <!-- Main records container -->
    <div class="records-container">
      <!-- Best Lap Card -->
      <mat-card class="record-card">
        <mat-card-header>
          <mat-card-title>Best Lap Time</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <!-- Overall best lap time (prominently displayed) -->
          <div class="best-overall">
            <div class="driver-avatar">
              <img *ngIf="bestLapDriver()" [src]="getDriverIcon(bestLapDriver())" class="driver-icon" alt="Driver Icon">
            </div>
            <div class="best-details">
              <p class="record-time">{{ formatTime(bestLapTime()) }}</p>
              <p class="driver-name" *ngIf="bestLapDriver()">{{ bestLapDriver() }}</p>
            </div>
          </div>
          
          <!-- Site-specific best lap times (smaller at bottom) -->
          <div class="site-records-container">
            @for (record of allSiteRecords(); track record.siteName) {
              @if (record.bestLapTime !== MAX_VALUE && record.bestLapDriver !== bestLapDriver()) {
                <div class="site-record">
                  <div class="site-header">
                    <img [src]="getDriverIcon(record.siteName)" class="site-icon" alt="Site Icon">
                    <span class="site-name">{{ record.siteName }}</span>
                  </div>
                  <div class="site-details">
                    <span class="site-time">{{ formatTime(record.bestLapTime) }}</span>
                    <span class="site-driver">{{ record.bestLapDriver }}</span>
                  </div>
                </div>
              }
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Best Race Time Card -->
      <mat-card class="record-card">
        <mat-card-header>
          <mat-card-title>Best Race Time</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <!-- Overall best race time (prominently displayed) -->
          <div class="best-overall">
            <div class="driver-avatar">
              <img *ngIf="bestRaceDriver()" [src]="getDriverIcon(bestRaceDriver())" class="driver-icon" alt="Driver Icon">
            </div>
            <div class="best-details">
              <p class="record-time">{{ formatTime(bestRaceTime()) }}</p>
              <p class="driver-name" *ngIf="bestRaceDriver()">{{ bestRaceDriver() }}</p>
            </div>
          </div>
          
          <!-- Site-specific best race times (smaller at bottom) -->
          <div class="site-records-container">
            @for (record of allSiteRecords(); track record.siteName) {
              @if (record.bestRaceTime !== MAX_VALUE && record.bestRaceDriver !== bestRaceDriver()) {
                <div class="site-record">
                  <div class="site-header">
                    <img [src]="getDriverIcon(record.siteName)" class="site-icon" alt="Site Icon">
                    <span class="site-name">{{ record.siteName }}</span>
                  </div>
                  <div class="site-details">
                    <span class="site-time">{{ formatTime(record.bestRaceTime) }}</span>
                    <span class="site-driver">{{ record.bestRaceDriver }}</span>
                  </div>
                </div>
              }
            }
          </div>
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
    
    .primary-record {
      /* Styling for the main records */
    }
    
    .driver-icon, .site-icon {
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
    
    /* Best overall record styling */
    .best-overall {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 20px 0;
      padding: 10px;
      border-radius: 8px;
      background-color: rgba(0, 0, 0, 0.03);
    }
    
    .driver-avatar {
      margin-right: 15px;
    }
    
    .best-details {
      text-align: center;
    }
    
    .driver-name {
      margin: 0;
      font-size: 16px;
      color: #666;
    }
    
    /* Site-specific records styling */
    .site-records-container {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 20px;
      margin-bottom: 20px;
      border-top: 1px solid #eee;
      padding-top: 15px;
    }
    
    .site-record {
      flex: 1;
      min-width: 120px;
      border-radius: 4px;
      padding: 8px;
      font-size: 0.85em;
    }
    
    .site-header {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
    }
    
    .site-icon {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
    
    .site-name {
      font-weight: bold;
    }
    
    .site-details {
      display: flex;
      flex-direction: column;
    }
    
    .site-time {
      font-weight: bold;
      font-size: 1.1em;
    }
    
    .site-driver {
      font-size: 0.9em;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .label {
      font-weight: bold;
      margin-right: 5px;
    }
    
    .time {
      font-weight: bold;
    }
    
    .driver {
      display: block;
      font-size: 0.9em;
      color: #666;
    }
  `]
})
export class BestRecordsComponent implements OnDestroy {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private subscription?: Subscription;
  
  bestLapTime = signal<number | null>(null);
  bestLapDriver = signal<string | null>(null);
  
  bestRaceTime = signal<number | null>(null);
  bestRaceDriver = signal<string | null>(null);
  
  // Site-specific records
  siteRecords = signal<SiteRecord[]>([]);
  allSiteRecords = signal<SiteRecord[]>([]);
  
  // Constants
  readonly MAX_VALUE = Number.MAX_VALUE;
  
  constructor() {
    // Always load data regardless of authentication status
    this.loadData();
  }
  
  private loadData(): void {
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
    let bestLapDriverName: string | null = null;
    let bestRaceDriverName: string | null = null;
    
    // Initialize site-specific records
    const siteRecords: Record<string, SiteRecord> = {
      'Fishkill': { siteName: 'Fishkill', bestLapTime: Number.MAX_VALUE, bestLapDriver: '', bestRaceTime: Number.MAX_VALUE, bestRaceDriver: '' },
      'Wallkill': { siteName: 'Wallkill', bestLapTime: Number.MAX_VALUE, bestLapDriver: '', bestRaceTime: Number.MAX_VALUE, bestRaceDriver: '' },
      'Warwick': { siteName: 'Warwick', bestLapTime: Number.MAX_VALUE, bestLapDriver: '', bestRaceTime: Number.MAX_VALUE, bestRaceDriver: '' },
      'San Juan': { siteName: 'San Juan', bestLapTime: Number.MAX_VALUE, bestLapDriver: '', bestRaceTime: Number.MAX_VALUE, bestRaceDriver: '' },
      'Patterson': { siteName: 'Patterson', bestLapTime: Number.MAX_VALUE, bestLapDriver: '', bestRaceTime: Number.MAX_VALUE, bestRaceDriver: '' }
    };
    
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
          // Update overall best lap
          if (result.BestLap < bestLap) {
            bestLap = result.BestLap;
            bestLapDriverName = result.DriverName;
          }
          
          // Update site-specific best lap
          const siteName = this.extractSiteName(result.DriverName);
          if (siteName && siteRecords[siteName] && result.BestLap < siteRecords[siteName].bestLapTime) {
            siteRecords[siteName].bestLapTime = result.BestLap;
            siteRecords[siteName].bestLapDriver = result.DriverName;
          }
        }
        
        // For race time, check if driver completed all required laps
        // Also skip results with TotalTime of 0 (didn't participate)
        if (result.TotalTime !== 0 && result.TotalTime >= MIN_RACE_TIME) {
          // Get all laps for this driver
          const driverLaps = race.Laps.filter(lap => lap.DriverGuid === result.DriverGuid);
          
          // Count how many laps this driver completed
          const lapCount = driverLaps.length;
          
          // Check if all laps have 0 cuts
          const allLapsHaveZeroCuts = driverLaps.every(lap => lap.Cuts === 0);
          
          // Only consider drivers who completed all required laps AND have no cuts on any lap
          if (lapCount >= race.RaceLaps && allLapsHaveZeroCuts) {
            // Update overall best race time
            if (result.TotalTime < bestRace) {
              bestRace = result.TotalTime;
              bestRaceDriverName = result.DriverName;
            }
            
            // Update site-specific best race time
            const siteName = this.extractSiteName(result.DriverName);
            if (siteName && siteRecords[siteName] && result.TotalTime < siteRecords[siteName].bestRaceTime) {
              siteRecords[siteName].bestRaceTime = result.TotalTime;
              siteRecords[siteName].bestRaceDriver = result.DriverName;
            }
          }
        }
      });
    });
    
    this.bestLapTime.set(bestLap !== Number.MAX_VALUE ? bestLap : null);
    this.bestLapDriver.set(bestLapDriverName);
    
    this.bestRaceTime.set(bestRace !== Number.MAX_VALUE ? bestRace : null);
    this.bestRaceDriver.set(bestRaceDriverName);
    
    // Filter out the top site from site records
    const filteredSiteRecords = Object.values(siteRecords).filter(record => {
      // Exclude the site with the overall best lap time
      const hasBestLap = bestLapDriverName && 
                         record.bestLapDriver === bestLapDriverName && 
                         record.bestLapTime === bestLap;
      
      // Exclude the site with the overall best race time
      const hasBestRace = bestRaceDriverName && 
                          record.bestRaceDriver === bestRaceDriverName && 
                          record.bestRaceTime === bestRace;
      
      // Keep sites that don't have the overall best lap or race time
      return !hasBestLap && !hasBestRace;
    });
    
    // Update the site records signals
    this.siteRecords.set(filteredSiteRecords);
    this.allSiteRecords.set(Object.values(siteRecords));
  }
  
  formatTime(timeInMs: number | null): string {
    if (!timeInMs) return '-';
    
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    const milliseconds = Math.floor(timeInMs % 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  extractSiteName(driverName: string | null): string | null {
    if (!driverName) return null;
    
    const siteNames = ['Fishkill', 'Wallkill', 'Warwick', 'San Juan', 'Patterson'];
    for (const site of siteNames) {
      if (driverName.startsWith(site)) {
        return site;
      }
    }
    return null;
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
