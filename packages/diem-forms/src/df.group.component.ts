/* eslint-disable @typescript-eslint/no-this-alias */
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    HostBinding,
    Input,
    Output,
    TemplateRef,
    ViewChild,
    OnInit,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { QuestionGroup } from './definitions/question-group';
import { IFormSpecs } from './definitions/interfaces';
import { tmpl } from './templates/df.group.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'df-group',
    template: tmpl,
})
export class DFGroupComponent implements OnInit {
    @ViewChild('basic', { static: true }) public basic!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('fieldset', { static: true }) public fieldset!: TemplateRef<any>; /** ! Will come later */
    @ViewChild('panelset', { static: true }) public pannelset!: TemplateRef<any>; /** ! Will come later */

    @Output() public action: EventEmitter<any> = new EventEmitter();
    @Input() public form!: FormGroup; /** ! Added Later */
    @Input() public TimeCheck: number = new Date().getTime();
    @Input() public formSpecs!: IFormSpecs; /** ! Added Later */
    @Input() public questionGroups: QuestionGroup<any>[] = [];

    public groupTmpl?: TemplateRef<any>;
    public sidebar: boolean = false;

    // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
    @HostBinding('class') get name(): string {
        return this.formSpecs && this.formSpecs.style && this.formSpecs.style.groupClass
            ? this.formSpecs.style.groupClass
            : '';
    }

    // private cd: ChangeDetectorRef;

    public ngOnInit(): void {
        const self: { [index: string]: any } = this;

        /** if there's an element for both read and edit */
        if (self[this.formSpecs.style.type]) {
            this.groupTmpl = self[this.formSpecs.style.type || 'basic'];
            //optimization this.check('ngOnInit');
        }
    }

    public getAction(action: string): void {
        this.action.emit(action);
    }

    public visibleSection: any = (questionGroup: QuestionGroup<any>): boolean => {
        if (questionGroup && questionGroup.hidden) {
            try {
                /** invert the result, if evaluated to true then hidden so not visible ! */
                return !Function(`"use strict";return (${questionGroup.hidden})`).call(this);
            } catch (err) {
                console.warn(`df.group (visibleSection) ${err}`);

                return true;
            }
        }

        return true;
    };

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars, class-methods-use-this
    public trackByFn = (index: number, _item: any) => index; // or item.id

    /*
    private check = (from: string) => {
        console.info(`%c$df.group.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
    */
}
