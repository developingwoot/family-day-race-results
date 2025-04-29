import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';

export const adminGuard: CanActivateFn = (route, state): boolean => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    // Redirect to login page if not authenticated
    router.navigate(['/login']);
    return false;
  }
  
  // Check if user is an admin using the isAdmin signal
  if (!authService.isAdmin()) {
    // Redirect to home page if authenticated but not an admin
    router.navigate(['/']);
    return false;
  }
  
  return true;
};
