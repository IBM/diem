import {
    AppErrorComponent,
    ForbiddenComponent,
    NotFoundComponent,
    UnauthorizedComponent,
} from '@mydiem/diem-angular-util/lib/pages';
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HelpComponent } from './app/help/help.component';
import { HomeMainComponent } from './app/home/home.main.component';
import { AppParamResolver } from './app.param.resolver';

const appConfig: Routes = [
    { component: AppErrorComponent, path: '500', data: { title: 'Application Error' } },
    { component: ForbiddenComponent, path: '403', data: { title: 'Forbidden' } },
    { component: HelpComponent, path: 'help', data: { title: 'Help' } },
    { component: NotFoundComponent, path: '404', data: { title: 'Not Found' } },
    { component: UnauthorizedComponent, path: '401', data: { title: 'Not Authorized' } },
    { component: HomeMainComponent, path: '', pathMatch: 'full', data: { title: 'Welcome' } },
    {
        component: HomeMainComponent,
        path: ':id',
        data: {
            title: 'Welcome',
        },
        resolve: {
            params: AppParamResolver,
        },
    },
];

@NgModule({
    exports: [RouterModule],
    imports: [RouterModule.forRoot(appConfig, { preloadingStrategy: PreloadAllModules })],
})
export class AppRouting {}
