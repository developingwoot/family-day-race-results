import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { RaceService } from './race.service';
import { SiteStats } from '../models/site-stats';
import { DriverStats } from '../models/driver-stats';
import { RaceData } from '../models/race-data';

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private raceService = inject(RaceService);
  
  // Signal for site statistics
  private siteStatsSignal = signal<SiteStats[]>([]);
  
  // Signal for driver statistics
  private driverStatsSignal = signal<DriverStats[]>([]);
  
  constructor() {
    // Initialize site stats calculation when races change
    this.initSiteStatsCalculation();
  }
  
  private initSiteStatsCalculation(): void {
    // Create an effect to recalculate stats when races change
    effect(() => {
      const races = this.raceService.getAllRaces()();
      const siteStats = this.calculateSiteStats(races);
      this.siteStatsSignal.set(siteStats);
    });
  }
  
  // Get site stats as a signal
  getSiteStats() {
    return this.siteStatsSignal;
  }
  
  // Calculate site statistics from race data
  private calculateSiteStats(races: RaceData[]): SiteStats[] {
    // Initialize stats for each driver
    const siteStats: Record<string, SiteStats> = {
      'Fishkill': this.initSiteStats('Fishkill'),
      'Wallkill': this.initSiteStats('Wallkill'),
      'Warwick': this.initSiteStats('Warwick'),
      'San Juan': this.initSiteStats('San Juan'),
      'Patterson': this.initSiteStats('Patterson')
    };
    
    // Process each race
    races.forEach(race => {
      if (!race.Result) return;
      
      // First, count total races for each site (without lap completion restriction)
      race.Result.forEach(result => {
        // Skip invalid times: 999999999 (no valid lap) and 0 (didn't participate)
        if (result.TotalTime !== 999999999 && result.TotalTime !== 0) {
          const driverPrefix = this.extractDriverPrefix(result.DriverName);
          if (driverPrefix && siteStats[driverPrefix]) {
            // Increment total races
            siteStats[driverPrefix].totalRaces++;
          }
        }
      });
      
      // Then, calculate place finishes with lap completion restriction
      if (!race.Laps) return;
      
      const sortedResults = [...race.Result]
        .filter(result => {
          // Filter out invalid times
          if (result.TotalTime === 999999999 || result.TotalTime === 0) {
            return false;
          }
          
          // Count how many laps this driver completed
          const driverLaps = race.Laps.filter(lap => lap.DriverGuid === result.DriverGuid);
          const lapCount = driverLaps.length;
          
          // Check if all laps have 0 cuts
          const allLapsHaveZeroCuts = driverLaps.every(lap => lap.Cuts === 0);
          
          // Only include drivers who completed at least the required number of laps
          // and have no cuts on any lap
          return lapCount >= race.RaceLaps && allLapsHaveZeroCuts;
        })
        .sort((a, b) => a.TotalTime - b.TotalTime);
      
      // Count only 1st, 2nd, and 3rd place finishes
      sortedResults.forEach((result, index) => {
        if (index > 2) return; // Only process first 3 positions
        
        // Extract driver prefix (e.g., "Fishkill" from "Fishkill Driver 1")
        const driverPrefix = this.extractDriverPrefix(result.DriverName);
        
        if (driverPrefix && siteStats[driverPrefix]) {
          // Increment placement count based on position
          switch (index) {
            case 0: siteStats[driverPrefix].firstPlaceCount++; break;
            case 1: siteStats[driverPrefix].secondPlaceCount++; break;
            case 2: siteStats[driverPrefix].thirdPlaceCount++; break;
          }
        }
      });
    });
    
    // Convert to array and return
    return Object.values(siteStats);
  }
  
  private initSiteStats(driverName: string): SiteStats {
    return {
      driverName,
      firstPlaceCount: 0,
      secondPlaceCount: 0,
      thirdPlaceCount: 0,
      totalRaces: 0
    };
  }
  
  private extractDriverPrefix(driverName: string): string | null {
    const prefixes = ['Fishkill', 'Wallkill', 'Warwick', 'San Juan', 'Patterson'];
    for (const prefix of prefixes) {
      if (driverName.startsWith(prefix)) {
        return prefix;
      }
    }
    return null;
  }
}
