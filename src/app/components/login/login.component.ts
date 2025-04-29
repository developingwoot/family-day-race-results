
import { Component, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="logo-container">
            <img src="assets/race_logo.png" alt="Race Logo" class="logo">
          </div>
          <mat-card-title>Five Site Racing</mat-card-title>
          <mat-card-subtitle>Sign in to your account</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" required>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
                Email is required
              </mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
                Please enter a valid email address
              </mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" required>
              <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                Password is required
              </mat-error>
            </mat-form-field>
            
            <div class="error-message" *ngIf="errorMessage">
              {{ errorMessage }}
            </div>
            
            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="loginForm.invalid || isLoading">
                <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                <span *ngIf="!isLoading">Sign In</span>
              </button>
            </div>
          </form>
          
          <mat-divider class="divider"></mat-divider>
          
          <div class="additional-actions">
            <a mat-button [routerLink]="['/register']" [queryParams]="{returnUrl: returnUrl, token: returnToken}">Create an account</a>
            <a mat-button routerLink="/results">Continue as guest</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 64px);
      padding: 20px;
    }
    
    .login-card {
      width: 100%;
      max-width: 400px;
    }
    
    .logo-container {
      display: flex;
      justify-content: center;
      width: 100%;
      margin-bottom: 16px;
    }
    
    .logo {
      width: 80px;
      height: 80px;
    }
    
    mat-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 20px;
    }
    
    mat-card-title {
      margin-top: 8px;
    }
    
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }
    
    .error-message {
      color: #f44336;
      margin: 8px 0 16px;
      text-align: center;
    }
    
    .form-actions {
      display: flex;
      justify-content: center;
      margin: 24px 0;
    }
    
    .form-actions button {
      min-width: 120px;
    }
    
    .divider {
      margin: 24px 0;
    }
    
    .additional-actions {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  
  returnUrl: string = '/results';
  returnToken: string | null = null;
  
  isLoading = false;
  errorMessage = '';
  hidePassword = true;
  
  private queryParamsSubscription: Subscription | null = null;
  
  // Create an effect that runs when auth is initialized
  authCheckEffect = effect(() => {
    // Only proceed if auth is initialized
    if (this.authService.authInitialized()) {
      // If user is authenticated, redirect
      if (this.authService.isAuthenticated()) {
        // Navigate to return URL with token if available
        if (this.returnUrl === '/claim' && this.returnToken) {
          this.router.navigate([this.returnUrl], { 
            queryParams: { token: this.returnToken } 
          });
        } else {
          this.router.navigate([this.returnUrl]);
        }
      }
    }
  });
  
  ngOnInit(): void {
    // Get return URL from route parameters or default to '/results'
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/results';
      this.returnToken = params['token'] || null;
    });
  }
  
  onSubmit(): void {
    if (this.loginForm.invalid) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const { email, password } = this.loginForm.value;
    
    this.authService.login(email, password)
      .then(() => {
        // Navigate to return URL with token if available
        if (this.returnUrl === '/claim' && this.returnToken) {
          this.router.navigate([this.returnUrl], { 
            queryParams: { token: this.returnToken } 
          });
        } else {
          this.router.navigate([this.returnUrl]);
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        this.errorMessage = this.getErrorMessage(error);
      })
      .finally(() => {
        this.isLoading = false;
      });
  }
  
  private getErrorMessage(error: any): string {
    // Handle different Firebase auth error codes
    switch(error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Please try again later.';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      default:
        return 'An error occurred during login. Please try again.';
    }
  }
  
  ngOnDestroy(): void {
    // Clean up the subscription when the component is destroyed
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
  }
}
