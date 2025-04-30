import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { RaceVisualizationComponent } from '../race-visualization/race-visualization.component';

export interface RaceVisualizationDialogData {
  raceType: 'heat' | 'final';
  heatNumber?: number;
  participants: any[];
  onComplete: (results: any[]) => void;
}

@Component({
  selector: 'app-race-visualization-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    RaceVisualizationComponent
  ],
  template: `
    <div class="race-dialog-container">
      <h2 mat-dialog-title>
        {{ data.raceType === 'heat' ? 'Heat Race ' + data.heatNumber : 'Grand Final' }}
      </h2>
      
      <div mat-dialog-content>
        <app-race-visualization
          [raceType]="data.raceType"
          [heatNumber]="data.heatNumber"
          [raceParticipants]="data.participants"
          [onComplete]="handleRaceComplete"
        ></app-race-visualization>
      </div>
      
      <div mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Close</button>
      </div>
    </div>
  `,
  styles: [`
    .race-dialog-container {
      min-width: 600px;
      max-width: 800px;
    }
    
    h2 {
      margin-bottom: 16px;
    }
  `]
})
export class RaceVisualizationDialogComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<RaceVisualizationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RaceVisualizationDialogData
  ) {}
  
  ngOnInit(): void {}
  
  // Create a bound version of the onComplete callback
  handleRaceComplete = (results: any[]) => {
    // Call the provided onComplete callback
    this.data.onComplete(results);
    
    // Close the dialog after a short delay
    setTimeout(() => {
      this.dialogRef.close(results);
    }, 1000);
  };
}
