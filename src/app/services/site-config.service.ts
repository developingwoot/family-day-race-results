import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SiteConfigService {
  private readonly SITE_CONFIG_KEY = 'race-site-config';
  
  // Use signal for reactive updates
  readonly currentSite = signal<string | null>(null);
  
  constructor() {
    // Load site configuration from local storage
    this.loadSiteConfig();
  }
  
  private loadSiteConfig(): void {
    const storedConfig = localStorage.getItem(this.SITE_CONFIG_KEY);
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        this.currentSite.set(config.site);
      } catch (e) {
        console.error('Error parsing site config:', e);
      }
    } else {
      // Check URL parameters if search string exists
      if (window.location.search) {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const siteParam = urlParams.get('site');
          if (siteParam) {
            this.setSite(siteParam);
          }
        } catch (e) {
          console.error('Error parsing URL parameters:', e);
        }
      }
    }
  }
  
  setSite(site: string): void {
    // Validate site
    const validSites = ['Fishkill', 'Patterson', 'San Juan', 'Wallkill', 'Warwick'];
    if (!validSites.includes(site)) {
      console.error('Invalid site:', site);
      return;
    }
    
    // Save to local storage
    localStorage.setItem(this.SITE_CONFIG_KEY, JSON.stringify({ site }));
    
    // Update signal
    this.currentSite.set(site);
  }
  
  clearSite(): void {
    localStorage.removeItem(this.SITE_CONFIG_KEY);
    this.currentSite.set(null);
  }
}
