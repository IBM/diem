import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';

@NgModule({
    providers: [],
})
export class AppCoreModule {
    public constructor(@Optional() @SkipSelf() parentModule: AppCoreModule) {
        if (parentModule) {
            throw new Error('CoreModule is already loaded. Import it in the AppModule only');
        }
    }

    public static forRoot(): ModuleWithProviders<any> {
        return {
            ngModule: AppCoreModule,
            providers: [Env],
        };
    }
}
