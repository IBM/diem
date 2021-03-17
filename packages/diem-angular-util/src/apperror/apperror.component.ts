import { Component, Input } from '@angular/core';

import { tmpl } from './templates/500.pug.tmpl';

@Component({
    selector: 'ex-app-error',
    template: tmpl,
})
export class AppErrorComponent {
    @Input() public error?: Error;
}
