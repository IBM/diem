import { Component, Input } from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';
import { tmpl } from './templates/df.bpImg.pug.tmpl';

@Component({
    selector: 'df-bp-img',
    template: tmpl,
})
export class DFBpImgComponent {
    @Input() public key: any;
    @Input() public keyName!: string;
    @Input() public displayField!: string;
    @Input() public showName!: boolean;
    @Input() public showImg!: boolean;

    public imgurl: string;

    private env: Env;
    private appConfig: any;

    public constructor(env: Env) {
        this.env = env;

        this.appConfig = this.env.getField('appConfig');
        this.imgurl = `${window.location.hostname}/${this.appConfig.imgurl || ''}`;
    }
}
