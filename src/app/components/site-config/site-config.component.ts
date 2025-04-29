import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SiteConfigService } from '../../services/site-config.service';

@Component({
  selector: 'app-site-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <mat-card class="site-config-card">
      <mat-card-header>
        <mat-card-title>Site Configuration</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="site-selector">
          <mat-form-field appearance="outline">
            <mat-label>Current Site</mat-label>
            <mat-select [(ngModel)]="selectedSite" (selectionChange)="onSiteChange()">
              <mat-option [value]="null">All Sites</mat-option>
              @for (site of availableSites; track site) {
                <mat-option [value]="site">{{ site }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          
          <button mat-icon-button color="warn" (click)="clearSite()" *ngIf="selectedSite">
            <mat-icon>clear</mat-icon>
          </button>
        </div>
        
        <p class="site-info" *ngIf="selectedSite">
          This device is configured to show and claim race times for <strong>{{ selectedSite }}</strong>.
        </p>
        <p class="site-info" *ngIf="!selectedSite">
          This device is configured to show race times for all sites.
        </p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .site-config-card {
      margin-bottom: 20px;
      background-color: #f8f9fa;
      border-left: 4px solid #3f51b5;
    }
    
    .site-selector {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    mat-form-field {
      width: 200px;
    }
    
    .site-info {
      margin-top: 10px;
      font-size: 0.9em;
      color: #555;
    }
  `]
})
export class SiteConfigComponent {
  private siteConfigService = inject(SiteConfigService);
  
  availableSites = ['Fishkill', 'Patterson', 'San Juan', 'Wallkill', 'Warwick'];
  selectedSite: string | null = this.siteConfigService.currentSite();
  
  onSiteChange(): void {
    if (this.selectedSite) {
      this.siteConfigService.setSite(this.selectedSite);
    } else {
      this.siteConfigService.clearSite();
    }
  }
  
  clearSite(): void {
    this.selectedSite = null;
    this.siteConfigService.clearSite();
  }
}
