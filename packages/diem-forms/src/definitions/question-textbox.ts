import { QuestionBase } from './question-base';

export interface ITextboxQuestion {
    controlType: string;
    type: string;
    placeHolder: string;
    theme?: string;
    maxLength?: number;
    minLength?: number;
}

export class TextboxQuestion extends QuestionBase<string> implements ITextboxQuestion {
    public controlType = 'textbox';
    public type: string;
    public theme: string;
    public placeHolder: string;
    public maxLength?: number;
    public minLength?: number;

    public constructor(options: any = {}) {
        super(options);
        this.theme = options.theme;
        this.maxLength = options.maxLength;
        this.minLength = options.minLength;
        this.type = options.type || 'text';
        this.placeHolder = options.placeHolder || 'Enter your text';
    }
}
