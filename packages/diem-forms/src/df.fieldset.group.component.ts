/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { QuestionGroup } from './definitions/question-group';
import { IFormSpecs } from './definitions/interfaces';
import { tmpl } from './templates/df.fieldset.group.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'df-fieldset-group',
    template: tmpl,
})
export class DFFieldsetGroupComponent {
    @Input() public form!: FormGroup; /** ! Added Later */
    @Input() public TimeCheck: number = new Date().getTime();
    @Input() public questionGroups: QuestionGroup<any>[] = [];
    @Input() public values: any;
    @Input() public formSpecs!: IFormSpecs; /** ! Added Later */

    public visibleSection: any = (questionGroup: QuestionGroup<any>): boolean => {
        if (questionGroup && questionGroup.hidden) {
            try {
                /** invert the result, if evaluated to true then hidden so not visible ! */
                return !Function(`"use strict";return (${questionGroup.hidden})`).call(this);
            } catch (err) {
                console.warn(`df.fieldsetgroup (visibleSection) ${err}`);

                return true;
            }
        }

        return true;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
    public trackByFn = (index: number, _item: any) => index; // or item.id
}
