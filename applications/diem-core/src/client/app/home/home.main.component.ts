import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';
import { tmpl } from './templates/home.main.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: tmpl,
})
export class HomeMainComponent {
    public title: string;
    public env: Env;

    public constructor(env: Env) {
        this.env = env;
        this.title = env.getField('title');
    }
}
