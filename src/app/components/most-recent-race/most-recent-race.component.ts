import { CommonModule } from "@angular/common";
import { Component, inject, OnDestroy, signal, ViewChild, AfterViewInit, effect, input, computed } from "@angular/core";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { ClaimService } from "../../services/claim.service";
import { RaceData, Result } from "../../models/race-data";
import { catchError, EMPTY, Subscription } from "rxjs";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatSortModule, MatSort } from "@angular/material/sort";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatBadgeModule } from "@angular/material/badge";
import { QRCodeComponent } from "angularx-qrcode";

@Component({
  selector: 'app-most-recent-race',
  standalone: true,
  imports: [
    CommonModule, 
    MatTableModule, 
    MatSortModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule,
    MatBadgeModule,
    QRCodeComponent
  ],
  template: `
    @if (raceData(); as race) {
      <div class="race-info">
        <div class="race-header">
          <h3>Last Race</h3>
          @if (currentSite()) {
            <div class="site-badge">
              <img [src]="getSiteIcon(currentSite() || '')" class="site-icon" alt="Site Icon">
              <span>{{ currentSite() }}</span>
            </div>
          }
        </div>
        
        <div class="race-content">
          <!-- Race Results Table -->
          <div class="results-section">
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
                
                <!-- Claim Status Column -->
                <ng-container matColumnDef="claimStatus">
                  <th mat-header-cell *matHeaderCellDef> Status </th>
                  <td mat-cell *matCellDef="let result">
                    @if (isResultClaimed(result)) {
                      <span class="claimed-badge">Claimed</span>
                    } @else if (isFromSelectedSite(result)) {
                      <span class="unclaimed-badge">Unclaimed</span>
                    } @else {
                      <span class="neutral-badge">-</span>
                    }
                  </td>
                </ng-container>
                
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          </div>
          
          <!-- QR Code Section -->
          @if (currentSite() && hasUnclaimedResults()) {
            <div class="qr-code-section">
              <mat-card class="qr-code-container">
                <mat-card-header>
                  <mat-card-title>Claim Your Race Time</mat-card-title>
                </mat-card-header>
                
                <mat-card-content>
                  @if (selectedResult(); as result) {
                    <div class="selected-result">
                      <p><strong>Position:</strong> {{ getResultPosition(result) }}</p>
                      <p><strong>Driver:</strong> {{ result.DriverName }}</p>
                      <p><strong>Time:</strong> {{ formatTime(result.TotalTime) }}</p>
                    </div>
                  }
                  
                  <div class="qr-code">
                    <qrcode
                      [qrdata]="qrCodeUrl()"
                      [width]="200"
                      [errorCorrectionLevel]="'M'"
                      [colorDark]="'#ffffff'"
                      [colorLight]="'#424242'"
                      [imageSrc]="'assets/race_logo.png'"
                      [imageHeight]="40"
                      [imageWidth]="40"
                    ></qrcode>
                  </div>
                  
                  @if (unclaimedResults().length > 1) {
                    <div class="result-selector">
                      <button mat-button (click)="previousResult()">
                        <mat-icon>arrow_back</mat-icon> Previous
                      </button>
                      <span>{{ currentResultIndex() + 1 }} of {{ unclaimedResults().length }}</span>
                      <button mat-button (click)="nextResult()">
                        Next <mat-icon>arrow_forward</mat-icon>
                      </button>
                    </div>
                  }
                  
                  <p class="qr-instructions">
                    Scan to claim this race time and enter the tournament!
                  </p>
                </mat-card-content>
              </mat-card>
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="no-data">
        @if (isLoading()) {
          <div class="loading">Loading race data...</div>
        } @else {
          <div>No race data available</div>
        }
      </div>
    }
  `,
  styles: [`
    .error { color: red; }
    
    .race-info { 
      margin-bottom: 20px; 
    }
    
    .race-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .site-badge {
      display: flex;
      align-items: center;
      background-color: #424242;
      padding: 5px 10px;
      border-radius: 20px;
    }
    
    .site-icon {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
    
    .race-content {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .results-section {
      flex: 3;
      min-width: 300px;
    }
    
    .qr-code-section {
      flex: 2;
      min-width: 250px;
    }
    
    .results-table-container { 
      overflow-x: auto;
      margin-bottom: 20px;
    }
    
    table {
      width: 100%;
    }
    
    .driver-icon {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 50%;
    }
    
    .claimed-badge {
      background-color: #4CAF50;
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.8em;
    }
    
    .unclaimed-badge {
      background-color: #FF9800;
      color: white;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 0.8em;
    }
    
    .neutral-badge {
      color: rgba(255, 255, 255, 0.5);
      padding: 3px 8px;
      font-size: 0.8em;
    }
    
    .qr-code-container {
      padding: 16px;
    }
    
    .qr-code {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }
    
    .selected-result {
      margin: 10px 0;
      font-size: 0.9em;
    }
    
    .result-selector {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 10px 0;
    }
    
    .qr-instructions {
      font-size: 0.9em;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 15px;
      text-align: center;
    }
    
    .no-data {
      padding: 20px;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .loading {
      font-style: italic;
    }
  `]
})
export class MostRecentRaceComponent implements OnDestroy, AfterViewInit {
  currentSite = input<string | null>(null);
  
  private raceService = inject(DataService);
  private authService = inject(AuthService);
  private claimService = inject(ClaimService);
  private subscription?: Subscription;
  
  @ViewChild(MatSort) sort!: MatSort;
  
  isLoading = signal(true);
  error = signal<string | null>(null);
  raceData = signal<RaceData | null>(null);
  
  // QR code related signals
  unclaimedResults = signal<Result[]>([]);
  currentResultIndex = signal(0);
  selectedResult = computed(() => {
    const results = this.unclaimedResults();
    const index = this.currentResultIndex();
    return results.length > 0 ? results[index] : null;
  });
  
  qrCodeUrl = computed(() => {
    const result = this.selectedResult();
    if (!result || !this.raceData()) return '';
    
    // Generate QR code URL with race ID, driver ID, and site
    return this.claimService.generateQRCodeUrl(
      this.raceData()!.id,
      result.DriverGuid,
      this.currentSite() || ''
    );
  });
  
  displayedColumns: string[] = ['icon', 'position', 'driver', 'bestLap', 'totalTime', 'claimStatus'];
  dataSource = new MatTableDataSource<Result>([]);
  
  constructor() {
    // Always load data regardless of authentication status
    this.loadData();
    
    // Filter results by site if a site is specified
    effect(() => {
      if (this.raceData() && this.currentSite()) {
        this.filterResultsBySite();
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
            const validResults = race.Result.filter(result => 
              result.BestLap !== 999999999 && result.TotalTime !== 0
            );
            
            this.dataSource.data = validResults;
            
            // Check which results are claimed
            this.updateClaimStatus(race.id, validResults);
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
  
  private filterResultsBySite(): void {
    if (!this.raceData()?.Result) return;
    
    // Show all valid results regardless of site
    const validResults = this.raceData()!.Result.filter(result => 
      result.BestLap !== 999999999 && 
      result.TotalTime !== 0
    );
    
    this.dataSource.data = validResults;
    
    // Update unclaimed results
    this.updateUnclaimedResults();
  }
  
  private updateClaimStatus(raceId: string, results: Result[]): void {
    // Get claimed race info from the claim service
    this.claimService.getClaimedRaces(raceId).subscribe(claimedRaces => {
      // Update unclaimed results
      this.updateUnclaimedResults();
    });
  }
  
  private updateUnclaimedResults(): void {
    if (!this.raceData() || !this.currentSite()) {
      this.unclaimedResults.set([]);
      this.currentResultIndex.set(-1);
      return;
    }
    
    // Filter to only unclaimed results for the current site
    const unclaimed = this.dataSource.data.filter(result => 
      !this.isResultClaimed(result) && 
      result.DriverName.startsWith(this.currentSite()!)
    );
    
    this.unclaimedResults.set(unclaimed);
    this.currentResultIndex.set(unclaimed.length > 0 ? 0 : -1);
  }
  
  isResultClaimed(result: Result): boolean {
    return this.claimService.isResultClaimed(this.raceData()?.id || '', result.DriverGuid);
  }
  
  isFromSelectedSite(result: Result): boolean {
    const site = this.currentSite();
    if (!site) return false;
    return result.DriverName.startsWith(site);
  }
  
  getResultPosition(result: Result): number {
    const index = this.dataSource.data.findIndex(r => r.DriverGuid === result.DriverGuid);
    return index >= 0 ? index + 1 : 0;
  }
  
  hasUnclaimedResults(): boolean {
    return this.unclaimedResults().length > 0;
  }
  
  nextResult(): void {
    const current = this.currentResultIndex();
    const max = this.unclaimedResults().length - 1;
    this.currentResultIndex.set(current < max ? current + 1 : 0);
  }
  
  previousResult(): void {
    const current = this.currentResultIndex();
    const max = this.unclaimedResults().length - 1;
    this.currentResultIndex.set(current > 0 ? current - 1 : max);
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
