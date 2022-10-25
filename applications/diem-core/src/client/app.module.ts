import { APP_BASE_HREF } from '@angular/common';
import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule, Title } from '@angular/platform-browser';
import { StoreModule } from '@ngrx/store';
import { AppCoreModule } from './app.core.module';
import { AppErrorHandler } from './app.exception';
import { AppInit } from './app.init';
import { AppRouting } from './app.routing';
import { AppSharedModule } from './app.shared.module';
import { SiteBodyComponent } from './site/site.body.component';
import { SiteModule } from './site/site.module';
import { SiteStore } from './site/site.store';
import { TitleService } from './app.title.service';
import { appConfig } from './app.config';
import './styles.scss';

export const initApp: any = (appInit: AppInit) => (): void => appInit.initializeApp();

@NgModule({
    bootstrap: [SiteBodyComponent],
    declarations: [SiteBodyComponent],
    imports: [
        AppCoreModule.forRoot(),
        AppRouting,
        AppSharedModule,
        BrowserAnimationsModule,
        BrowserModule,
        SiteModule,
        StoreModule.forRoot(
            {
                siteStore: SiteStore,
            },
            {
                runtimeChecks: {
                    strictActionImmutability: true,
                    strictActionSerializability: true,
                    strictStateImmutability: true,
                    strictStateSerializability: true,
                },
            }
        ),
    ],
    providers: [
        Title,
        { provide: APP_BASE_HREF, useValue: appConfig.apppath },
        { provide: APP_INITIALIZER, useFactory: initApp, deps: [AppInit], multi: true },
        { provide: ErrorHandler, useClass: AppErrorHandler },
    ],
})
export class AppModule {
    public constructor(titleService: TitleService) {
        titleService.init();
    }
}
