import { Component, inject, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { TournamentService } from '../../../services/tournament.service';
import { Tournament } from '../../../models/tournament';

// Custom validator for ensuring proper time sequence
function timeSequenceValidator(controlName1: string, controlName2: string) {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const control1 = formGroup.get(controlName1);
    const control2 = formGroup.get(controlName2);
    
    if (!control1 || !control2 || !control1.value || !control2.value) {
      return null;
    }
    
    const date1 = new Date(control1.value);
    const date2 = new Date(control2.value);
    
    if (date1 >= date2) {
      return { timeSequenceInvalid: true };
    }
    
    return null;
  };
}

@Component({
  selector: 'app-tournament-edit',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatRadioModule
  ],
  template: `
    <div class="tournament-edit-container">
      <div class="header-actions">
        <a mat-button routerLink="/admin">
          <mat-icon>arrow_back</mat-icon> Back to Admin Dashboard
        </a>
      </div>
      
      <h1>Edit Tournament</h1>
      
      @if (loading()) {
        <div class="loading-spinner">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Loading tournament details...</p>
        </div>
      } @else if (error()) {
        <div class="error-message">
          <mat-icon>error</mat-icon>
          <p>{{ error() }}</p>
          <button mat-button color="primary" routerLink="/admin">Return to Admin Dashboard</button>
        </div>
      } @else {
        <form [formGroup]="tournamentForm" (ngSubmit)="onSubmit()">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Tournament Type</mat-card-title>
            </mat-card-header>
            
            <mat-card-content>
              <div class="tournament-type-selection">
                <mat-radio-group formControlName="tournamentType" class="tournament-type-radio-group">
                  <mat-radio-button value="singleDay">Single Day Tournament</mat-radio-button>
                  <mat-radio-button value="multiDay">Multi-Day Tournament</mat-radio-button>
                </mat-radio-group>
                
                <p class="tournament-type-description">
                  @if (tournamentForm.get('tournamentType')?.value === 'singleDay') {
                    Run qualifying, heat races, and the grand finale all on the same day.
                  } @else {
                    Spread the tournament across multiple days.
                  }
                </p>
              </div>
            </mat-card-content>
          </mat-card>
          
          <mat-card>
            <mat-card-header>
              <mat-card-title>Tournament Details</mat-card-title>
            </mat-card-header>
            
            <mat-card-content>
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Tournament Name</mat-label>
                  <input matInput formControlName="name" required>
                  <mat-error *ngIf="tournamentForm.get('name')?.hasError('required')">
                    Tournament name is required
                  </mat-error>
                </mat-form-field>
              </div>
              
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Tournament Date</mat-label>
                  <input matInput [matDatepicker]="datePicker" formControlName="date" required>
                  <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
                  <mat-datepicker #datePicker></mat-datepicker>
                  <mat-error *ngIf="tournamentForm.get('date')?.hasError('required')">
                    Tournament date is required
                  </mat-error>
                </mat-form-field>
              </div>
              
              <div class="form-row sites-selection">
                <h3>Sites Included</h3>
                <div class="sites-checkboxes">
                  @for (site of availableSites; track site) {
                    <mat-checkbox [formControlName]="site">{{ site }}</mat-checkbox>
                  }
                </div>
                <mat-error *ngIf="tournamentForm.hasError('noSitesSelected')">
                  At least one site must be selected
                </mat-error>
              </div>
              
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Qualifiers Per Site</mat-label>
                  <input matInput type="number" formControlName="qualifiersPerSite" required min="1" max="10">
                  <mat-error *ngIf="tournamentForm.get('qualifiersPerSite')?.hasError('required')">
                    Number of qualifiers is required
                  </mat-error>
                  <mat-error *ngIf="tournamentForm.get('qualifiersPerSite')?.hasError('min')">
                    Must be at least 1
                  </mat-error>
                  <mat-error *ngIf="tournamentForm.get('qualifiersPerSite')?.hasError('max')">
                    Cannot exceed 10
                  </mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
          
          <mat-card class="schedule-card">
            <mat-card-header>
              <mat-card-title>Tournament Schedule</mat-card-title>
            </mat-card-header>
            
            <mat-card-content>
              @if (tournamentForm.get('tournamentType')?.value === 'singleDay') {
                <!-- Single Day Tournament Schedule -->
                <div class="form-row">
                  <h3>Qualifying Period</h3>
                  <div class="time-range">
                    <mat-form-field appearance="outline">
                      <mat-label>Qualifying Start Time</mat-label>
                      <input matInput type="time" formControlName="qualifyingStartTime" required>
                      <mat-error *ngIf="tournamentForm.get('qualifyingStartTime')?.hasError('required')">
                        Start time is required
                      </mat-error>
                    </mat-form-field>
                    
                    <mat-form-field appearance="outline">
                      <mat-label>Qualifying End Time</mat-label>
                      <input matInput type="time" formControlName="qualifyingEndTime" required>
                      <mat-error *ngIf="tournamentForm.get('qualifyingEndTime')?.hasError('required')">
                        End time is required
                      </mat-error>
                    </mat-form-field>
                  </div>
                  @if (tournamentForm.hasError('timeSequenceInvalid')) {
                    <mat-error class="sequence-error">Qualifying end time must be after start time</mat-error>
                  }
                </div>
                
                <div class="form-row">
                  <h3>Heat Races</h3>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Heat Races Start Time</mat-label>
                    <input matInput type="time" formControlName="heatsStartTime" required>
                    <mat-error *ngIf="tournamentForm.get('heatsStartTime')?.hasError('required')">
                      Heat races start time is required
                    </mat-error>
                  </mat-form-field>
                  @if (tournamentForm.hasError('heatsAfterQualifyingInvalid')) {
                    <mat-error class="sequence-error">Heat races must start after qualifying ends</mat-error>
                  }
                </div>
                
                <div class="form-row">
                  <h3>Grand Final</h3>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Final Race Start Time</mat-label>
                    <input matInput type="time" formControlName="finalStartTime" required>
                    <mat-error *ngIf="tournamentForm.get('finalStartTime')?.hasError('required')">
                      Final race start time is required
                    </mat-error>
                  </mat-form-field>
                  @if (tournamentForm.hasError('finalAfterHeatsInvalid')) {
                    <mat-error class="sequence-error">Final race must start after heat races</mat-error>
                  }
                </div>
              } @else {
                <!-- Multi-Day Tournament Schedule -->
                <div class="form-row date-range">
                  <mat-form-field appearance="outline">
                    <mat-label>Qualifying Start</mat-label>
                    <input matInput [matDatepicker]="qualifyingStartPicker" formControlName="qualifyingStart" required>
                    <mat-datepicker-toggle matSuffix [for]="qualifyingStartPicker"></mat-datepicker-toggle>
                    <mat-datepicker #qualifyingStartPicker></mat-datepicker>
                    <mat-error *ngIf="tournamentForm.get('qualifyingStart')?.hasError('required')">
                      Qualifying start date is required
                    </mat-error>
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Qualifying End</mat-label>
                    <input matInput [matDatepicker]="qualifyingEndPicker" formControlName="qualifyingEnd" required>
                    <mat-datepicker-toggle matSuffix [for]="qualifyingEndPicker"></mat-datepicker-toggle>
                    <mat-datepicker #qualifyingEndPicker></mat-datepicker>
                    <mat-error *ngIf="tournamentForm.get('qualifyingEnd')?.hasError('required')">
                      Qualifying end date is required
                    </mat-error>
                  </mat-form-field>
                </div>
                @if (tournamentForm.hasError('timeSequenceInvalid')) {
                  <mat-error class="sequence-error">Qualifying end date must be after start date</mat-error>
                }
                
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Heats Start Date</mat-label>
                    <input matInput [matDatepicker]="heatsStartPicker" formControlName="heatsStart" required>
                    <mat-datepicker-toggle matSuffix [for]="heatsStartPicker"></mat-datepicker-toggle>
                    <mat-datepicker #heatsStartPicker></mat-datepicker>
                    <mat-error *ngIf="tournamentForm.get('heatsStart')?.hasError('required')">
                      Heats start date is required
                    </mat-error>
                  </mat-form-field>
                </div>
                @if (tournamentForm.hasError('heatsAfterQualifyingInvalid')) {
                  <mat-error class="sequence-error">Heat races must start after qualifying ends</mat-error>
                }
                
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Final Race Date</mat-label>
                    <input matInput [matDatepicker]="finalStartPicker" formControlName="finalStart" required>
                    <mat-datepicker-toggle matSuffix [for]="finalStartPicker"></mat-datepicker-toggle>
                    <mat-datepicker #finalStartPicker></mat-datepicker>
                    <mat-error *ngIf="tournamentForm.get('finalStart')?.hasError('required')">
                      Final race date is required
                    </mat-error>
                  </mat-form-field>
                </div>
                @if (tournamentForm.hasError('finalAfterHeatsInvalid')) {
                  <mat-error class="sequence-error">Final race must start after heat races</mat-error>
                }
              }
            </mat-card-content>
          </mat-card>
          
          <div class="form-actions">
            <button mat-button type="button" routerLink="/admin">Cancel</button>
            <button mat-raised-button color="warn" type="button" (click)="onDelete()" [disabled]="submitting()">Delete Tournament</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="tournamentForm.invalid || submitting()">
              @if (submitting()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Save Changes
              }
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [`
    .tournament-edit-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header-actions {
      margin-bottom: 20px;
    }
    
    h1 {
      margin-bottom: 20px;
    }
    
    mat-card {
      margin-bottom: 20px;
    }
    
    .form-row {
      margin-bottom: 16px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .date-range, .time-range {
      display: flex;
      gap: 16px;
    }
    
    .date-range mat-form-field, .time-range mat-form-field {
      flex: 1;
    }
    
    .tournament-type-selection {
      margin-bottom: 15px;
    }
    
    .tournament-type-radio-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .tournament-type-description {
      font-style: italic;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .sequence-error {
      margin-top: -15px;
      margin-bottom: 15px;
      font-size: 0.75rem;
    }
    
    .sites-selection {
      margin-top: 24px;
    }
    
    .sites-checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 8px;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 24px;
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
  `]
})
export class TournamentEditComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tournamentService = inject(TournamentService);
  private snackBar = inject(MatSnackBar);
  
  tournamentId = '';
  availableSites = ['Fishkill', 'Wallkill', 'Warwick', 'San Juan', 'Patterson'];
  
  loading = signal(true);
  error = signal<string | null>(null);
  submitting = signal(false);
  isSingleDay = signal<boolean>(false);
  
  // Subscription to track and clean up
  private formSubscription?: Subscription;
  
  tournamentForm: FormGroup = this.createForm();
  
  // Create the tournament type effect in the constructor
  constructor() {
    // Set up the effect in the constructor (which is an injection context)
    effect(() => {
      if (this.tournamentForm) {
        const tournamentType = this.tournamentForm.get('tournamentType')?.value;
        this.isSingleDay.set(tournamentType === 'singleDay');
      }
    });
  }
  
  ngOnInit(): void {
    this.tournamentId = this.route.snapshot.paramMap.get('id') || '';
    
    if (!this.tournamentId) {
      this.error.set('Tournament ID is missing');
      this.loading.set(false);
      return;
    }
    
    this.loadTournament();
  }
  
  ngOnDestroy(): void {
    // Clean up subscription when component is destroyed
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }
  
  private createForm(): FormGroup {
    // Get today's date for defaults
    const today = new Date();
    
    // Default times for single-day tournament
    const qualifyingStartTime = '09:00'; // 9:00 AM
    const qualifyingEndTime = '12:00';   // 12:00 PM
    const heatsStartTime = '13:00';      // 1:00 PM
    const finalStartTime = '15:00';      // 3:00 PM
    
    const form = this.fb.group({
      tournamentType: ['multiDay'], // Default to multi-day tournament
      name: ['', Validators.required],
      date: [today, Validators.required],
      qualifiersPerSite: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
      
      // Multi-day tournament fields
      qualifyingStart: [today, Validators.required],
      qualifyingEnd: [new Date(new Date().setDate(today.getDate() + 7)), Validators.required],
      heatsStart: [new Date(new Date().setDate(today.getDate() + 8)), Validators.required],
      finalStart: [new Date(new Date().setDate(today.getDate() + 9)), Validators.required],
      
      // Single-day tournament fields
      qualifyingStartTime: [qualifyingStartTime, Validators.required],
      qualifyingEndTime: [qualifyingEndTime, Validators.required],
      heatsStartTime: [heatsStartTime, Validators.required],
      finalStartTime: [finalStartTime, Validators.required],
      
      Fishkill: [true],
      Wallkill: [true],
      Warwick: [true],
      'San Juan': [true],
      Patterson: [true]
    }, {
      validators: [
        // Validators for single-day tournament
        timeSequenceValidator('qualifyingStartTime', 'qualifyingEndTime'),
        this.validateHeatsAfterQualifying.bind(this),
        this.validateFinalAfterHeats.bind(this),
        
        // Validators for multi-day tournament
        timeSequenceValidator('qualifyingStart', 'qualifyingEnd'),
        this.validateHeatsAfterQualifyingMultiDay.bind(this),
        this.validateFinalAfterHeatsMultiDay.bind(this)
      ]
    });
    
    // Subscribe to tournament type changes to update validation
    this.formSubscription = form.get('tournamentType')?.valueChanges.subscribe(type => {
      form.updateValueAndValidity();
    });
    
    return form;
  }
  
  // Custom validators for time sequence in single-day tournament
  validateHeatsAfterQualifying(form: AbstractControl): ValidationErrors | null {
    if (form.get('tournamentType')?.value !== 'singleDay') {
      return null;
    }
    
    const qualifyingEndTime = form.get('qualifyingEndTime')?.value;
    const heatsStartTime = form.get('heatsStartTime')?.value;
    
    if (!qualifyingEndTime || !heatsStartTime) {
      return null;
    }
    
    if (heatsStartTime <= qualifyingEndTime) {
      return { heatsAfterQualifyingInvalid: true };
    }
    
    return null;
  }
  
  validateFinalAfterHeats(form: AbstractControl): ValidationErrors | null {
    if (form.get('tournamentType')?.value !== 'singleDay') {
      return null;
    }
    
    const heatsStartTime = form.get('heatsStartTime')?.value;
    const finalStartTime = form.get('finalStartTime')?.value;
    
    if (!heatsStartTime || !finalStartTime) {
      return null;
    }
    
    if (finalStartTime <= heatsStartTime) {
      return { finalAfterHeatsInvalid: true };
    }
    
    return null;
  }
  
  // Custom validators for date sequence in multi-day tournament
  validateHeatsAfterQualifyingMultiDay(form: AbstractControl): ValidationErrors | null {
    if (form.get('tournamentType')?.value !== 'multiDay') {
      return null;
    }
    
    const qualifyingEnd = form.get('qualifyingEnd')?.value;
    const heatsStart = form.get('heatsStart')?.value;
    
    if (!qualifyingEnd || !heatsStart) {
      return null;
    }
    
    const qualifyingEndDate = new Date(qualifyingEnd);
    const heatsStartDate = new Date(heatsStart);
    
    if (heatsStartDate < qualifyingEndDate) {
      return { heatsAfterQualifyingInvalid: true };
    }
    
    return null;
  }
  
  validateFinalAfterHeatsMultiDay(form: AbstractControl): ValidationErrors | null {
    if (form.get('tournamentType')?.value !== 'multiDay') {
      return null;
    }
    
    const heatsStart = form.get('heatsStart')?.value;
    const finalStart = form.get('finalStart')?.value;
    
    if (!heatsStart || !finalStart) {
      return null;
    }
    
    const heatsStartDate = new Date(heatsStart);
    const finalStartDate = new Date(finalStart);
    
    if (finalStartDate < heatsStartDate) {
      return { finalAfterHeatsInvalid: true };
    }
    
    return null;
  }
  
  private loadTournament(): void {
    this.tournamentService.getTournamentById(this.tournamentId).subscribe({
      next: (tournament) => {
        if (!tournament) {
          this.error.set('Tournament not found');
          this.loading.set(false);
          return;
        }
        
        this.populateForm(tournament);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading tournament:', err);
        this.error.set('Error loading tournament details');
        this.loading.set(false);
      }
    });
  }
  
  private populateForm(tournament: Tournament): void {
    console.log('Populating form with tournament:', tournament);
    
    // Ensure we have valid date objects
    const tournamentDate = tournament.date ? new Date(tournament.date) : new Date();
    const qualifyingStart = tournament.qualifyingStart ? new Date(tournament.qualifyingStart) : new Date();
    const qualifyingEnd = tournament.qualifyingEnd ? new Date(tournament.qualifyingEnd) : new Date();
    const heatsStart = tournament.heatsStart ? new Date(tournament.heatsStart) : new Date();
    const finalStart = tournament.finalStart ? new Date(tournament.finalStart) : new Date();
    
    console.log('Date objects:', {
      tournamentDate,
      qualifyingStart,
      qualifyingEnd,
      heatsStart,
      finalStart
    });
    
    // Use the explicit tournament type field
    const isSingleDay = tournament.tournamentType === 'singleDay';
    console.log('Tournament type:', tournament.tournamentType, 'Is single day:', isSingleDay);
    
    // Set the tournament type
    this.tournamentForm.get('tournamentType')?.setValue(tournament.tournamentType || 'multiDay');
    
    // Common fields
    this.tournamentForm.patchValue({
      name: tournament.name,
      date: tournamentDate,
      qualifiersPerSite: tournament.qualifiersPerSite
    });
    
    // Reset form validation
    this.tournamentForm.markAsPristine();
    this.tournamentForm.markAsUntouched();
    
    // Force update the form after a short delay to ensure Angular has time to process the type change
    setTimeout(() => {
      if (isSingleDay) {
        // For single-day tournament, extract times
        console.log('Setting single-day times');
        this.tournamentForm.patchValue({
          qualifyingStartTime: this.formatTimeForInput(qualifyingStart),
          qualifyingEndTime: this.formatTimeForInput(qualifyingEnd),
          heatsStartTime: this.formatTimeForInput(heatsStart),
          finalStartTime: this.formatTimeForInput(finalStart)
        });
      } else {
        // For multi-day tournament, use dates
        console.log('Setting multi-day dates');
        this.tournamentForm.patchValue({
          qualifyingStart: qualifyingStart,
          qualifyingEnd: qualifyingEnd,
          heatsStart: heatsStart,
          finalStart: finalStart
        });
      }
      
      // Set site checkboxes based on included sites
      this.availableSites.forEach(site => {
        this.tournamentForm.get(site)?.setValue(tournament.sitesIncluded.includes(site));
      });
      
      // Force Angular to detect changes
      this.tournamentForm.updateValueAndValidity();
    }, 100);
  }
  
  // Helper method to format a date as HH:MM for time input
  private formatTimeForInput(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  onSubmit(): void {
    if (this.tournamentForm.invalid) return;
    
    this.submitting.set(true);
    
    // Get selected sites
    const selectedSites = this.availableSites.filter(site => this.tournamentForm.get(site)?.value);
    
    if (selectedSites.length === 0) {
      this.tournamentForm.setErrors({ noSitesSelected: true });
      this.submitting.set(false);
      return;
    }
    
    const formValue = this.tournamentForm.value;
    const isSingleDay = formValue.tournamentType === 'singleDay';
    
    let tournamentData: Partial<Tournament>;
    
    if (isSingleDay) {
      // For single-day tournament, combine date and times
      const tournamentDate = new Date(formValue.date);
      
      const qualifyingStart = this.combineDateTime(tournamentDate, formValue.qualifyingStartTime);
      const qualifyingEnd = this.combineDateTime(tournamentDate, formValue.qualifyingEndTime);
      const heatsStart = this.combineDateTime(tournamentDate, formValue.heatsStartTime);
      const finalStart = this.combineDateTime(tournamentDate, formValue.finalStartTime);
      
      tournamentData = {
        tournamentType: 'singleDay',
        name: formValue.name,
        date: tournamentDate,
        qualifiersPerSite: formValue.qualifiersPerSite,
        qualifyingStart,
        qualifyingEnd,
        heatsStart,
        finalStart,
        sitesIncluded: selectedSites
      };
    } else {
      // For multi-day tournament, use the date fields directly
      tournamentData = {
        tournamentType: 'multiDay',
        name: formValue.name,
        date: formValue.date,
        qualifiersPerSite: formValue.qualifiersPerSite,
        qualifyingStart: formValue.qualifyingStart,
        qualifyingEnd: formValue.qualifyingEnd,
        heatsStart: formValue.heatsStart,
        finalStart: formValue.finalStart,
        sitesIncluded: selectedSites
      };
    }
    
    this.tournamentService.updateTournament(this.tournamentId, tournamentData).subscribe({
      next: () => {
        this.snackBar.open('Tournament updated successfully', 'Close', { duration: 3000 });
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        console.error('Error updating tournament:', err);
        this.snackBar.open('Error updating tournament', 'Close', { duration: 3000 });
        this.submitting.set(false);
      }
    });
  }
  
  // Helper method to combine a date and time string into a Date object
  private combineDateTime(date: Date, timeString: string): Date {
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      // Create a new date object to avoid modifying the original
      const result = new Date(date.getTime());
      result.setHours(hours, minutes, 0, 0);
      return result;
    } catch (error) {
      console.error('Error combining date and time:', error);
      // Return the original date if there's an error
      return date;
    }
  }
  
  onDelete(): void {
    if (confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      this.submitting.set(true);
      
      this.tournamentService.deleteTournament(this.tournamentId).subscribe({
        next: () => {
          this.snackBar.open('Tournament deleted successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/admin']);
        },
        error: (err) => {
          console.error('Error deleting tournament:', err);
          this.snackBar.open('Error deleting tournament', 'Close', { duration: 3000 });
          this.submitting.set(false);
        }
      });
    }
  }
}
