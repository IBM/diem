/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable class-methods-use-this */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Observable } from 'rxjs';
import { Env } from '@mydiem/diem-angular-util';
import { select, Store } from '@ngrx/store';
import { IStoreMessageState } from '@mydiem/diem-forms';
import { toastAnimation } from './messages.animation';
import { tmpl } from './templates/messages.pug.tmpl';

@Component({
    selector: 'ex-messages',
    template: tmpl,
    animations: [toastAnimation],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesComponent {
    public msg!: IStoreMessageState;
    public lowContrast: boolean = false;

    public isOpen: boolean = false;
    public locals: any;

    public progressMsg: Observable<any>;

    private cd: ChangeDetectorRef;
    private env: Env;
    private store: Store<any>;
    private msgkey: string = '';

    /*
    type of messages are
    "success", "info", "warn" and "error".
    carbon has 'error','info' 'success' 'warning'
    so warning is different
    */

    public constructor(env: Env, store: Store<any>, cd: ChangeDetectorRef) {
        this.env = env;
        this.store = store;
        this.cd = cd;

        this.store.pipe(select((s) => s.siteStore)).subscribe((message: IStoreMessageState) => {
            if (!message || (message && !message.key) || message.key === '') {
                return;
            }

            if (message.severity === 'hide') {
                if (this.msgkey !== message.key) {
                    return;
                }
                console.info('$messages.component (clearing messages)');

                this.isOpen = false;
                this.check('close');

                return;
            }

            console.info('$messages (new message)');

            this.msg = {
                detail: message.detail,
                key: message.key || 'bl',
                life: message.life || 1000,
                severity: message.severity || 'info',
                sticky: message.sticky,
                summary: message.summary,
                type: message.type || 'INFO',
            };

            if (!this.msg.sticky) {
                setTimeout(() => {
                    this.isOpen = false;
                    this.check('onClose - timeout');
                }, this.msg.life);
            }

            this.isOpen = true;
            this.msgkey = this.msg.key;

            this.check('onOpen');
        });

        this.progressMsg = this.env.progress$;
    }

    public onClose: any = () => {
        this.isOpen = false;
        this.check('onClose');
    };

    private check = (from: string) => {
        console.info(`%c$messages.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
