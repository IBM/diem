import { ChangeDetectionStrategy, Component, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpService } from '@mydiem/diem-angular-util';
import { appConfig } from '../../app.config';
import { tmpl } from './templates/side_menus.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: tmpl,
})
export class SideMenusComponent {
    public content?: string;

    private contentLoaded = false;
    private httpService: HttpService;
    private cd: ChangeDetectorRef;
    private route: ActivatedRoute;

    public constructor(httpService: HttpService, cd: ChangeDetectorRef, route: ActivatedRoute) {
        this.httpService = httpService;
        this.cd = cd;
        this.route = route;

        this.route.data.subscribe({
            next: (data: any) => {
                if (!this.contentLoaded && data.value) {
                    void this.updateSite(data.value);
                }
            },
        });
    }

    private updateSite(value: string): void {
        const url = `${appConfig.formsurl}${value}`;

        this.httpService.httpGet(url).subscribe({
            next: (response: any) => {
                console.info('$side_menus (updateSite): adding value....');
                this.content = response.content;
                this.contentLoaded = true;
                this.check('content loaded');
            },
            error: (error: unknown) => {
                if (typeof error === 'object') {
                    const err = error as Error;
                    console.warn('$side_menus (updateSite): error', err);
                }
            },
        });
    }

    private check = (from: string) => {
        console.info(`%c$sside_menus (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
