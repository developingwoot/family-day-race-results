import { Component, inject, OnDestroy, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { DataService } from './services/data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  title = 'family-day-race-results';
  
  private dataService = inject(DataService);
  private subscription?: Subscription;
  
  totalRaces = signal<number>(0);
  
  constructor() {
    this.subscription = this.dataService.getAllRacesStream().subscribe({
      next: (races) => {
        this.totalRaces.set(races.length);
      },
      error: (error) => {
        console.error('Error getting races:', error);
      }
    });
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
