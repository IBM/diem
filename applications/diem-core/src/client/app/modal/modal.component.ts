import {
    Component,
    OnDestroy,
    TemplateRef,
    ViewChild,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { DFCommonService, IModalOptions } from '@mydiem/diem-forms';
import { Subscription, Observable } from 'rxjs';
import { Env } from '@mydiem/diem-angular-util';
import { DialogService } from '../main/main.api';
import { tmpl } from './templates/modal.pug.tmpl';

type ModalTypes = 'xs' | 'sm' | 'default' | 'lg';

interface IModalConfig {
    context?: any;
    options: {
        header: string;
        size: ModalTypes;
        theme: string;
        arialabel: string;
        hasScrollingContent: boolean;
    };
    message?: string;
    template?: TemplateRef<any>;
}

@Component({
    selector: 'ibm-modalplaceholder',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: tmpl,
})
export class ModalComponent implements OnDestroy {
    @ViewChild('spinnerTemplate', { static: false }) public spinnerTemplate?: TemplateRef<any>;
    @ViewChild('errorTemplate', { static: false }) public errorTemplate?: TemplateRef<any>;

    public openModal = false;

    public modalOptions: IModalOptions = {
        close: false,
        context: undefined,
        error: false,
        message: undefined,
        size: 'default',
        options: undefined,
        spinner: false,
    };

    public modal: IModalConfig;
    public DS: DialogService;
    public progressMsg: Observable<any>;

    private env: Env;

    private subscription: Subscription;
    private formSubscription: Subscription;

    private DFCS: DFCommonService;
    private cd: ChangeDetectorRef;

    public constructor(DS: DialogService, DFCS: DFCommonService, env: Env, cd: ChangeDetectorRef) {
        this.cd = cd;
        this.DS = DS;
        this.DFCS = DFCS;
        this.modal = {
            options: {
                header: 'Confirmation',
                hasScrollingContent: false,
                size: 'lg',
                theme: 'default',
                arialabel: 'default',
            },
            message: undefined,
        };
        this.env = env;

        this.subscription = this.DS.dialog$.subscribe((options: IModalOptions) => this.handle({ ...options }));

        this.formSubscription = this.DFCS.form$.subscribe((options: any) => {
            if (options.type === 'close' || options.action === 'close') {
                console.info('$modal.component (formSubscription) => modal close');
                this.close();
            }
        });

        this.progressMsg = this.env.progress$;
    }

    public handle = (options: IModalOptions): void => {
        {
            /** there are no options so assume to close */
            if (options === undefined) {
                return;
            }

            if (!options || options.close) {
                return this.close();
            }

            /** now display the modal based on the template */

            this.modal.context = options.context;

            if (options.spinner) {
                this.modal.template = this.spinnerTemplate;
                this.modal.options.size = 'xs';
                this.modal.options.header = 'Processing';

                if (this.DS.isOpen) {
                    return;
                }
            }

            if (options.error) {
                this.modal.template = this.errorTemplate;
                this.modal.message = options.message;
                this.modal.options.size = 'default';
                this.modal.options.arialabel = 'error';
            }

            if (options.options) {
                this.modal.options = { ...options.options };
            }

            /** if there's a template add it here */
            if (options.template) {
                this.modal.template = options.template;
            }

            /** Add's a class to the body so that the body is not clossable */

            this.openModal = true;
            this.DS.isOpen = true;

            this.setBodyClass('bx--body--with-modal-open');

            this.check('open');

            setTimeout(() => {
                // this is a timeout to scroll to the top for a fullscreen option
                const el: any = document.getElementsByClassName('scrollto');
                if (el && el[0]) {
                    el[0].scrollIntoView({
                        block: 'start',
                        inline: 'start',
                        behavior: 'smooth',
                    });
                }
            }, 100);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public onHide = (): void => {
        this.close();
    };

    public close = (): void => {
        this.openModal = false;

        this.DS.isOpen = false;
        /** important
         * put the template to undefined to unload any tempaltes and thus to avoid them being reloaded
         *
         * there is also a timeout to let the modal annimate it's closing
         */

        setTimeout(() => {
            this.modal.template = undefined;
            this.modal.message = undefined;

            this.check('cleanup');
        }, 250);

        this.removeBodyClass('bx--body--with-modal-open');

        console.info('$modal.component (ngOnDestroy): modal closed');
        this.check('close');
    };

    public modalClose(): void {
        console.info('here');
        this.modal.context = undefined;
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
        this.formSubscription.unsubscribe();
        console.info('$modal.component (ngOnDestroy) => destorying modal');
    }

    private setBodyClass = (cl: string): void => {
        if (this.env && cl) {
            console.info(`$modal.component (setBodyClass): setting class: ${cl}`);
            this.env.nextClass(cl);
        }
    };

    private removeBodyClass = (cl: string): void => {
        if (this.env && cl) {
            console.info(`$modal.component (removeBodyClass): removing class: ${cl}`);
            this.env.nextClass(cl, true);
        }
    };

    private check = (from: string) => {
        console.info(`%c$$modal.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
