/* eslint-disable @typescript-eslint/ban-types */

import { IItem } from './interfaces';
import { QuestionBase } from './question-base';

export interface IDropdownQuestion {
    cache: boolean;
    cacheValues?: any;
    controlType: string;
    editable: boolean;
    filter: boolean;
    items: IItem[];
    optionsInfo: any[];
    style?: any;
    url?: string;
    helperText?: string;
    dropUp: boolean;
    itemValueKey: string;
}

export class DropdownQuestion extends QuestionBase<string> implements IDropdownQuestion {
    public cache: boolean;
    public cacheValues?: any;
    public controlType = 'dropdown';
    public editable: boolean;
    public filter: boolean;
    public items: IItem[] = [];
    public optionsInfo: any[] = [];
    public style: any;
    public url: string;
    public helperText?: string;
    public dropUp: boolean;
    public itemValueKey: string;

    public constructor(options: any = {}) {
        super(options);
        this.cache = options.cache || false;
        this.cacheValues = options.cacheValues;
        this.editable = options.editable;
        this.filter = options.filter;
        this.items = options.items || [];
        this.optionsInfo = options.optionsInfo;
        this.style = options.style;
        this.url = options.url;
        this.helperText = options.helperText;
        this.dropUp = options.dropUp || false;
        this.itemValueKey = options.itemValueKey || 'value';
    }
}
