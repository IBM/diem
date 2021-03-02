/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/indent */
import {
    AppErrorComponent,
    ForbiddenComponent,
    NotFoundComponent,
    UnauthorizedComponent,
} from '@mydiem/diem-angular-util/lib/pages';
import { RouterModule, Routes } from '@angular/router';
import { HomeMainComponent } from '../home/home.main.component';
import { MainComponent } from './main.component';
import { MainModuleResolver } from './main.module.resolver';
import { MainParamResolver } from './main.param.resolver';
import { MainRoutingGuard } from './main.routing.guard';
import { JobDetailRoutingGuard } from './jobdetail.routing.guard';
import { JobDetailComponent } from './jobdetail/jobdetail.component';
import { JobAllComponent } from './joball/joball.component';
import { SettingsComponent } from './settings/settings.component';
import { appRoutes, matchIntegrations, matchSettings, matchAdmin } from './../../app.config';

const MainRoutes: Routes = [
    {
        children: [
            {
                /**
                 * this is the base path of the module, from here we redirect the user to the right
                 * route
                 */
                path: appRoutes.pathempty.path,
                pathMatch: 'full',
                redirectTo: appRoutes.pathempty.redirect,
            },
            { component: UnauthorizedComponent, path: '401', data: { title: 'Not Authorized' } },
            { component: NotFoundComponent, path: 'jobdetail/404', data: { title: 'Not Found' } },
            { component: NotFoundComponent, path: '404', data: { title: 'Not Found' } },
            { component: ForbiddenComponent, path: 'jobdetail/403', data: { title: 'Not Authorized' } },
            { component: ForbiddenComponent, path: '403', data: { title: 'Forbidden' } },
            { component: AppErrorComponent, path: '500', data: { title: 'Application Error' } },
            { component: AppErrorComponent, path: 'jobdetail/500', data: { title: 'Application Error' } },
            { component: HomeMainComponent, path: 'home', data: { title: 'Home' } },

            {
                canActivate: [MainRoutingGuard],
                component: JobAllComponent,
                data: { ...appRoutes.jobs.data },
                path: appRoutes.jobs.path,
                resolve: {
                    component: MainModuleResolver,
                    params: MainParamResolver,
                },
            },
            {
                canActivate: [JobDetailRoutingGuard],
                component: SettingsComponent,
                data: { ...appRoutes.interactive.data },
                path: appRoutes.interactive.path,
                resolve: {
                    component: MainModuleResolver,
                    params: MainParamResolver,
                },
            },
            {
                canActivate: [MainRoutingGuard],
                component: JobDetailComponent,
                data: { ...appRoutes.jobnew.data },
                path: appRoutes.jobnew.path,
                resolve: {
                    component: MainModuleResolver,
                    params: MainParamResolver,
                },
            },
            {
                canActivate: [MainRoutingGuard],
                component: JobAllComponent,
                data: { ...appRoutes.joblog.data },
                path: appRoutes.joblog.path,
                resolve: {
                    component: MainModuleResolver,
                    params: MainParamResolver,
                },
            },
            {
                canActivate: [JobDetailRoutingGuard],
                component: JobDetailComponent,
                data: { ...appRoutes.jobdetail.data },
                path: appRoutes.jobdetail.path,
                resolve: {
                    component: MainModuleResolver,
                    params: MainParamResolver,
                },
            },
            {
                matcher: matchIntegrations,
                canActivate: [MainRoutingGuard],
                component: SettingsComponent,
                data: { ...appRoutes.integrations.data },
                resolve: {
                    params: MainParamResolver,
                },
            },
            {
                matcher: matchSettings,
                canActivate: [MainRoutingGuard],
                component: SettingsComponent,
                data: { ...appRoutes.settings.data },
                resolve: {
                    params: MainParamResolver,
                },
            },
            {
                matcher: matchAdmin,
                canActivate: [MainRoutingGuard],
                component: SettingsComponent,
                data: { ...appRoutes.admin.data },
                resolve: {
                    params: MainParamResolver,
                },
            },
            {
                /**
                 * this is the path for all others so no not found will be displayed
                 * the user will just be redirected to this page
                 */
                path: appRoutes.pathothers.path,
                redirectTo: appRoutes.pathothers.redirect,
            },
        ],
        component: MainComponent,
        path: appRoutes.home.path,
    },
];

export const MainRouting: any = RouterModule.forChild(MainRoutes);
