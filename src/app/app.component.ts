import { Component, inject, OnDestroy, signal, effect } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CommonModule } from '@angular/common';
import { DataService } from './services/data.service';
import { SiteConfigService } from './services/site-config.service';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterLink,
    RouterLinkActive,
    MatToolbarModule, 
    MatButtonModule, 
    MatSelectModule,
    MatFormFieldModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatMenuModule,
    CommonModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnDestroy {
  title = 'family-day-race-results';
  
  private dataService = inject(DataService);
  protected siteConfigService = inject(SiteConfigService);
  protected authService = inject(AuthService);
  private router = inject(Router);
  private subscription?: Subscription;
  
  totalRaces = signal<number>(0);
  availableSites = signal<string[]>(['Fishkill', 'Patterson', 'San Juan', 'Wallkill', 'Warwick']);
  sidenavExpanded = signal(true);
  
  navItems = [
    { path: 'results', icon: 'home', label: 'Race Results', requiresAuth: false },
    { path: 'history', icon: 'history', label: 'Race History', requiresAuth: true },
    { path: 'tournament', icon: 'emoji_events', label: 'Tournament', requiresAuth: true },
    { path: 'admin', icon: 'admin_panel_settings', label: 'Admin', requiresAuth: true, requiresAdmin: true }
  ];
  
  visibleNavItems = signal<Array<{path: string, icon: string, label: string, requiresAuth: boolean, requiresAdmin?: boolean}>>([]);
  
  private updateVisibleNavItems(): void {
    const filteredItems = this.navItems.filter(item => 
      (!item.requiresAuth || this.authService.isAuthenticated()) &&
      (!item.requiresAdmin || this.authService.isAdmin())
    );
    this.visibleNavItems.set(filteredItems);
  }
  
  constructor() {
    this.subscription = this.dataService.getAllRacesStream().subscribe({
      next: (races) => {
        this.totalRaces.set(races.length);
      },
      error: (error) => {
        console.error('Error getting races:', error);
      }
    });
    
    // Initialize visible nav items
    this.updateVisibleNavItems();
    
    // Create an effect to update nav items when auth state or admin status changes
    effect(() => {
      // Access the signals to create dependencies
      const isAuth = this.authService.isAuthenticated();
      const isAdmin = this.authService.isAdmin();
      // Update the nav items
      this.updateVisibleNavItems();
    });
  }
  
  toggleSidenav(): void {
    this.sidenavExpanded.update(state => !state);
  }
  
  onSiteChange(site: string | null): void {
    if (site) {
      this.siteConfigService.setSite(site);
    } else {
      this.siteConfigService.clearSite();
    }
  }
  
  logout(): void {
    this.authService.logout()
      .then(() => {
        this.router.navigate(['/login']);
      })
      .catch(error => {
        console.error('Logout error:', error);
      });
  }
  
  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }
}
