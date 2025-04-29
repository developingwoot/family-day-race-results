import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const homeGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Wait for auth to be initialized
  if (!authService.authInitialized()) {
    // Return true to allow the navigation to proceed
    // The component will handle the redirection once auth is initialized
    return true;
  }
  
  // If user is authenticated, redirect to results page
  if (authService.isAuthenticated()) {
    router.navigate(['/results']);
    return false;
  }
  
  // If not authenticated, redirect to login page
  router.navigate(['/login']);
  return false;
};
