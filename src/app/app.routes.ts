import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import {CitizenComponent} from './pages/citizen/citizen';
import {authGuard} from '././core/guards/auth-guard';
import {OfficerDashboardComponent} from './pages/officer/dashboard/officer-dashboard';
import {AdminDashboardComponent} from './pages/admin/dashboard/admin-dashboard';
import {ResetPasswordComponent} from  './pages/reset-password/reset-password';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

   { path: 'citizen', component: CitizenComponent, canMatch: [authGuard] },
    { path: 'officer-dashboard', component: OfficerDashboardComponent, canMatch: [authGuard] },
    { path: 'admin-dashboard', component: AdminDashboardComponent, canMatch: [authGuard] },
    { path: 'reset-password', component: ResetPasswordComponent },

//   { path: 'citizen', canMatch: [authGuard], loadComponent: () => import('./pages/citizen/home.component') },
//   { path: 'officer', canMatch: [officerGuard], loadComponent: () => import('./pages/officer/home.component') },
//   { path: 'admin', canMatch: [adminGuard], loadComponent: () => import('./pages/admin/home.component') },

    {
      path: '',
      pathMatch: 'full',
      loadComponent: () =>
        import('./pages/homePage/homePage').then(m => m.HomeComponent),
    },
];

