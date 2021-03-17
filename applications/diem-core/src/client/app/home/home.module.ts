import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeMainComponent } from './home.main.component';

@NgModule({
    declarations: [HomeMainComponent],
    exports: [HomeMainComponent],
    imports: [CommonModule],
})
export class HomeModule {}
