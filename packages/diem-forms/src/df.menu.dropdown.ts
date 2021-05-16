/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { each } from 'lodash-es';
import { Subscription } from 'rxjs';
import { select, Store } from '@ngrx/store';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Env } from '@mydiem/diem-angular-util';
import { debounceTime, take } from 'rxjs/operators';
import { IAction } from './definitions/interfaces';
import { DFStoreFunctions } from './df.store.functions';
import { DFFormService } from './df.form.service';
import { DFCommonService } from './df.common.api';
import { tmpl } from './templates/df.menu.dropdown.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'df-menu-dropdown',
    template: tmpl,
})
export class DFMenuDropDownComponent implements OnInit, OnDestroy {
    @Input() public config: any;
    @Input() public readmode: boolean = true;

    public formSpecs: any = {};
    public FSStore!: Subscription; /** ! added later */
    public data: any;
    public env: Env;
    public hoverStyle: any;

    private AStore!: Subscription;
    private cd: ChangeDetectorRef;
    private DFCS: DFCommonService;
    private DSF: DFStoreFunctions;
    private formService: DFFormService;
    private store: Store<any>;
    private appConfig: any;
    private formSubscription!: Subscription; /** ! Added Later */
    private action?: IAction;

    public constructor(
        env: Env,
        cd: ChangeDetectorRef,
        DFCS: DFCommonService,
        DSF: DFStoreFunctions,
        formService: DFFormService,
        store: Store<any>
    ) {
        this.env = env;
        this.DFCS = DFCS;
        this.cd = cd;
        this.formService = formService;
        this.DSF = DSF;
        this.store = store;
        this.appConfig = env.getField('appConfig');
    }

    public ngOnInit(): void {
        if (this.config) {
            this.getForm();
        }
        this.formSubscribe();
    }

    public hover = (display: string) => {
        this.hoverStyle = { display };
    };

    public awaitData = (store: string, items: any) => {
        const storeName: string = this.DSF.r_getStore(store);
        this.AStore = this.store
            .pipe(
                select((s) => s.coverage.states[storeName]),
                debounceTime(200)
            )
            .subscribe((data: any) => {
                if (data !== undefined) {
                    this.data = data.values;
                    this.handleRules(items);
                }
            });
    };

    public handleRules = (items: any) => {
        each(items, (item: any) => {
            // we now have an item that equals a drop down value
            if (!item.rules) {
                return; // we can stop here as there's no rule
            }
            each(item.rules, (rule: { default: boolean; rule: any }) => {
                // we now have the role

                item.hidden = rule.default;

                if (rule.rule && (this.action || this.data)) {
                    item.hidden = this.evalStr(rule.rule);
                    //' this.check();
                }
            });
        });
    };

    public formSubscribe = () => {
        this.formSubscription = this.DFCS.form$.subscribe((action: IAction) => {
            if (action.type) {
                this.action = action;

                if (action.type === 'save' || action.type === 'read') {
                    this.readmode = true;
                } else if (action.type === 'edit') {
                    this.readmode = false;
                }

                this.handleRules(this.formSpecs.items);
            }
        });
    };

    public getForm(): void {
        const formName: string = this.config.formName;
        if (formName === undefined) {
            return console.info('$df.menu.dropdown.component (getForm) => no formName defined');
        }
        const storedForm: any = this.formService.getStoredForm(formName);
        if (storedForm) {
            this.formSpecs = storedForm;
            console.info(`$df.menu.dropdown.component (getForm) => reusing ${formName}`);
            this.check('getForm');
        } else {
            this.FSStore = this.formService
                .getFormProperties(`${this.appConfig.formsurl}${formName}`)
                .pipe(take(1)) // only subscribe once
                .subscribe(
                    (results: any) => {
                        this.formSpecs = results;
                        this.formService.setStoredForm(formName, results);
                        this.check('getForm');
                    },
                    (error: Error) => {
                        console.info('$df.menu.dropdown.component (getForm) => calling ', error);
                    }
                );
        }

        /** this is different , it checks if the form has */
        if (this.formSpecs && this.formSpecs.hasRules) {
            this.awaitData(this.formSpecs.store, this.formSpecs.items);
            this.handleRules(this.formSpecs.items);
        }
    }

    public onAction = (action: any): void => {
        this.hoverStyle = { display: 'none' };
        this.DFCS.formChanged(action);
    };

    public ngOnDestroy(): void {
        /** a security to ensure that we always start with a not loaded component
         * usecase when the localdata is not destroyed
         */
        if (this.FSStore !== undefined) {
            this.FSStore.unsubscribe();
        }

        if (this.AStore !== undefined) {
            this.AStore.unsubscribe();
        }

        if (this.formSubscription) {
            this.formSubscription.unsubscribe();
        }

        console.info('$df.menu.dropdown.component (ngOnDestroy) => destroying subscriptions');
    }

    private evalStr: any = (str: string): any => {
        try {
            return Function(`"use strict";return (${str})`).call(this);
        } catch (err) {
            console.debug('$df.menu.dropdown (handleRules) error', err);

            return false;
        }
    };

    private check = (from: string) => {
        console.info(`%c$df.menu.dropdown (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
}
