 import { Component, inject, signal, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { DataService } from '../../services/data.service';
import { ClaimService, ClaimRaceData } from '../../services/claim.service';
import { AuthService } from '../../services/auth.service';
import { SiteConfigService } from '../../services/site-config.service';
import { RaceData, Result } from '../../models/race-data';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-race-history',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule,
    MatSelectModule
  ],
  template: `
    <div class="race-history-container">
      <div class="header-section">
        <h2>Race History</h2>
        
        <div class="filters-container">
         
          <div class="filter-item">
            <mat-form-field appearance="outline">
              <mat-label>Sort Order</mat-label>
              <mat-select [value]="sortOrder()" (selectionChange)="onSortOrderChange($event.value)">
                <mat-option value="desc">Newest First</mat-option>
                <mat-option value="asc">Oldest First</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </div>
      
      @if (loading()) {
        <div class="loading-spinner">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading race history...</p>
        </div>
      } @else if (error()) {
        <div class="error-message">
          <mat-icon>error</mat-icon>
          <p>{{ error() }}</p>
        </div>
      } @else {
        <div class="races-list">
          @for (race of dataSource.data; track race.id) {
            <mat-card class="race-card">
              <mat-card-header>
                <mat-card-title>
                  Race on {{ formatDate(race.uploadedAt) }}
                </mat-card-title>
                <mat-card-subtitle>
                  {{ race.TrackName }} - {{ race.RaceLaps }} laps
                </mat-card-subtitle>
              </mat-card-header>
              
              <mat-card-content>
                <div class="race-summary">
                  <div class="summary-item">
                    <div class="summary-label">Participants</div>
                    <div class="summary-value">{{ getValidParticipantCount(race) }}</div>
                  </div>
                  
                  <div class="summary-item">
                    <div class="summary-label">Winner</div>
                    <div class="summary-value">{{ getWinner(race) }}</div>
                  </div>
                  
                  <div class="summary-item">
                    <div class="summary-label">Best Lap</div>
                    <div class="summary-value">{{ getBestLap(race) }}</div>
                  </div>
                </div>
                
                <mat-expansion-panel class="results-panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      View Results
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  
                  <div class="results-table-container">
                    <table mat-table [dataSource]="getRaceResults(race)" class="results-table">
                      <!-- Position Column -->
                      <ng-container matColumnDef="position">
                        <th mat-header-cell *matHeaderCellDef> Pos </th>
                        <td mat-cell *matCellDef="let i = index"> {{ i + 1 }} </td>
                      </ng-container>
                      
                      <!-- Driver Column -->
                      <ng-container matColumnDef="driver">
                        <th mat-header-cell *matHeaderCellDef> Driver </th>
                        <td mat-cell *matCellDef="let result">
                          <div class="driver-cell">
                            <img [src]="getDriverIcon(result.DriverName)" class="driver-icon" alt="Driver Icon">
                            @if (isResultClaimed(race.id, result.DriverGuid) && getPlayerName(race.id, result.DriverGuid)) {
                              <div class="driver-name">
                                <span class="original-driver">{{ result.DriverName }}</span>
                                <span class="claimed-by">Claimed by: {{ getPlayerName(race.id, result.DriverGuid) }}</span>
                              </div>
                            } @else {
                              <span>{{ result.DriverName }}</span>
                            }
                          </div>
                        </td>
                      </ng-container>
                      
                      <!-- Best Lap Column -->
                      <ng-container matColumnDef="bestLap">
                        <th mat-header-cell *matHeaderCellDef> Best Lap </th>
                        <td mat-cell *matCellDef="let result"> {{ formatTime(result.BestLap) }} </td>
                      </ng-container>
                      
                      <!-- Total Time Column -->
                      <ng-container matColumnDef="totalTime">
                        <th mat-header-cell *matHeaderCellDef> Total Time </th>
                        <td mat-cell *matCellDef="let result"> {{ formatTime(result.TotalTime) }} </td>
                      </ng-container>
                      
                      <!-- Claim Status Column -->
                      <ng-container matColumnDef="claimStatus">
                        <th mat-header-cell *matHeaderCellDef> Status </th>
                        <td mat-cell *matCellDef="let result">
                          @if (isResultClaimed(race.id, result.DriverGuid)) {
                            <span class="claimed-badge">Claimed</span>
                          } @else if (isFromCurrentSite(result.DriverName)) {
                            <button mat-button color="accent" (click)="claimResult(race, result)">
                              <mat-icon>verified_user</mat-icon> Claim
                            </button>
                          } @else {
                            <span class="neutral-badge">-</span>
                          }
                        </td>
                      </ng-container>
                      
                      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                    </table>
                  </div>
                </mat-expansion-panel>
              </mat-card-content>
            </mat-card>
          }
          
          <mat-paginator 
            [length]="totalRaces()"
            [pageSize]="10"
            [pageSizeOptions]="[5, 10, 25, 50]"
            aria-label="Select page">
          </mat-paginator>
        </div>
      }
    </div>
    
    <!-- Claim Dialog -->
    <ng-template #claimDialog let-data>
      <h2 mat-dialog-title>Claim Race Time</h2>
      
      <mat-dialog-content>
        <div class="race-details-section">
          <div class="site-badge">
            <img [src]="getSiteIcon(data.site)" class="site-icon" alt="Site Icon">
            <span>{{ data.site }}</span>
          </div>
          
          <h3>Race Details</h3>
          <p><strong>Position:</strong> {{ data.position }}</p>
          <p><strong>Driver:</strong> {{ data.driverName }}</p>
          <p><strong>Best Lap:</strong> {{ formatTime(data.bestLap) }}</p>
          <p><strong>Total Time:</strong> {{ formatTime(data.totalTime) }}</p>
          
          <form [formGroup]="claimForm">
            <h3>Your Information</h3>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Your Name</mat-label>
              <input matInput formControlName="playerName" required [value]="authService.currentUser()?.displayName || ''">
              <mat-error *ngIf="claimForm.get('playerName')?.hasError('required')">
                Name is required
              </mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="playerEmail" type="email" [value]="authService.currentUser()?.email || ''" [readonly]="!!authService.currentUser()?.email">
              <mat-error *ngIf="claimForm.get('playerEmail')?.hasError('email')">
                Please enter a valid email address
              </mat-error>
            </mat-form-field>
          </form>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button 
          mat-raised-button 
          color="primary" 
          [disabled]="claimForm.invalid || submitting()"
          (click)="submitClaim(data)">
          @if (submitting()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            Claim This Race Time
          }
        </button>
      </mat-dialog-actions>
    </ng-template>
  `,
  styles: [`
    .race-history-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .filters-container {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .filter-item {
      min-width: 150px;
    }
    
    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    
    .error-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
      color: #f44336;
    }
    
    .error-message mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
    }
    
    .races-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .race-card {
      margin-bottom: 10px;
    }
    
    .race-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .summary-item {
      flex: 1;
      min-width: 100px;
    }
    
    .summary-label {
      font-weight: 500;
      margin-bottom: 5px;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .summary-value {
      font-size: 1.1em;
    }
    
    .results-panel {
      margin-top: 15px;
    }
    
    .results-table-container {
      overflow-x: auto;
      margin: 10px 0;
    }
    
    .results-table {
      width: 100%;
    }
    
    .driver-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .driver-icon {
      width: 24px;
      height: 24px;
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
    
    .neutral-badge {
      color: rgba(255, 255, 255, 0.5);
      padding: 3px 8px;
      font-size: 0.8em;
    }
    
    .site-badge {
      display: flex;
      align-items: center;
      background-color: #424242;
      padding: 5px 10px;
      border-radius: 20px;
      margin-bottom: 20px;
      width: fit-content;
    }
    
    .site-icon {
      width: 24px;
      height: 24px;
      margin-right: 8px;
    }
    
    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }
    
    .driver-name {
      display: flex;
      flex-direction: column;
    }
    
    .original-driver {
      font-weight: 500;
    }
    
    .claimed-by {
      font-size: 0.85em;
      color: #4CAF50;
      font-style: italic;
    }
  `]
})
export class RaceHistoryComponent implements AfterViewInit, OnDestroy {
  private dataService = inject(DataService);
  private claimService = inject(ClaimService);
  protected authService = inject(AuthService);
  protected siteConfigService = inject(SiteConfigService);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('claimDialog') claimDialogTemplate: any;
  
  loading = signal(true);
  error = signal<string | null>(null);
  totalRaces = signal(0);
  submitting = signal(false);
  sortOrder = signal<'asc' | 'desc'>('desc'); // Default to newest first
  
  availableSites = ['Fishkill', 'Patterson', 'San Juan', 'Wallkill', 'Warwick'];
  
  displayedColumns: string[] = ['position', 'driver', 'bestLap', 'totalTime', 'claimStatus'];
  dataSource = new MatTableDataSource<RaceData>([]);
  
  private subscription?: Subscription;
  private claimSubscriptions = new Map<string, Subscription>();
  
  // Map to store player names for claimed races: raceId -> driverGuid -> playerName
  private playerNames = new Map<string, Map<string, string>>();
  
  // Form for claiming races
  claimForm: FormGroup = this.fb.group({
    playerName: ['', Validators.required],
    playerEmail: ['', Validators.email]
  });
  
  constructor() {
    this.loadRaces();
    
    // Initialize form with user data if available
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.claimForm.patchValue({
        playerName: currentUser.displayName || '',
        playerEmail: currentUser.email || ''
      });
    }
  }
  
  onSiteChange(site: string | null): void {
    if (site) {
      this.siteConfigService.setSite(site);
      this.dataSource.filter = site;
    } else {
      this.siteConfigService.clearSite();
      this.dataSource.filter = '';
    }
  }
  
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Apply custom filter predicate to filter by site
    this.dataSource.filterPredicate = (data: RaceData, filter: string) => {
      if (!filter) return true;
      
      // Check if any of the results are from the selected site
      return data.Result?.some(result => {
        const driverSite = this.extractSiteName(result.DriverName);
        return driverSite === filter;
      }) || false;
    };
    
    // Apply initial filter based on current site
    const currentSite = this.siteConfigService.currentSite();
    if (currentSite) {
      this.dataSource.filter = currentSite;
    }
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
    
    // Clean up all claim subscriptions
    this.claimSubscriptions.forEach(subscription => subscription.unsubscribe());
  }
  
  private loadRaces(): void {
    this.subscription = this.dataService.getAllRacesStream().subscribe({
      next: (races) => {
        this.dataSource.data = races;
        this.totalRaces.set(races.length);
        this.loading.set(false);
        
        // Apply sorting
        this.sortRaces();
        
        // Load claim status for each race
        races.forEach(race => {
          this.loadClaimStatus(race.id);
        });
      },
      error: (error) => {
        console.error('Error loading races:', error);
        this.error.set('Error loading race history. Please try again.');
        this.loading.set(false);
      }
    });
  }
  
  private sortRaces(): void {
    const races = [...this.dataSource.data];
    
    races.sort((a, b) => {
      // Convert to timestamps for comparison
      let timeA: number;
      let timeB: number;
      
      // Handle Firestore Timestamp objects
      if (a.uploadedAt) {
        // Use any type to bypass TypeScript's type checking
        const uploadedAt = a.uploadedAt as any;
        if (uploadedAt && typeof uploadedAt.toDate === 'function') {
          timeA = uploadedAt.toDate().getTime();
        } else {
          timeA = new Date(a.uploadedAt).getTime();
        }
      } else {
        timeA = 0;
      }
      
      if (b.uploadedAt) {
        // Use any type to bypass TypeScript's type checking
        const uploadedAt = b.uploadedAt as any;
        if (uploadedAt && typeof uploadedAt.toDate === 'function') {
          timeB = uploadedAt.toDate().getTime();
        } else {
          timeB = new Date(b.uploadedAt).getTime();
        }
      } else {
        timeB = 0;
      }
      
      return this.sortOrder() === 'asc' 
        ? timeA - timeB // Oldest first
        : timeB - timeA; // Newest first
    });
    
    this.dataSource.data = races;
  }
  
  onSortOrderChange(order: 'asc' | 'desc'): void {
    this.sortOrder.set(order);
    this.sortRaces();
  }
  
  private loadClaimStatus(raceId: string): void {
    // Skip if we already have a subscription for this race
    if (this.claimSubscriptions.has(raceId)) return;
    
    const subscription = this.claimService.getClaimedRaces(raceId).subscribe({
      next: (claimedRaces) => {
        // The claim service will update its internal cache
        
        // Initialize the map for this race if it doesn't exist
        if (!this.playerNames.has(raceId)) {
          this.playerNames.set(raceId, new Map<string, string>());
        }
        
        // Store player names for each claimed race
        claimedRaces.forEach(claim => {
          this.playerNames.get(raceId)?.set(claim.driverGuid, claim.playerName);
        });
      },
      error: (error) => {
        console.error(`Error loading claim status for race ${raceId}:`, error);
      }
    });
    
    this.claimSubscriptions.set(raceId, subscription);
  }
  
  // Get player name for a claimed race
  getPlayerName(raceId: string, driverGuid: string): string | null {
    if (!this.isResultClaimed(raceId, driverGuid)) return null;
    return this.playerNames.get(raceId)?.get(driverGuid) || null;
  }
  
  getValidParticipantCount(race: RaceData): number {
    if (!race.Result) return 0;
    return race.Result.filter(result => 
      result.BestLap !== 999999999 && result.TotalTime !== 0
    ).length;
  }
  
  getWinner(race: RaceData): string {
    if (!race.Result) return 'N/A';
    
    const validResults = race.Result.filter(result => 
      result.BestLap !== 999999999 && result.TotalTime !== 0
    );
    
    if (validResults.length === 0) return 'N/A';
    
    const sortedResults = [...validResults].sort((a, b) => a.TotalTime - b.TotalTime);
    return sortedResults[0].DriverName;
  }
  
  getBestLap(race: RaceData): string {
    if (!race.Result) return 'N/A';
    
    const validResults = race.Result.filter(result => 
      result.BestLap !== 999999999 && result.BestLap !== 0
    );
    
    if (validResults.length === 0) return 'N/A';
    
    const bestLap = Math.min(...validResults.map(result => result.BestLap));
    return this.formatTime(bestLap);
  }
  
  getRaceResults(race: RaceData): Result[] {
    if (!race.Result) return [];
    
    const validResults = race.Result.filter(result => 
      result.BestLap !== 999999999 && result.TotalTime !== 0
    );
    
    return [...validResults].sort((a, b) => a.TotalTime - b.TotalTime);
  }
  
  isResultClaimed(raceId: string, driverGuid: string): boolean {
    return this.claimService.isResultClaimed(raceId, driverGuid);
  }
  
  isFromCurrentSite(driverName: string): boolean {
    // Extract site name from driver name
    const siteName = this.extractSiteName(driverName);
    // Compare with current site from SiteConfigService
    const currentSite = this.siteConfigService.currentSite();
    
    // If no site is selected, or the driver is from the selected site
    return !currentSite || siteName === currentSite;
  }
  
  claimResult(race: RaceData, result: Result): void {
    // Calculate position
    const results = this.getRaceResults(race);
    const position = results.findIndex(r => r.DriverGuid === result.DriverGuid) + 1;
    
    // Extract site name from driver name
    const site = this.extractSiteName(result.DriverName) || '';
    
    // Open claim dialog
    this.dialog.open(this.claimDialogTemplate, {
      width: '500px',
      data: {
        raceId: race.id,
        driverGuid: result.DriverGuid,
        driverName: result.DriverName,
        bestLap: result.BestLap,
        totalTime: result.TotalTime,
        position: position,
        site: site
      }
    });
  }
  
  submitClaim(data: any): void {
    if (this.claimForm.invalid) return;
    
    this.submitting.set(true);
    
    const claimData: ClaimRaceData = {
      raceId: data.raceId,
      driverGuid: data.driverGuid,
      playerName: this.claimForm.value.playerName,
      playerEmail: this.claimForm.value.playerEmail,
      site: data.site
    };
    
    this.claimService.claimRace(claimData).subscribe({
      next: () => {
        this.submitting.set(false);
        this.dialog.closeAll();
        
        // Show success message or notification
        alert('Race time claimed successfully!');
      },
      error: (error) => {
        console.error('Error claiming race:', error);
        this.submitting.set(false);
        
        // Show error message
        alert('Error claiming race. Please try again.');
      }
    });
  }
  
  formatTime(timeInMs: number): string {
    if (!timeInMs || timeInMs === 999999999) return '-';
    
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    const milliseconds = Math.floor(timeInMs % 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  formatDate(timestamp: any): string {
    if (!timestamp) return 'Unknown Date';
    
    // Convert Firestore timestamp to Date if needed
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    return date.toLocaleString([], { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
  
  getDriverIcon(driverName: string): string {
    // Available icons: Fishkill_Icon.png, Patterson_Icon.png, San_Juan_Icon.png, Wallkill_Icon.png, Warwick_Icon.png
    const iconPrefixes = ['Fishkill', 'Patterson', 'San Juan', 'Wallkill', 'Warwick'];
    const iconFileNames: Record<string, string> = {
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
  
  private extractSiteName(driverName: string): string | null {
    const siteNames = ['Fishkill', 'Wallkill', 'Warwick', 'San Juan', 'Patterson'];
    for (const site of siteNames) {
      if (driverName.startsWith(site)) {
        return site;
      }
    }
    return null;
  }
}
