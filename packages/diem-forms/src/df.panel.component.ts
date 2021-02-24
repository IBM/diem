/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/no-this-alias */
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    ElementRef,
    Input,
    Output,
    HostBinding,
    HostListener,
    ViewChild,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Env } from '@mydiem/diem-angular-util';
import { QuestionGroup } from './definitions/question-group';
import { IFormSpecs } from './definitions/interfaces';
import { tmpl } from './templates/df.panel.pug.tmpl';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'df-panel',
    template: tmpl,
})
export class DFPanelComponent {
    @ViewChild('sidebardiv', { read: ElementRef, static: false }) sidebardiv!: ElementRef;
    // eslint-disable-next-line @typescript-eslint/explicit-member-accessibility
    @HostBinding('class') navClass: string = '';

    @Output() public action: EventEmitter<any> = new EventEmitter();
    @Input() public form!: FormGroup; /** ! Added Later */
    @Input() public TimeCheck: number = new Date().getTime();
    @Input() public formSpecs!: IFormSpecs; /** ! Added Later */
    @Input() public questionGroups: QuestionGroup<any>[] = [];

    public sidebar: boolean = false;
    public active: number = 0;
    public tabnumber: number = 0;
    public env: Env;

    public constructor(env: Env) {
        this.env = env;
    }

    @HostListener('document:mousedown', ['$event'])
    onFocusOut(event: MouseEvent): void {
        if (!this.sidebardiv.nativeElement.contains(event.target)) {
            this.sidebar = false;
        }
    }

    // private cd: ChangeDetectorRef;

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

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars
    public trackByFn = (index: number, _item: any) => index; // or item.id

    public setActive = (index: number): number => {
        if (this.active === index) {
            return index;
        }

        this.tabnumber = 0;

        return (this.active = index);
    }; // or item.id

    public selectedtab: (t: any) => void = (t: any): void => {
        this.tabnumber = t;
    };

    /*
    private check = (from: string) => {
        console.info(`%c$df.group.component (check): called by => ${from}`, 'color:red');
        this.cd.markForCheck();
    };
    */
}
