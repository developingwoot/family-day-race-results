import { Injectable, inject, signal, runInInjectionContext, Injector } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signOut, 
  user, 
  User,
  getIdTokenResult
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private injector = inject(Injector);
  
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);
  authInitialized = signal(false);
  isAdmin = signal(false);

  constructor() {
    // Subscribe to auth state changes
    user(this.auth).subscribe(async user => {
      this.currentUser.set(user);
      this.isAuthenticated.set(!!user);
      
      // Check for admin claims if user is authenticated
      if (user) {
        const isAdmin = await this.checkAdminClaims(user);
        this.isAdmin.set(isAdmin);
      } else {
        this.isAdmin.set(false);
      }
      
      this.authInitialized.set(true);
    });
    
    // Auto-login with environment credentials
    this.autoLogin();
  }

  private async autoLogin(): Promise<void> {
    try {
      // Only auto-login in development environment
      if (!environment.production && environment.auth?.email && environment.auth?.password) {
        console.log('Development mode: Attempting auto-login with environment credentials');
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
  
  async register(email: string, password: string, displayName: string): Promise<void> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Update the user's display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
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
  
  /**
   * Checks if the current user has admin privileges
   * This checks for Firebase custom claims or admin role
   */
  async checkAdminClaims(user: User): Promise<boolean> {
    try {
      // Get the ID token result which contains custom claims
      const idTokenResult = await runInInjectionContext(this.injector, () => {
        return getIdTokenResult(user);
      });
      
      // Check for admin claim in custom claims
      if (idTokenResult.claims['admin'] === true) {
        return true;
      }
      
      // Check for owner or Firebase Admin role in custom claims
      if (idTokenResult.claims['role'] === 'owner' || idTokenResult.claims['role'] === 'firebaseAdmin') {
        return true;
      }
      
      // Fallback to email check for development/testing purposes
      // In production, you would remove this and rely solely on custom claims
      const adminEmails = ['admin@example.com', 'admin@familyday.com', 'wooten.joseph@gmail.com'];
      return adminEmails.includes(user.email || '');
      
    } catch (error) {
      console.error('Error checking admin claims:', error);
      return false;
    }
  }
}
