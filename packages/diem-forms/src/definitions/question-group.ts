/* eslint-disable @typescript-eslint/ban-types */
import { QuestionBase } from './question-base';
import { IQuestion, ITabHeader } from './interfaces';

interface IStyle {
    groupBodyClass?: string;
    divClass?: string;
    style?: any;
}

export class QuestionGroup<T> {
    public value!: T;
    public controlType: string;
    public header: string;
    public selected: boolean;
    public hidden?: string;
    public disabled: boolean;
    public orientation!: string;
    public multiple: boolean;
    public toggleable: boolean;
    public collapsed: boolean;
    public questions: IQuestion[];
    public buttons: any[];
    public style!: IStyle;
    public tabs?: {
        header: ITabHeader;
        questions: QuestionBase<any>[];
    }[];

    public constructor(options: {
        controlType?: string;
        header: string;
        selected?: boolean;
        disabled?: boolean;
        hidden?: string;
        orientation: string;
        multiple?: boolean;
        toggleable?: boolean;
        collapsed?: boolean;
        questions: IQuestion[];
        buttons?: any[];
        style: IStyle;
        tabs?: any[];
    }) {
        this.controlType = options.controlType || '';
        this.header = options.header || '';
        this.selected = !!options.selected;
        this.disabled = !!options.disabled;
        this.hidden = options.hidden;
        this.orientation = options.orientation;
        this.multiple = !!options.multiple;
        this.toggleable = !!options.toggleable;
        this.collapsed = !!options.collapsed;
        this.questions = options.questions || [];
        this.buttons = options.buttons || [];
        this.style = options.style;
        this.tabs = options.tabs;
    }
}
