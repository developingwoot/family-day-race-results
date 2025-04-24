import { Injectable, inject, signal } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  signOut, 
  user, 
  User 
} from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  
  currentUser = signal<User | null>(null);
  isAuthenticated = signal(false);

  constructor() {
    // Subscribe to auth state changes
    user(this.auth).subscribe(user => {
      this.currentUser.set(user);
      this.isAuthenticated.set(!!user);
    });
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