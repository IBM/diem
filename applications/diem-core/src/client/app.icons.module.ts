import { NgModule } from '@angular/core';
import {
    AddModule,
    CloseModule,
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
        AppSwitcherModule,
        NotificationModule,
        UserAvatarModule,
        DataConnectedModule,
        ChevronLeftModule,
        ChevronRightModule,
    ],
})
export class AppIconsModule {}
