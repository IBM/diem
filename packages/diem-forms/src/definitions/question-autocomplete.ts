import { QuestionBase } from './question-base';
import { IItem } from './interfaces';

export interface IAutoCompleteQuestion {
    cache: boolean;
    cacheValues?: any;
    controlType: string;
    field: any;
    icon: string;
    items: IItem[];
    size: string;
    type: string;
    url?: string; // a url in case of a dynamic lookup
    tags: boolean; // used to display the values as tags
    itemValueKey: string;
}

export class AutoCompleteQuestion extends QuestionBase<string> implements IAutoCompleteQuestion {
    public cache: boolean;
    public cacheValues?: any;
    public controlType = 'autocomplete';
    public field: any;
    public icon: string;
    public size: string;
    public items: any[];
    public url: string;
    public type: string;
    public tags: boolean;
    public itemValueKey: string;

    public constructor(options: any = {}) {
        super(options);

        this.cache = options.cache || false;
        this.cacheValues = options.cacheValues;
        this.field = options.field;
        this.icon = options.icon;
        this.size = options.size || 30;
        this.items = options.items || [];
        this.url = options.url;
        this.type = options.type || 'single';
        this.tags = options.tags || false;
        this.itemValueKey = options.itemValueKey;
    }
}
