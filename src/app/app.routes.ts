import { Routes } from '@angular/router';
import { RaceDataComponent } from './components/race-data.component/race-data.component';
import { ClaimPageComponent } from './components/claim-page/claim-page.component';
import { TournamentDetailsComponent } from './components/tournament-details/tournament-details.component';
import { RaceHistoryComponent } from './components/race-history/race-history.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { TournamentConfigComponent } from './components/admin/tournament-config/tournament-config.component';
import { TournamentEditComponent } from './components/admin/tournament-edit/tournament-edit.component';
import { TournamentSimulatorComponent } from './components/admin/tournament-simulator/tournament-simulator.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin/admin.guard';
import { homeGuard } from './guards/home.guard';
import { loginGuard } from './guards/login.guard';
import { registerGuard } from './guards/register.guard';
import { claimGuard } from './guards/claim.guard';

export const routes: Routes = [
    // Default route with smart redirection based on auth state
    {path: '', component: HomeComponent, canActivate: [homeGuard]},
    
    // Auth routes
    {path: 'login', component: LoginComponent, canActivate: [loginGuard]},
    {path: 'register', component: RegisterComponent, canActivate: [registerGuard]},
    
    // Public routes
    {path: 'results', component: RaceDataComponent},
    {path: 'claim', component: ClaimPageComponent, canActivate: [claimGuard]},
    
    // Protected routes
    {path: 'tournament', component: TournamentDetailsComponent, canActivate: [authGuard]},
    {path: 'history', component: RaceHistoryComponent, canActivate: [authGuard]},
    
    // Admin routes
    {path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard, adminGuard]},
    {path: 'admin/tournament/new', component: TournamentConfigComponent, canActivate: [authGuard, adminGuard]},
    {path: 'admin/tournament/edit/:id', component: TournamentEditComponent, canActivate: [authGuard, adminGuard]},
    {path: 'admin/tournament/simulator', component: TournamentSimulatorComponent, canActivate: [authGuard, adminGuard]}
];
