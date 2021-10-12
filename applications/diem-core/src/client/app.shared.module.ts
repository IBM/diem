import { NgModule } from '@angular/core';
import { AppPages, Directives, DTS, HttpService } from '@mydiem/diem-angular-util';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import {
    ButtonModule,
    GridModule,
    TabsModule,
    ModalModule,
    NotificationModule,
    LoadingModule,
} from 'carbon-components-angular';
import { TermsComponent } from './app/terms/terms.component';
import { MessagesComponent } from './app/messages/messages.component';
import { AppIconsModule } from './app.icons.module';
import { SiteService } from './site/site.service';

@NgModule({
    declarations: [TermsComponent, MessagesComponent],
    exports: [AppPages, Directives, CommonModule, LoadingModule, MessagesComponent, ModalModule, AppIconsModule],
    imports: [
        AppIconsModule,
        AppPages,
        ButtonModule,
        CommonModule,
        Directives,
        GridModule,
        HttpClientModule,
        LoadingModule,
        ModalModule,
        TabsModule,
        NotificationModule,
    ],
    providers: [DTS, HttpClientModule, HttpService, SiteService],
})
export class AppSharedModule {}
