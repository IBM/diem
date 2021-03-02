import { NgModule } from '@angular/core';
import {
    AddModule,
    CloseModule,
    LaunchModule,
    NotificationModule,
    UserAvatarModule,
    AppSwitcherModule,
    DataConnectedModule,
    ChevronLeftModule,
    ChevronRightModule,
} from '@carbon/icons-angular';

@NgModule({
    imports: [
        AddModule,
        CloseModule,
        LaunchModule,
        AppSwitcherModule,
        NotificationModule,
        UserAvatarModule,
        DataConnectedModule,
        ChevronLeftModule,
        ChevronRightModule,
    ],
    exports: [
        AddModule,
        CloseModule,
        LaunchModule,
        AppSwitcherModule,
        NotificationModule,
        UserAvatarModule,
        DataConnectedModule,
        ChevronLeftModule,
        ChevronRightModule,
    ],
})
export class AppIconsModule {}
