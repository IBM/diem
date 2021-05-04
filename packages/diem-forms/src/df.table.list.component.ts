/* eslint-disable @typescript-eslint/ban-types */
import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Env } from '@mydiem/diem-angular-util';
import { DFFormService } from './df.form.service';
import { ILocals, IParams, IFormSpecs } from './definitions/interfaces';
import { tmpl } from './templates/df.table.list.pug.tmpl';

/**
 * Interface used for the question component to embed a table
 */
export interface IDFQuestionTableListComponent {
    locals: ILocals;
    params: IParams;
    values?: any;
}

@Component({
    selector: 'df-table-list',
    template: tmpl,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DFTableListComponent implements OnInit, OnDestroy {
    @Output() public result: EventEmitter<any> = new EventEmitter();
    @Input() public locals!: ILocals; /** will be assigned later */
    @Input() public params?: IParams;
    @Input() public values: any;
    @Input() public formSpecs?: IFormSpecs; /** ! Added Later */

    public errorMessage: any;
    public tableSpecs: any;
    public FSStore!: Subscription; /** ! added later */
    public loaded: boolean = false;
    public error: boolean = false;
    public errormsg: string = '';

    private appConfig: any;
    private env: Env;
    private formService: DFFormService;
    private cd: ChangeDetectorRef;

    public constructor(formService: DFFormService, cd: ChangeDetectorRef, env: Env) {
        this.env = env;
        this.formService = formService;
        this.cd = cd;
    }

    public ngOnInit(): void {
        this.appConfig = this.env.getField('appConfig');
        this.getForm();
    }

    public getForm(): void {
        const formName: string | undefined = this.locals.formName;
        if (formName === undefined) {
            this.errormsg = `mising template ${formName}`;
            this.error = true;
            this.check('getForm');

            return console.info('$df.table.list.component (getForm) => no formName defined');
        }
        const storedForm: any = this.formService.getStoredForm(formName) || false;
        if (typeof storedForm === 'object') {
            console.info(`$df.table.list.component (getForm) => reusing ${formName}`);
            this.tableSpecs = storedForm.specs;
            this.loaded = true;
            this.check('getForm');
        } else {
            console.info(`$df.table.list.component (getForm) => calling ${this.locals.formName}`);
            this.FSStore = this.formService
                .getFormProperties(`${this.appConfig.formsurl}${formName}`)
                .pipe(take(1)) // only subscribe once
                .subscribe(
                    (qDefs: any) => {
                        this.tableSpecs = qDefs; // specs are used by the template
                        this.formService.setStoredForm(formName, { specs: this.tableSpecs }); // store form for reuse
                        this.loaded = true;
                        this.check('getForm');
                    },
                    (error: Error) => {
                        this.errormsg = `Error retrieving template ${formName}`;
                        this.error = true;
                        this.check('getForm');

                        console.info(
                            `$df.table.list.component (getForm) => error calling ${formName} ${error.message}`
                        );
                    }
                );
        }
    }

    public getResult(results: {}): void {
        this.result.emit(results);
    }

    public ngOnDestroy(): void {
        /** a security to ensure that we always start with a not loaded component
         * usecase when the localdata is not destroyed
         */
        if (this.FSStore !== undefined) {
            this.FSStore.unsubscribe();
        }
        console.info(`$df.table.list.component (ngOnDestroy) => destroying subscription ${this.locals?.formName || ''}`);
    }

    private check = (from: string) => {
        console.info(`%c$df.table.list.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
