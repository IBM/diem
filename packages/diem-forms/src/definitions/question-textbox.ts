import { QuestionBase } from './question-base';

export interface ITextboxQuestion {
    controlType: string;
    type: string;
    helperText?: string;
    placeHolder: string;
    invalidText: string;
    theme?: string;
}

export class TextboxQuestion extends QuestionBase<string> implements ITextboxQuestion {
    public controlType = 'textbox';
    public type: string;
    public theme: string;
    public placeHolder: string;
    public invalidText: string;
    public helperText?: string;

    public constructor(options: any = {}) {
        super(options);
        this.theme = options.theme;
        this.type = options.type || 'text';
        this.placeHolder = options.placeHolder || 'Enter your text';
        this.invalidText = options.invalidText || 'Incorrect Value';
        this.helperText = options.helperText;
    }
}
