import { APP_BASE_HREF } from '@angular/common';
import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule, Title } from '@angular/platform-browser';
import { StoreModule } from '@ngrx/store';
import { AppCoreModule } from './app.core.module';
import { AppErrorHandler } from './app.exception';
import { AppRouting } from './app.routing';
import { AppSharedModule } from './app.shared.module';
import { HelpComponent } from './app/help/help.component';
import { SiteBodyComponent } from './app/site/site.body.component';
import { SiteModule } from './app/site/site.module';
import { HomeModule } from './app/home/home.module';
import { SiteStore } from './app/site/site.store';
import { TitleService } from './app.title.service';
import { appConfig } from './app.config';
import { AppParamResolver } from './app.param.resolver';
import './styles.scss';

@NgModule({
    bootstrap: [SiteBodyComponent],
    declarations: [HelpComponent, SiteBodyComponent],
    imports: [
        AppCoreModule.forRoot(),
        AppRouting,
        AppSharedModule,
        BrowserAnimationsModule,
        BrowserModule,
        SiteModule,
        HomeModule,
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
            },
        ),
    ],
    providers: [
        AppParamResolver,
        Title,
        { provide: APP_BASE_HREF, useValue: appConfig.apppath },
        { provide: ErrorHandler, useClass: AppErrorHandler },
    ],
})
export class AppModule {
    public constructor(titleService: TitleService) {
        titleService.init();
    }
}
