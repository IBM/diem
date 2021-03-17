/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Component, HostBinding, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { QuestionBase } from './definitions/question-base';
import { QuestionGroup } from './definitions/question-group';
import { IFormSpecs } from './definitions/interfaces';
import { tmpl } from './templates/df.group.body.pug.tmpl';

@Component({
    selector: 'df-group-body',
    template: tmpl,
})
export class DFGroupBodyComponent implements OnInit {
    @Input() public questionGroup!: QuestionGroup<any>; /** ! Added Later */
    @Input() public form!: FormGroup; /** ! Added Later */
    @Input() public TimeCheck: number = new Date().getTime();
    @Input() public formSpecs!: IFormSpecs; /** ! Added Later */

    public readmode: boolean = false;
    public questions: QuestionBase<any>[] = [];

    @HostBinding('class') get name(): string {
        const q: string =
            this.questionGroup.style && this.questionGroup.style.groupBodyClass
                ? this.questionGroup.style.groupBodyClass
                : '';

        const t: string =
            this.formSpecs.style && this.formSpecs.style.groupBodyClass ? this.formSpecs.style.groupBodyClass : '';

        return `${q} ${t}`;
    }

    public ngOnInit(): void {
        this.questions = this.questionGroup.questions;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public trackByFn = (index: number, _item: any) => index; // or item.id
}
