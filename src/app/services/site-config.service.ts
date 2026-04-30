import { Injectable, inject, signal } from '@angular/core';
import { SitesService } from './sites.service';

@Injectable({
  providedIn: 'root'
})
export class SiteConfigService {
  private readonly SITE_CONFIG_KEY = 'race-site-config';
  private sitesService = inject(SitesService);

  readonly currentSite = signal<string | null>(null);

  constructor() {
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
    const validSites = this.sitesService.availableSites();
    if (validSites.length > 0 && !validSites.includes(site)) {
      console.error('Invalid site:', site);
      return;
    }
    localStorage.setItem(this.SITE_CONFIG_KEY, JSON.stringify({ site }));
    this.currentSite.set(site);
  }

  clearSite(): void {
    localStorage.removeItem(this.SITE_CONFIG_KEY);
    this.currentSite.set(null);
  }
}
