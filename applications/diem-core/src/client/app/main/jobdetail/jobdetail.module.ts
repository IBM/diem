import { NgModule } from '@angular/core';
import { MainSharedModule } from '../main.shared.module';
import { MainCommonFunctions } from '../main.common.functions';
import { JobDetailComponent } from './jobdetail.component';

@NgModule({
    declarations: [JobDetailComponent],
    imports: [MainSharedModule],
    providers: [MainCommonFunctions],
})
export class JobDetailModule {}
