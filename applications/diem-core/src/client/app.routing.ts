import {
    AppErrorComponent,
    ForbiddenComponent,
    NotFoundComponent,
    UnauthorizedComponent,
} from '@mydiem/diem-angular-util/lib/pages';
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AppRoutingGuard } from './app.routing.guard';
import { SideMenusComponent } from './app/side_menus/side_menus.component';

const appConfig: Routes = [
    { component: UnauthorizedComponent, path: '401', data: { title: 'Not Authorized' } },
    { component: ForbiddenComponent, path: '403', data: { title: 'Forbidden' } },
    { component: NotFoundComponent, path: '404', data: { title: 'Not Found' } },
    { component: AppErrorComponent, path: '500', data: { title: 'Application Error' } },
    { component: SideMenusComponent, path: 'help', data: { title: 'Help', value: 'help' } },
    { component: SideMenusComponent, path: 'privacy', data: { title: 'Privacy', value: 'privacy' } },
    { component: SideMenusComponent, path: 'terms', data: { title: 'Terms', value: 'terms' } },

    {
        canLoad: [AppRoutingGuard],
        loadChildren: async (): Promise<any> => import('./app/main/main.module').then((m) => m.MainModule),
        path: '',
    },
];

@NgModule({
    exports: [RouterModule],
    imports: [RouterModule.forRoot(appConfig, { preloadingStrategy: PreloadAllModules })],
})
export class AppRouting {}
