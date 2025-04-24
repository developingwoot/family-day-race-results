import { Injectable, inject, signal } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  signOut, 
  user, 
  User 
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);
  authInitialized = signal(false);

  constructor() {
    // Subscribe to auth state changes
    user(this.auth).subscribe(user => {
      this.currentUser.set(user);
      this.isAuthenticated.set(!!user);
      this.authInitialized.set(true);
    });
    
    // Auto-login with environment credentials
    this.autoLogin();
  }

  private async autoLogin(): Promise<void> {
    try {
      if (environment.auth?.email && environment.auth?.password) {
        console.log('Attempting auto-login with environment credentials');
        await this.login(environment.auth.email, environment.auth.password);
      }
    } catch (error) {
      console.error('Auto-login failed:', error);
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
}
