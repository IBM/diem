import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';
import { tmpl } from './templates/site.body.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'body',
    template: tmpl,
})
export class SiteBodyComponent {
    // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
    @HostBinding('class') className = '';

    private env: Env;

    public constructor(env: Env) {
        this.env = env;

        this.env.bodyClass$.subscribe((body: { bodyClass: string; remove: boolean }) => {
            let newClass: string = this.className;

            if (body.remove && !this.className.includes(body.bodyClass)) {
                // nothing
            } else if (body.remove && this.className === body.bodyClass) {
                // strict equal
                newClass = '';
            } else if (body.remove && this.className.includes(body.bodyClass)) {
                newClass = this.className.replace(` ${body.bodyClass}`, '').trim();
            } else if (!this.className.includes(body.bodyClass)) {
                newClass = `${this.className} ${body.bodyClass}`.trim();
            }

            if (this.className !== newClass) {
                this.className = newClass;
            }
        });
    }
}
