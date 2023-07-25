// modules
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';

// imports

// icon imports
import ChevronLeft20 from '@carbon/icons/es/chevron--left/20';
import ChevronRight20 from '@carbon/icons/es/chevron--right/20';
import Close20 from '@carbon/icons/es/close/20';
import DataConnected20 from '@carbon/icons/es/data--connected/20';
import Launch20 from '@carbon/icons/es/launch/20';
import Notification20 from '@carbon/icons/es/notification/20';
import OpenPanelFilledRight from '@carbon/icons/es/open-panel--filled--right/20';
import Switcher20 from '@carbon/icons/es/switcher/20';
import UserAvatar20 from '@carbon/icons/es/user--avatar/20';

import { AppIconService } from './icon.service';
import { AppIconDirective } from './icon.directive';

// either provides a new instance of AppIconService, or returns the parent
export function ICON_SERVICE_PROVIDER_FACTORY(parentService: AppIconService) {
    return parentService || new AppIconService();
}

// icon service *must* be a singleton to ensure that icons are accessible globally and not duplicated
export const ICON_SERVICE_PROVIDER = {
    provide: AppIconService,
    deps: [[new Optional(), new SkipSelf(), AppIconService]],
    useFactory: ICON_SERVICE_PROVIDER_FACTORY,
};

@NgModule({
    declarations: [AppIconDirective],
    exports: [AppIconDirective],
    imports: [CommonModule],
    providers: [ICON_SERVICE_PROVIDER],
})
export class AppIconModule {
    public appIconService: AppIconService;
    public constructor(appIconService: AppIconService) {
        this.appIconService = appIconService;
        appIconService.registerAll([
            ChevronLeft20,
            ChevronRight20,
            Close20,
            DataConnected20,
            Launch20,
            Notification20,
            OpenPanelFilledRight,
            Switcher20,
            UserAvatar20,
        ]);
    }
}
