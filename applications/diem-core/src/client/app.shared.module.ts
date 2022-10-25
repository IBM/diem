import { NgModule } from '@angular/core';
import { AppPages, DTS, HttpService, Directives } from '@mydiem/diem-angular-util';
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
import { DFCommonService, AppIconModule } from '@mydiem/diem-forms';
import { SideMenusComponent } from './app/side_menus/side_menus.component';
import { MessagesComponent } from './app/messages/messages.component';
import { SiteService } from './site/site.service';

@NgModule({
    declarations: [SideMenusComponent, MessagesComponent],
    exports: [AppIconModule, AppPages, CommonModule, Directives, LoadingModule, MessagesComponent, ModalModule],
    imports: [
        AppIconModule,
        AppPages,
        ButtonModule,
        CommonModule,
        Directives,
        GridModule,
        HttpClientModule,
        LoadingModule,
        ModalModule,
        NotificationModule,
        TabsModule,
    ],
    providers: [DFCommonService, DTS, HttpClientModule, HttpService, SiteService],
})
export class AppSharedModule {}
