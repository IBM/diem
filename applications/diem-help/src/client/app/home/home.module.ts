import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppSharedModule } from '../../app.shared.module';
import { HomeMainComponent } from './home.main.component';

@NgModule({
    declarations: [HomeMainComponent],
    exports: [HomeMainComponent],
    imports: [CommonModule, AppSharedModule],
})
export class HomeModule {}
