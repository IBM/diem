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
    SideNavModule,
} from 'carbon-components-angular';
import { AppIconModule } from '@mydiem/diem-forms';
import { MessagesComponent } from './app/messages/messages.component';

@NgModule({
    declarations: [MessagesComponent],
    exports: [
        AppPages,
        Directives,
        CommonModule,
        LoadingModule,
        MessagesComponent,
        ModalModule,
        AppIconModule,
        SideNavModule,
    ],
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
        TabsModule,
        NotificationModule,
        SideNavModule,
    ],
    providers: [DTS, HttpClientModule, HttpService],
})
export class AppSharedModule {}
