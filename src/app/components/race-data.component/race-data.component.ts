import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { SiteConfigService } from '../../services/site-config.service';
import { MostRecentRaceComponent } from "../most-recent-race/most-recent-race.component";
import { BestRecordsComponent } from "../best-records/best-records.component";
import { SiteStatsComponent } from "../site-stats/site-stats.component";
import { TournamentStatusComponent } from "../tournament-status/tournament-status.component";

@Component({
  selector: 'app-race-data',
  standalone: true,
  imports: [
    MostRecentRaceComponent, 
    BestRecordsComponent, 
    SiteStatsComponent,
    TournamentStatusComponent
  ],
  template: `
    @if (tournamentActive() && authService.isAuthenticated()) {
      <app-tournament-status></app-tournament-status>
    }
    
    <app-best-records></app-best-records>
    <app-most-recent-race [currentSite]="siteConfigService.currentSite()"></app-most-recent-race>
    <app-site-stats></app-site-stats>
  `,
  styles: [`
    .error {
      color: red;
      padding: 1rem;
    }
  `]
})
export class RaceDataComponent implements OnDestroy {
  protected authService = inject(AuthService);
  private dataService = inject(DataService);
  protected siteConfigService = inject(SiteConfigService);
  
  tournamentActive = signal(false);
  
  // Subscription to track and clean up
  private tournamentSubscription?: Subscription;
  
  constructor() {
    // Subscribe to tournament active status
    this.tournamentSubscription = this.dataService.isTournamentActive$.subscribe(active => {
      this.tournamentActive.set(active);
    });
  }
  
  ngOnDestroy(): void {
    // Clean up subscription when component is destroyed
    if (this.tournamentSubscription) {
      this.tournamentSubscription.unsubscribe();
    }
  }
}
