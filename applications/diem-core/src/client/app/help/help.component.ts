import { ChangeDetectionStrategy, Component, ChangeDetectorRef } from '@angular/core';
import { HttpService } from '@mydiem/diem-angular-util';
import { appConfig } from '../../app.config';
import { tmpl } from './templates/help.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: tmpl,
})
export class HelpComponent {
    public content?: string;

    private contentLoaded = false;
    private httpService: HttpService;
    private cd: ChangeDetectorRef;

    public constructor(httpService: HttpService, cd: ChangeDetectorRef) {
        this.httpService = httpService;
        this.cd = cd;

        if (!this.contentLoaded) {
            void this.updateSite();
        }
    }

    private updateSite(): void {
        const url = `${appConfig.formsurl}help`;

        this.httpService.httpGet(url).subscribe({
            next: (response: any) => {
                console.info('$terms (updateSite): adding value....');
                this.content = response.content;
                this.contentLoaded = true;
                this.check('content loaded');
            },
            error: (error: unknown) => {
                if (typeof error === 'object') {
                    const err = error as Error;
                    console.warn('$terms (updateSite): error', err);
                }
            },
        });
    }

    private check = (from: string) => {
        console.info(`%c$sterms (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
