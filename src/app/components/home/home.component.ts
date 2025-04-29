import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div>Redirecting...</div>
  `,
  styles: [`
    div {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-size: 1.2rem;
    }
  `]
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  
  ngOnInit(): void {
    // This is a fallback in case the guard doesn't redirect
    // Wait for auth to be initialized
    if (this.authService.authInitialized()) {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/results']);
      } else {
        this.router.navigate(['/login']);
      }
    } else {
      // Set up a subscription to wait for auth to be initialized
      const checkAuth = () => {
        if (this.authService.authInitialized()) {
          if (this.authService.isAuthenticated()) {
            this.router.navigate(['/results']);
          } else {
            this.router.navigate(['/login']);
          }
        } else {
          // Check again in 100ms
          setTimeout(checkAuth, 100);
        }
      };
      
      // Start checking
      checkAuth();
    }
  }
}
