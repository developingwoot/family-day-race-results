import { Component, inject, OnInit, OnDestroy, signal, effect, runInInjectionContext } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router, RouterModule } from '@angular/router';
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
  selector: 'app-tournament-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatSnackBarModule,
    MatRadioModule,
    MatSlideToggleModule,
    RouterModule
  ],
  template: `
    <div class="tournament-config-container">
      <div class="header-actions">
        <a mat-button routerLink="/admin">
          <mat-icon>arrow_back</mat-icon> Back to Admin
        </a>
      </div>
      
      <h1>Tournament Configuration</h1>
      
      <form [formGroup]="tournamentForm" (ngSubmit)="saveTournament()">
        <!-- Tournament Type Selection -->
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
        
        <!-- Basic Information -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Basic Information</mat-card-title>
          </mat-card-header>
          
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tournament Name</mat-label>
              <input matInput formControlName="name" required>
              @if (tournamentForm.get('name')?.hasError('required')) {
                <mat-error>Tournament name is required</mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tournament Date</mat-label>
              <input matInput [matDatepicker]="datePicker" formControlName="date" required>
              <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
              <mat-datepicker #datePicker></mat-datepicker>
              @if (tournamentForm.get('date')?.hasError('required')) {
                <mat-error>Tournament date is required</mat-error>
              }
            </mat-form-field>
          </mat-card-content>
        </mat-card>
        
        <!-- Qualifying Configuration -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Qualifying Period</mat-card-title>
          </mat-card-header>
          
          <mat-card-content>
            <div class="date-time-section">
              @if (tournamentForm.get('tournamentType')?.value === 'singleDay') {
                <!-- Single Day Qualifying -->
                <div class="time-range">
                  <mat-form-field appearance="outline">
                    <mat-label>Qualifying Start Time</mat-label>
                    <input matInput type="time" formControlName="qualifyingStartTime" required>
                    @if (tournamentForm.get('qualifyingStartTime')?.hasError('required')) {
                      <mat-error>Start time is required</mat-error>
                    }
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Qualifying End Time</mat-label>
                    <input matInput type="time" formControlName="qualifyingEndTime" required>
                    @if (tournamentForm.get('qualifyingEndTime')?.hasError('required')) {
                      <mat-error>End time is required</mat-error>
                    }
                  </mat-form-field>
                </div>
                @if (tournamentForm.hasError('qualifyingTimeSequenceInvalid')) {
                  <mat-error class="sequence-error">Qualifying end time must be after start time</mat-error>
                }
              } @else {
                <!-- Multi-Day Qualifying -->
                <div class="date-range">
                  <mat-form-field appearance="outline">
                    <mat-label>Start Date</mat-label>
                    <input matInput [matDatepicker]="qualifyingStartPicker" formControlName="qualifyingStart" required>
                    <mat-datepicker-toggle matSuffix [for]="qualifyingStartPicker"></mat-datepicker-toggle>
                    <mat-datepicker #qualifyingStartPicker></mat-datepicker>
                    @if (tournamentForm.get('qualifyingStart')?.hasError('required')) {
                      <mat-error>Qualifying start date is required</mat-error>
                    }
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>End Date</mat-label>
                    <input matInput [matDatepicker]="qualifyingEndPicker" formControlName="qualifyingEnd" required>
                    <mat-datepicker-toggle matSuffix [for]="qualifyingEndPicker"></mat-datepicker-toggle>
                    <mat-datepicker #qualifyingEndPicker></mat-datepicker>
                    @if (tournamentForm.get('qualifyingEnd')?.hasError('required')) {
                      <mat-error>Qualifying end date is required</mat-error>
                    }
                  </mat-form-field>
                </div>
                @if (tournamentForm.hasError('qualifyingDateSequenceInvalid')) {
                  <mat-error class="sequence-error">Qualifying end date must be after start date</mat-error>
                }
              }
            </div>
          </mat-card-content>
        </mat-card>
        
        <!-- Site Configuration -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Site Configuration</mat-card-title>
          </mat-card-header>
          
          <mat-card-content>
            <div class="sites-selection">
              <h3>Select Sites to Include</h3>
              
              <div class="sites-checkboxes" formGroupName="sites">
                @for (site of availableSites(); track site) {
                  <mat-checkbox [formControlName]="site">{{ site }}</mat-checkbox>
                }
              </div>
              
              @if (atLeastOneSiteRequired()) {
                <mat-error>At least one site must be selected</mat-error>
              }
            </div>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Qualifiers Per Site</mat-label>
              <input matInput type="number" min="1" max="10" formControlName="qualifiersPerSite" required>
              <mat-hint>Number of top drivers from each site that will advance</mat-hint>
              @if (tournamentForm.get('qualifiersPerSite')?.hasError('required')) {
                <mat-error>Number of qualifiers per site is required</mat-error>
              }
              @if (tournamentForm.get('qualifiersPerSite')?.hasError('min')) {
                <mat-error>Must be at least 1</mat-error>
              }
              @if (tournamentForm.get('qualifiersPerSite')?.hasError('max')) {
                <mat-error>Cannot exceed 10</mat-error>
              }
            </mat-form-field>
          </mat-card-content>
        </mat-card>
        
        <!-- Heat Races Configuration -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Heat Races</mat-card-title>
          </mat-card-header>
          
          <mat-card-content>
            @if (tournamentForm.get('tournamentType')?.value === 'singleDay') {
              <!-- Single Day Heat Races -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Heat Races Start Time</mat-label>
                <input matInput type="time" formControlName="heatsStartTime" required>
                @if (tournamentForm.get('heatsStartTime')?.hasError('required')) {
                  <mat-error>Heat races start time is required</mat-error>
                }
              </mat-form-field>
              @if (tournamentForm.hasError('heatsAfterQualifyingInvalid')) {
                <mat-error class="sequence-error">Heat races must start after qualifying ends</mat-error>
              }
            } @else {
              <!-- Multi-Day Heat Races -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Heat Races Start Date</mat-label>
                <input matInput [matDatepicker]="heatsStartPicker" formControlName="heatsStart" required>
                <mat-datepicker-toggle matSuffix [for]="heatsStartPicker"></mat-datepicker-toggle>
                <mat-datepicker #heatsStartPicker></mat-datepicker>
                @if (tournamentForm.get('heatsStart')?.hasError('required')) {
                  <mat-error>Heat races start date is required</mat-error>
                }
              </mat-form-field>
              @if (tournamentForm.hasError('heatsAfterQualifyingInvalid')) {
                <mat-error class="sequence-error">Heat races must start after qualifying ends</mat-error>
              }
            }
          </mat-card-content>
        </mat-card>
        
        <!-- Final Race Configuration -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Grand Final</mat-card-title>
          </mat-card-header>
          
          <mat-card-content>
            @if (tournamentForm.get('tournamentType')?.value === 'singleDay') {
              <!-- Single Day Final Race -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Final Race Start Time</mat-label>
                <input matInput type="time" formControlName="finalStartTime" required>
                @if (tournamentForm.get('finalStartTime')?.hasError('required')) {
                  <mat-error>Final race start time is required</mat-error>
                }
              </mat-form-field>
              @if (tournamentForm.hasError('finalAfterHeatsInvalid')) {
                <mat-error class="sequence-error">Final race must start after heat races</mat-error>
              }
            } @else {
              <!-- Multi-Day Final Race -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Final Race Date</mat-label>
                <input matInput [matDatepicker]="finalStartPicker" formControlName="finalStart" required>
                <mat-datepicker-toggle matSuffix [for]="finalStartPicker"></mat-datepicker-toggle>
                <mat-datepicker #finalStartPicker></mat-datepicker>
                @if (tournamentForm.get('finalStart')?.hasError('required')) {
                  <mat-error>Final race date is required</mat-error>
                }
              </mat-form-field>
              @if (tournamentForm.hasError('finalAfterHeatsInvalid')) {
                <mat-error class="sequence-error">Final race must start after heat races</mat-error>
              }
            }
          </mat-card-content>
        </mat-card>
        
        <div class="form-actions">
          <button mat-button type="button" routerLink="/admin">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="tournamentForm.invalid">
            Create Tournament
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .tournament-config-container {
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
    
    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }
    
    .date-range, .time-range {
      display: flex;
      gap: 20px;
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
      margin-bottom: 20px;
    }
    
    .sites-checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 30px;
    }
  `]
})
export class TournamentConfigComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private tournamentService = inject(TournamentService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  
  tournamentForm!: FormGroup;
  availableSites = signal<string[]>(['Fishkill', 'Patterson', 'San Juan', 'Wallkill', 'Warwick']);
  isSingleDay = signal<boolean>(false);
  
  // Subscription to track and clean up
  private formSubscription?: Subscription;
  
  // Create the tournament type effect in the constructor
  constructor() {
    // Initialize the form first
    this.initForm();
    
    // Now set up the effect in the constructor (which is an injection context)
    effect(() => {
      if (this.tournamentForm) {
        const tournamentType = this.tournamentForm.get('tournamentType')?.value;
        this.isSingleDay.set(tournamentType === 'singleDay');
      }
    });
  }
  
  ngOnInit(): void {
    // Form is already initialized in the constructor
  }
  
  ngOnDestroy(): void {
    // Clean up subscription when component is destroyed
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }
  
  private initForm(): void {
    // Create sites form group with a checkbox for each site
    const sitesGroup: Record<string, boolean> = {};
    this.availableSites().forEach(site => {
      sitesGroup[site] = false;
    });
    
    // Get today's date for defaults
    const today = new Date();
    
    // Default times for single-day tournament
    const qualifyingStartTime = '09:00'; // 9:00 AM
    const qualifyingEndTime = '12:00';   // 12:00 PM
    const heatsStartTime = '13:00';      // 1:00 PM
    const finalStartTime = '15:00';      // 3:00 PM
    
    this.tournamentForm = this.fb.group({
      tournamentType: ['multiDay'], // Default to multi-day tournament
      name: ['', Validators.required],
      date: [today, Validators.required],
      
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
      
      sites: this.fb.group(sitesGroup),
      qualifiersPerSite: [1, [Validators.required, Validators.min(1), Validators.max(10)]]
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
    this.formSubscription = this.tournamentForm.get('tournamentType')?.valueChanges.subscribe(type => {
      this.tournamentForm.updateValueAndValidity();
    });
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
  
  atLeastOneSiteRequired(): boolean {
    const sitesGroup = this.tournamentForm.get('sites') as FormGroup;
    return sitesGroup && Object.values(sitesGroup.value).every(selected => !selected);
  }
  
  saveTournament(): void {
    if (this.tournamentForm.invalid || this.atLeastOneSiteRequired()) {
      // Mark all fields as touched to trigger validation messages
      this.tournamentForm.markAllAsTouched();
      return;
    }
    
    // Extract selected sites
    const sitesGroup = this.tournamentForm.get('sites')?.value || {};
    const sitesIncluded = Object.keys(sitesGroup).filter(site => sitesGroup[site]);
    
    // Get tournament type
    const isSingleDay = this.tournamentForm.get('tournamentType')?.value === 'singleDay';
    
    // Get tournament date
    const tournamentDate = new Date(this.tournamentForm.get('date')?.value);
    
    // Prepare tournament data
    let tournamentData: Partial<Tournament>;
    
    if (isSingleDay) {
      // For single-day tournament, use the tournament date and add times
      const qualifyingStartTime = this.tournamentForm.get('qualifyingStartTime')?.value;
      const qualifyingEndTime = this.tournamentForm.get('qualifyingEndTime')?.value;
      const heatsStartTime = this.tournamentForm.get('heatsStartTime')?.value;
      const finalStartTime = this.tournamentForm.get('finalStartTime')?.value;
      
      // Create date objects with the tournament date and specified times
      const qualifyingStart = this.combineDateTime(tournamentDate, qualifyingStartTime);
      const qualifyingEnd = this.combineDateTime(tournamentDate, qualifyingEndTime);
      const heatsStart = this.combineDateTime(tournamentDate, heatsStartTime);
      const finalStart = this.combineDateTime(tournamentDate, finalStartTime);
      
      tournamentData = {
        tournamentType: 'singleDay',
        name: this.tournamentForm.get('name')?.value,
        date: tournamentDate,
        qualifyingStart,
        qualifyingEnd,
        sitesIncluded,
        qualifiersPerSite: this.tournamentForm.get('qualifiersPerSite')?.value,
        heatsStart,
        finalStart
      };
    } else {
      // For multi-day tournament, use the separate date fields
      tournamentData = {
        tournamentType: 'multiDay',
        name: this.tournamentForm.get('name')?.value,
        date: tournamentDate,
        qualifyingStart: this.tournamentForm.get('qualifyingStart')?.value,
        qualifyingEnd: this.tournamentForm.get('qualifyingEnd')?.value,
        sitesIncluded,
        qualifiersPerSite: this.tournamentForm.get('qualifiersPerSite')?.value,
        heatsStart: this.tournamentForm.get('heatsStart')?.value,
        finalStart: this.tournamentForm.get('finalStart')?.value
      };
    }
    
    // Create the tournament
    this.tournamentService.createTournament(tournamentData).subscribe({
      next: (tournamentId: string) => {
        this.snackBar.open('Tournament created successfully!', 'Close', {
          duration: 3000
        });
        
        // Navigate to tournament details page
        this.router.navigate(['/tournament']);
      },
      error: (error: unknown) => {
        console.error('Error creating tournament:', error);
        this.snackBar.open('Error creating tournament. Please try again.', 'Close', {
          duration: 3000
        });
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
}
