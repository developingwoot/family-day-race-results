import { Component, inject, OnInit, OnDestroy } from '@angular/core';
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
  selector: 'app-register',
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
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <div class="logo-container">
            <img src="assets/race_logo.png" alt="Race Logo" class="logo">
          </div>
          <mat-card-title>Create an Account</mat-card-title>
          <mat-card-subtitle>Join Five Site Racing</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Display Name</mat-label>
              <input matInput formControlName="displayName" required>
              <mat-error *ngIf="registerForm.get('displayName')?.hasError('required')">
                Display name is required
              </mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" required>
              <mat-error *ngIf="registerForm.get('email')?.hasError('required')">
                Email is required
              </mat-error>
              <mat-error *ngIf="registerForm.get('email')?.hasError('email')">
                Please enter a valid email address
              </mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" required>
              <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="registerForm.get('password')?.hasError('required')">
                Password is required
              </mat-error>
              <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">
                Password must be at least 6 characters
              </mat-error>
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input matInput formControlName="confirmPassword" [type]="hideConfirmPassword ? 'password' : 'text'" required>
              <button mat-icon-button matSuffix (click)="hideConfirmPassword = !hideConfirmPassword" type="button">
                <mat-icon>{{ hideConfirmPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="registerForm.get('confirmPassword')?.hasError('required')">
                Please confirm your password
              </mat-error>
              <mat-error *ngIf="registerForm.hasError('passwordMismatch')">
                Passwords do not match
              </mat-error>
            </mat-form-field>
            
            <div class="error-message" *ngIf="errorMessage">
              {{ errorMessage }}
            </div>
            
            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="registerForm.invalid || isLoading">
                <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
                <span *ngIf="!isLoading">Create Account</span>
              </button>
            </div>
          </form>
          
          <mat-divider class="divider"></mat-divider>
          
          <div class="additional-actions">
            <span>Already have an account?</span>
            <a mat-button [routerLink]="['/login']" [queryParams]="{returnUrl: returnUrl, token: returnToken}">Sign in</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 64px);
      padding: 20px;
    }
    
    .register-card {
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
      min-width: 150px;
    }
    
    .divider {
      margin: 24px 0;
    }
    
    .additional-actions {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class RegisterComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  returnUrl: string = '/results';
  returnToken: string | null = null;
  
  registerForm: FormGroup = this.fb.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });
  
  isLoading = false;
  errorMessage = '';
  hidePassword = true;
  hideConfirmPassword = true;
  
  private queryParamsSubscription: Subscription | null = null;
  
  ngOnInit(): void {
    // Get return URL from route parameters or default to '/results'
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/results';
      this.returnToken = params['token'] || null;
    });
  }
  
  ngOnDestroy(): void {
    // Clean up the subscription when the component is destroyed
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
  }
  
  onSubmit(): void {
    if (this.registerForm.invalid) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const { email, password, displayName } = this.registerForm.value;
    
    this.authService.register(email, password, displayName)
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
        console.error('Registration error:', error);
        this.errorMessage = this.getErrorMessage(error);
      })
      .finally(() => {
        this.isLoading = false;
      });
  }
  
  private passwordMatchValidator(form: FormGroup): { [key: string]: boolean } | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    return password === confirmPassword ? null : { passwordMismatch: true };
  }
  
  private getErrorMessage(error: any): string {
    // Handle different Firebase auth error codes
    switch(error.code) {
      case 'auth/email-already-in-use':
        return 'This email is already in use';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/weak-password':
        return 'Password is too weak';
      default:
        return 'An error occurred during registration. Please try again.';
    }
  }
}
