import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const claimGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // Wait for auth to be initialized
  if (!authService.authInitialized()) {
    // Return true to allow the navigation to proceed
    // The component will handle the redirection once auth is initialized
    return true;
  }
  
  // If user is authenticated, allow access to claim page
  if (authService.isAuthenticated()) {
    return true;
  }
  
  // If not authenticated, redirect to login page with return URL and token
  const token = route.queryParams['token'];
  router.navigate(['/login'], { 
    queryParams: { 
      returnUrl: '/claim',
      token: token 
    }
  });
  
  return false;
};
