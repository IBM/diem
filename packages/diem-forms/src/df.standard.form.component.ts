/* eslint-disable @typescript-eslint/indent */
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';

import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Env } from '@mydiem/diem-angular-util';
import { DFFormService } from './df.form.service';
import { ILocals } from './definitions/interfaces';
import { tmpl } from './templates/df.standard.form.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'df-standard-form',
    template: tmpl,
})
export class DFStandardFormComponent implements OnInit, OnChanges, OnDestroy {
    @Input() public locals!: ILocals; /** add later */
    @Input() public values?: any;
    @Input() public changed: boolean = false;
    @Output() public result: EventEmitter<any> = new EventEmitter();

    public formSpecs: any;
    public questionGroups: any[] = [];
    public FSStore!: Subscription; /** ! added later */

    private appConfig: any;
    private env: Env;
    private formService: DFFormService;
    private cd: ChangeDetectorRef;

    public constructor(formService: DFFormService, env: Env, cd: ChangeDetectorRef) {
        this.env = env;
        this.formService = formService;
        this.cd = cd;
    }

    public ngOnInit(): void {
        this.appConfig = this.env.getField('appConfig');
        if (this.locals && this.locals.formName) {
            this.getForm();
        }
    }

    public ngOnChanges(changes: SimpleChanges): void {
        const change: any = changes;
        if (this.formSpecs === undefined) {
            return;
        }
        if (change.changed) {
            this.getForm();
        }
    }

    public getForm = (): void => {
        const formName: string | undefined = this.locals.formName;
        if (formName === undefined) {
            return console.info('$df.standard.form.component (getForm) => no formName defined');
        }
        const storedForm: any = this.formService.getStoredForm(formName, this.locals.reset || false);
        if (storedForm) {
            this.formSpecs = storedForm.specs;
            this.questionGroups = storedForm.groups;
            this.formSpecs.readmode = this.locals.readmode || this.formSpecs.readmode || false;
            this.formSpecs.disabled = !!this.locals.disabled;
            this.formSpecs.submitted = !!this.locals.submitted;
            console.info(`$df.standard.form.component (getForm) => reusing ${formName}`);
            this.check('getForm');
            // this.check('getForm');
        } else {
            this.FSStore = this.formService
                .getFormProperties(`${this.appConfig.formsurl}${formName}`)
                .pipe(take(1)) // only subscribe once
                .subscribe(
                    (qDefs: any) => {
                        this.formSpecs = qDefs;
                        this.formSpecs.readmode =
                            this.locals.readmode !== undefined
                                ? this.locals.readmode
                                : this.formSpecs.readmode
                                ? this.formSpecs.readmode
                                : false;
                        this.formSpecs.disabled = !!this.locals.disabled;
                        this.formSpecs.disableOnSubmit = true;
                        this.formSpecs.submitted = !!this.locals.submitted;
                        this.formSpecs.editEnabled = true;
                        this.formSpecs.deleteEnabled = true;
                        this.questionGroups = this.formService.getQuestionGroups(qDefs);
                        this.formService.setStoredForm(formName, {
                            groups: this.questionGroups,
                            specs: this.formSpecs,
                        });
                        this.check('getForm - lazy');
                    },
                    (error: Error) => {
                        console.info('$df.standard.form.component (getForm) => calling ', error);
                    }
                );
        }
    };

    public ngOnDestroy(): void {
        /** a security to ensure that we always start with a not loaded component
         * usecase when the localdata is not destroyed
         */
        if (this.FSStore !== undefined) {
            this.FSStore.unsubscribe();
        }
        console.info(`$df.standard.form.component (ngOnDestroy) => destroying subscription ${this.locals.formName}`);
    }

    private check = (from: string) => {
        console.info(`%c$df.standard.form.component (check): called by => ${from}`, 'color:red');

        this.cd.markForCheck();
    };
}
