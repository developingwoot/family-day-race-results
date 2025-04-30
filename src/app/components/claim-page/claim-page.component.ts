import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ClaimService, ClaimRaceData } from '../../services/claim.service';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { RaceData, Result } from '../../models/race-data';
import { Subscription } from 'rxjs';

interface ClaimToken {
  raceId: string;
  driverGuid: string;
  site: string;
  timestamp: number;
}

@Component({
  selector: 'app-claim-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="claim-container">
      <mat-card class="claim-card">
        <mat-card-header>
          <mat-card-title>Claim Your Race Time</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          @if (loading()) {
            <div class="loading-spinner">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading race details...</p>
            </div>
          } @else if (error()) {
            <div class="error-message">
              <mat-icon>error</mat-icon>
              <p>{{ error() }}</p>
              <button mat-button color="primary" routerLink="/">Return to Home</button>
            </div>
          } @else if (claimed()) {
            <div class="success-message">
              <mat-icon>check_circle</mat-icon>
              <h3>Race Time Claimed!</h3>
              <p>Thank you, {{ playerName() }}!</p>
              <p>Your race time has been successfully claimed.</p>
              
              <div class="race-details">
                <p><strong>Site:</strong> {{ site() }}</p>
                <p><strong>Driver:</strong> {{ driverName() }}</p>
                <p><strong>Best Lap:</strong> {{ formatTime(bestLap()) }}</p>
                <p><strong>Total Time:</strong> {{ formatTime(totalTime()) }}</p>
              </div>
              
              <button mat-raised-button color="primary" routerLink="/">View Results</button>
            </div>
          } @else {
            <div class="race-details-section">
              <div class="site-badge">
                <img [src]="getSiteIcon(site())" class="site-icon" alt="Site Icon">
                <span>{{ site() }}</span>
              </div>
              
              <h3>Race Details</h3>
              <p><strong>Position:</strong> {{ position() }}</p>
              <p><strong>Driver:</strong> {{ driverName() }}</p>
              <p><strong>Best Lap:</strong> {{ formatTime(bestLap()) }}</p>
              <p><strong>Total Time:</strong> {{ formatTime(totalTime()) }}</p>
              
              <!-- User is logged in, show claim form -->
              <form [formGroup]="claimForm" (ngSubmit)="submitClaim()">
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
                
                <div class="form-actions">
                  <button mat-raised-button color="primary" type="submit" [disabled]="claimForm.invalid || submitting()">
                    @if (submitting()) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      Claim This Race Time
                    }
                  </button>
                </div>
              </form>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .claim-container {
      display: flex;
      justify-content: center;
      padding: 20px;
      max-width: 100%;
      box-sizing: border-box;
    }
    
    .claim-card {
      width: 100%;
      max-width: 500px;
    }
    
    @media (max-width: 600px) {
      .claim-container {
        padding: 10px;
      }
      
      .claim-card {
        width: 100%;
        max-width: none;
      }
      
      mat-card-header {
        padding: 12px;
      }
      
      mat-card-content {
        padding: 0 12px 12px;
      }
      
      .loading-spinner {
        padding: 20px;
      }
      
      .error-message mat-icon,
      .success-message mat-icon {
        font-size: 36px;
        height: 36px;
        width: 36px;
        margin-bottom: 12px;
      }
      
      .race-details {
        padding: 10px;
        margin: 15px 0;
      }
      
      .site-badge {
        margin-bottom: 15px;
      }
      
      button[type="submit"] {
        width: 100%;
      }
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
    
    .success-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
      color: #4CAF50;
    }
    
    .success-message mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
    }
    
    .race-details {
      margin: 20px 0;
      padding: 15px;
      border-radius: 4px;
      background-color: #f5f5f5;
      width: 100%;
      text-align: left;
    }
    
    .site-badge {
      display: flex;
      align-items: center;
      background-color: #f5f5f5;
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
    
    .form-actions {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }
    
    button[type="submit"] {
      min-width: 200px;
    }
    
    .auth-required-section {
      margin-top: 24px;
    }
    
    .auth-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin: 24px 0;
    }
    
    .auth-message mat-icon {
      font-size: 36px;
      height: 36px;
      width: 36px;
      margin-bottom: 16px;
      color: #3f51b5;
    }
    
    .auth-actions {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin-top: 24px;
    }
  `]
})
export class ClaimPageComponent implements OnInit, OnDestroy {
  protected route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private claimService = inject(ClaimService);
  private dataService = inject(DataService);
  protected authService = inject(AuthService);
  
  loading = signal(true);
  error = signal<string | null>(null);
  claimed = signal(false);
  submitting = signal(false);
  
  // Race details
  raceId = signal<string | null>(null);
  driverGuid = signal<string | null>(null);
  site = signal<string>('');
  position = signal(0);
  driverName = signal('');
  bestLap = signal(0);
  totalTime = signal(0);
  
  // Form data
  playerName = signal('');
  
  claimForm: FormGroup = this.fb.group({
    playerName: ['', Validators.required],
    playerEmail: ['', Validators.email]
  });
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  ngOnInit(): void {
    // Get token from URL
    const queryParamsSub = this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (!token) {
        this.error.set('Invalid claim link. No token provided.');
        this.loading.set(false);
        return;
      }
      
      try {
        // Decode token
        const claimToken: ClaimToken = JSON.parse(atob(token));
        
        // Validate token
        if (!claimToken.raceId || !claimToken.driverGuid || !claimToken.site) {
          this.error.set('Invalid claim token. Missing required information.');
          this.loading.set(false);
          return;
        }
        
        // Check if token is expired (24 hours)
        const tokenAge = Date.now() - claimToken.timestamp;
        if (tokenAge > 24 * 60 * 60 * 1000) {
          this.error.set('This claim link has expired. Please request a new one.');
          this.loading.set(false);
          return;
        }
        
        // Store token data
        this.raceId.set(claimToken.raceId);
        this.driverGuid.set(claimToken.driverGuid);
        this.site.set(claimToken.site);
        
        // Check if already claimed
        const claimedRacesSub = this.claimService.getClaimedRaces(claimToken.raceId).subscribe({
          next: (claimedRaces) => {
            const isClaimed = this.claimService.isResultClaimed(claimToken.raceId, claimToken.driverGuid);
            
            if (isClaimed) {
              this.error.set('This race time has already been claimed.');
              this.loading.set(false);
              return;
            }
            
            // Load race details
            this.loadRaceDetails(claimToken.raceId, claimToken.driverGuid);
          },
          error: (err) => {
            console.error('Error checking claim status:', err);
            this.error.set('Error checking claim status. Please try again.');
            this.loading.set(false);
          }
        });
        
        this.subscriptions.push(claimedRacesSub);
        
      } catch (err) {
        console.error('Error parsing claim token:', err);
        this.error.set('Invalid claim link. Please try again.');
        this.loading.set(false);
      }
    });
    
    this.subscriptions.push(queryParamsSub);
  }
  
  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  private loadRaceDetails(raceId: string, driverGuid: string): void {
    const raceDetailsSub = this.dataService.getRaceById(raceId).subscribe({
      next: (race: RaceData | null) => {
        if (!race) {
          this.error.set('Race not found. It may have been deleted.');
          this.loading.set(false);
          return;
        }
        
        // Find the driver's result
        const result = race.Result?.find(r => r.DriverGuid === driverGuid);
        
        if (!result) {
          this.error.set('Driver result not found in this race.');
          this.loading.set(false);
          return;
        }
        
        // Set race details
        this.driverName.set(result.DriverName);
        this.bestLap.set(result.BestLap);
        this.totalTime.set(result.TotalTime);
        
        // Calculate position
        const validResults = race.Result.filter(r => 
          r.BestLap !== 999999999 && r.TotalTime !== 0
        );
        
        const sortedResults = [...validResults].sort((a, b) => a.TotalTime - b.TotalTime);
        const position = sortedResults.findIndex(r => r.DriverGuid === driverGuid) + 1;
        this.position.set(position);
        
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading race details:', err);
        this.error.set('Error loading race details. Please try again.');
        this.loading.set(false);
      }
    });
    
    this.subscriptions.push(raceDetailsSub);
  }
  
  submitClaim(): void {
    if (this.claimForm.invalid) return;
    
    this.submitting.set(true);
    
    const claimData: ClaimRaceData = {
      raceId: this.raceId() || '',
      driverGuid: this.driverGuid() || '',
      playerName: this.claimForm.value.playerName,
      playerEmail: this.claimForm.value.playerEmail,
      site: this.site()
    };
    
    const claimRaceSub = this.claimService.claimRace(claimData).subscribe({
      next: (claimId) => {
        this.playerName.set(claimData.playerName);
        this.claimed.set(true);
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Error claiming race:', err);
        this.error.set('Error claiming race. Please try again.');
        this.submitting.set(false);
      }
    });
    
    this.subscriptions.push(claimRaceSub);
  }
  
  formatTime(timeInMs: number): string {
    if (!timeInMs) return '-';
    
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    const milliseconds = Math.floor(timeInMs % 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
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
