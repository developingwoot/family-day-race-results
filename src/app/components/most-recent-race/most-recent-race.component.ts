import { CommonModule } from "@angular/common";
import { Component, inject, OnDestroy, signal, ViewChild, AfterViewInit, effect } from "@angular/core";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { RaceData, Result } from "../../models/race-data";
import { catchError, EMPTY, Subscription } from "rxjs";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatSortModule, Sort, MatSort } from "@angular/material/sort";

@Component({
  selector: 'app-most-recent-race',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule],
  template: `
    @if (raceData(); as race) {
      <div class="race-info">
       
        <h3>Last Race</h3>
        
        <div class="mat-elevation-z8 results-table-container">
          <table mat-table [dataSource]="dataSource" matSort>
            <!-- Icon Column -->
            <ng-container matColumnDef="icon">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let result">
                <img [src]="getDriverIcon(result.DriverName)" class="driver-icon" alt="Driver Icon">
              </td>
            </ng-container>
            
            <!-- Position Column -->
            <ng-container matColumnDef="position">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Pos </th>
              <td mat-cell *matCellDef="let i = index"> {{ i + 1 }} </td>
            </ng-container>
            
            <!-- Driver Column -->
            <ng-container matColumnDef="driver">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Driver </th>
              <td mat-cell *matCellDef="let result"> {{ result.DriverName }} </td>
            </ng-container>
            
            <!-- Best Lap Column -->
            <ng-container matColumnDef="bestLap">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Best Lap </th>
              <td mat-cell *matCellDef="let result"> {{ formatTime(result.BestLap) }} </td>
            </ng-container>
            
            <!-- Total Time Column -->
            <ng-container matColumnDef="totalTime">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Total Time </th>
              <td mat-cell *matCellDef="let result"> {{ formatTime(result.TotalTime) }} </td>
            </ng-container>
            
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>
    } @else {
      <div>No race data available</div>
    }
  `,
  styles: [`
    .error { color: red; }
    .race-info { margin-bottom: 20px; }
    .results-table-container { 
      overflow-x: auto;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
    }
    th.mat-sort-header-sorted {
      color: black;
    }
    .driver-icon {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 50%;
    }
  `]
})
export class MostRecentRaceComponent implements OnDestroy, AfterViewInit {
  private raceService = inject(DataService);
  private authService = inject(AuthService);
  private subscription?: Subscription;
  
  @ViewChild(MatSort) sort!: MatSort;
  
  isLoading = signal(true);
  error = signal<string | null>(null);
  raceData = signal<RaceData | null>(null);
  
  displayedColumns: string[] = ['icon', 'position', 'driver', 'bestLap', 'totalTime'];
  dataSource = new MatTableDataSource<Result>([]);
  
  constructor() {
    // Wait for authentication before loading data
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.loadData();
      }
    });
  }
  
  private loadData(): void {
    this.subscription = this.raceService.getMostRecentRaceStream()
      .pipe(
        catchError(error => {
          console.error('Error in stream:', error);
          this.error.set(error.message);
          this.isLoading.set(false);
          return EMPTY;
        })
      )
      .subscribe({
        next: (race) => {
          this.raceData.set(race);
          if (race?.Result) {
            // Filter out invalid results:
            // - BestLap of 999999999 (no valid lap)
            // - TotalTime of 0 (didn't participate)
            this.dataSource.data = race.Result.filter(result => 
              result.BestLap !== 999999999 && result.TotalTime !== 0
            );
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Subscription error:', error);
          this.error.set(error.message);
          this.isLoading.set(false);
        }
      });
  }
  
  ngAfterViewInit() {
    if (this.dataSource) {
      this.dataSource.sort = this.sort;
    }
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
  
  formatTime(timeInMs: number): string {
    if (!timeInMs) return '-';
    
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    const milliseconds = Math.floor(timeInMs % 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  getDriverIcon(driverName: string): string {
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
