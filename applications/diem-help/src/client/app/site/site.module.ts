import { NgModule } from '@angular/core';
import { UIShellModule } from 'carbon-components-angular';
import { AppRouting } from '../../app.routing';
import { AppSharedModule } from '../../app.shared.module';
import { AppIconsModule } from '../../app.icons.module';
import { SiteHeaderComponent } from './site.header.component';

@NgModule({
    declarations: [SiteHeaderComponent],
    exports: [SiteHeaderComponent],
    imports: [AppRouting, AppSharedModule, UIShellModule, AppIconsModule],
    providers: [],
})
export class SiteModule {}
