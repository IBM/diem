import { NgModule } from '@angular/core';
import { MainSharedModule } from '../main.shared.module';
import { MainCommonFunctions } from '../main.common.functions';
import { SettingsComponent } from './settings.component';

@NgModule({
    declarations: [SettingsComponent],
    imports: [MainSharedModule],
    providers: [MainCommonFunctions],
})
export class SettingsModule {}
