import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { RaceData } from '../../models/race-data';
import { MostRecentRaceComponent } from "../most-recent-race/most-recent-race.component";
import { BestRecordsComponent } from "../best-records/best-records.component";

@Component({
  selector: 'app-race-data',
  template: `
    <app-best-records></app-best-records>
    <app-most-recent-race></app-most-recent-race>
  `,
  styles: [`
    .error {
      color: red;
      padding: 1rem;
    }
  `],
  imports: [MostRecentRaceComponent, BestRecordsComponent]
})
export class RaceDataComponent {
  private authService = inject(AuthService);
  private dataService = inject(DataService);

  isLoading = signal(true);
  error = signal<string | null>(null);
  data = signal<RaceData[]>([]);

  constructor() {}
}
