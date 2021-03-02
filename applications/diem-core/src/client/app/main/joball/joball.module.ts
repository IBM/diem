import { NgModule } from '@angular/core';
import { MainSharedModule } from '../main.shared.module';
import { MainCommonFunctions } from '../main.common.functions';
import { JobAllComponent } from './joball.component';

@NgModule({
    declarations: [JobAllComponent],
    imports: [MainSharedModule],
    providers: [MainCommonFunctions],
})
export class JobAllModule {}
