import { CommonModule } from "@angular/common";
import { Component, inject, OnDestroy, signal, ViewChild, AfterViewInit, effect } from "@angular/core";
import { DataService } from "../../services/data.service";
import { AuthService } from "../../services/auth.service";
import { SiteStats } from "../../models/site-stats";
import { catchError, EMPTY, Subscription } from "rxjs";
import { MatTableModule, MatTableDataSource } from "@angular/material/table";
import { MatSortModule, Sort, MatSort } from "@angular/material/sort";

@Component({
  selector: 'app-site-stats',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule],
  template: `
    <div class="stats-container">
      <h3>Site Place Finishes</h3>
      
      <div class="mat-elevation-z8 stats-table-container">
        <table mat-table [dataSource]="dataSource" matSort>
          <!-- Site Column -->
          <ng-container matColumnDef="driver">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Site </th>
            <td mat-cell *matCellDef="let stats"> 
              <div class="driver-cell">
                <img [src]="getDriverIcon(stats.driverName)" class="driver-icon" alt="Driver Icon">
                <span>{{ stats.driverName }}</span>
              </div>
            </td>
          </ng-container>
          
          <!-- 1st Place Column -->
          <ng-container matColumnDef="first">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> 1st </th>
            <td mat-cell *matCellDef="let stats"> {{ stats.firstPlaceCount }} </td>
          </ng-container>
          
          <!-- 2nd Place Column -->
          <ng-container matColumnDef="second">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> 2nd </th>
            <td mat-cell *matCellDef="let stats"> {{ stats.secondPlaceCount }} </td>
          </ng-container>
          
          <!-- 3rd Place Column -->
          <ng-container matColumnDef="third">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> 3rd </th>
            <td mat-cell *matCellDef="let stats"> {{ stats.thirdPlaceCount }} </td>
          </ng-container>
          
          
          <!-- Total Races Column -->
          <ng-container matColumnDef="total">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Total Races </th>
            <td mat-cell *matCellDef="let stats"> {{ stats.totalRaces }} </td>
          </ng-container>
          
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .stats-container {
      margin-bottom: 20px;
    }
    
    .stats-table-container {
      overflow-x: auto;
      margin-bottom: 20px;
    }
    
    table {
      width: 100%;
    }
    
    .driver-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .driver-icon {
      width: 40px;
      height: 40px;
      object-fit: contain;
      border-radius: 50%;
    }
  `]
})
export class SiteStatsComponent implements OnDestroy, AfterViewInit {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private subscription?: Subscription;
  
  @ViewChild(MatSort) sort!: MatSort;
  
  displayedColumns: string[] = ['driver', 'first', 'second', 'third', 'total'];
  dataSource = new MatTableDataSource<SiteStats>([]);
  
  constructor() {
    // Wait for authentication before loading data
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.loadData();
      }
    });
  }
  
  private loadData(): void {
    this.subscription = this.dataService.getSiteStatsStream()
      .pipe(
        catchError(error => {
          console.error('Error in stream:', error);
          return EMPTY;
        })
      )
      .subscribe({
        next: (stats) => {
          this.dataSource.data = stats;
        },
        error: (error) => {
          console.error('Subscription error:', error);
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
  
  getDriverIcon(driverName: string): string {
    const iconFileNames: Record<string, string> = {
      'Fishkill': 'Fishkill_Icon.png',
      'Patterson': 'Patterson_Icon.png',
      'San Juan': 'San_Juan_Icon.png',
      'Wallkill': 'Wallkill_Icon.png',
      'Warwick': 'Warwick_Icon.png'
    };
    
    return `assets/${iconFileNames[driverName] || 'helmet.jpg'}`;
  }
}
