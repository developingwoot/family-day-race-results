import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SitesService } from '../../../services/sites.service';

@Component({
  selector: 'app-admin-sites',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatListModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="sites-container">
      <h1>Manage Sites</h1>

      <mat-card class="add-site-card">
        <mat-card-header>
          <mat-card-title>Add Site</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="add-site-form">
            <mat-form-field appearance="outline">
              <mat-label>Site Name</mat-label>
              <input matInput [(ngModel)]="newSiteName" placeholder="e.g. Fishkill"
                     (keyup.enter)="addSite()" [disabled]="saving()">
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="addSite()"
                    [disabled]="!newSiteName.trim() || saving()">
              <mat-icon>add</mat-icon> Add Site
            </button>
          </div>
          @if (errorMessage()) {
            <p class="error-message">{{ errorMessage() }}</p>
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="sites-list-card">
        <mat-card-header>
          <mat-card-title>Sites ({{ sitesService.sites().length }})</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (sitesService.sites().length === 0) {
            <p class="empty-message">No sites configured. Add one above.</p>
          } @else {
            <mat-list>
              @for (site of sitesService.sites(); track site.id) {
                <mat-list-item>
                  <mat-icon matListItemIcon>location_on</mat-icon>
                  <span matListItemTitle>{{ site.name }}</span>
                  <button mat-icon-button color="warn" matListItemMeta
                          (click)="removeSite(site.id, site.name)"
                          [disabled]="removingId() === site.id">
                    @if (removingId() === site.id) {
                      <mat-spinner diameter="20"></mat-spinner>
                    } @else {
                      <mat-icon>delete</mat-icon>
                    }
                  </button>
                </mat-list-item>
              }
            </mat-list>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .sites-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 20px;
    }

    .add-site-card {
      margin-bottom: 20px;
    }

    .add-site-form {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-top: 8px;
    }

    mat-form-field {
      flex: 1;
    }

    .error-message {
      color: #f44336;
      font-size: 0.85em;
      margin-top: 4px;
    }

    .empty-message {
      color: rgba(255, 255, 255, 0.5);
      font-style: italic;
      padding: 8px 0;
    }

    .sites-list-card mat-list {
      padding-top: 0;
    }
  `]
})
export class AdminSitesComponent {
  protected sitesService = inject(SitesService);
  private snackBar = inject(MatSnackBar);

  newSiteName = '';
  saving = signal(false);
  removingId = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  async addSite(): Promise<void> {
    const name = this.newSiteName.trim();
    if (!name) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      await this.sitesService.addSite(name);
      this.newSiteName = '';
      this.snackBar.open(`Site "${name}" added`, 'Close', { duration: 3000 });
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Failed to add site');
    } finally {
      this.saving.set(false);
    }
  }

  async removeSite(id: string, name: string): Promise<void> {
    this.removingId.set(id);
    try {
      await this.sitesService.removeSite(id);
      this.snackBar.open(`Site "${name}" removed`, 'Close', { duration: 3000 });
    } catch {
      this.snackBar.open('Failed to remove site', 'Close', { duration: 3000 });
    } finally {
      this.removingId.set(null);
    }
  }
}
