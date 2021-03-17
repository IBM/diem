/* eslint-disable @typescript-eslint/ban-types */
import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Env } from '@mydiem/diem-angular-util';
import { DFCommonService } from './df.common.api';
import { IFormSpecs } from './definitions/interfaces';
import { QuestionGroup } from './definitions/question-group';
import { tmpl } from './templates/df.buttons.pug.tmpl';

@Component({
    selector: 'df-buttons',
    template: tmpl,
})
export class DFButtonsComponent implements OnInit {
    @Input() public formSpecs!: IFormSpecs; /** ! Added Later */
    @Input() public form!: FormGroup; /** ! Added Later */
    @Input() public questionGroup!: QuestionGroup<any>; /** ! Added Later */

    public buttonsPerm: {}[] = [];
    public buttons: IFormSpecs['buttons'];
    public env: Env;

    private DFCS: DFCommonService;

    public constructor(env: Env, DFCS: DFCommonService) {
        this.env = env;
        this.DFCS = DFCS;
    }

    public ngOnInit(): void {
        /* check if the questiongroup contains the buttons, or the formspecs */

        if (this.questionGroup && this.questionGroup.buttons) {
            this.buttons = this.questionGroup.buttons;
        } else if (this.formSpecs && this.formSpecs.buttons) {
            this.buttons = this.formSpecs.buttons;
        }
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public onAction = (action: any): boolean => {
        /** we will append or replace the current form values by any additional value that was put in the config
         * be carefull as you don't want to change the origindal action values
         */

        this.DFCS.formChanged({
            ...action,
            values: { ...this.form.value, ...action.values },
        });

        return false;
    };

    public getPermission: any = (button: number): any => this.buttonsPerm[button];

    public evalStr: any = (str: string): any => Function(`"use strict";return (${str})`).call(this);
}
