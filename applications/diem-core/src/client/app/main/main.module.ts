import { StoreReducer } from '@mydiem/diem-forms';
import { NgModule } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { HomeModule } from '../home/home.module';
import { MainComponent } from './main.component';
import { MainModuleResolver } from './main.module.resolver';
import { MainParamResolver } from './main.param.resolver';
import { MainRouterService } from './main.router.service';
import { MainRouting } from './main.routing';
import { MainRoutingGuard } from './main.routing.guard';
import { JobDetailRoutingGuard } from './jobdetail.routing.guard';
import { MainSharedModule } from './main.shared.module';
import { JobDetailModule } from './jobdetail/jobdetail.module';
import { JobAllModule } from './joball/joball.module';
import { SettingsModule } from './settings/settings.module';

@NgModule({
    declarations: [MainComponent],
    exports: [],
    imports: [
        HomeModule,
        MainRouting,
        MainSharedModule,
        JobDetailModule,
        JobAllModule,
        SettingsModule,
        StoreModule.forFeature('coverage', StoreReducer),
    ],
    providers: [MainRoutingGuard, MainRouterService, MainModuleResolver, MainParamResolver, JobDetailRoutingGuard],
})
export class MainModule {}
