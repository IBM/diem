import { QuestionBase } from './question-base';

export interface INumberQuestion {
    controlType: string;
    max?: number | null;
    min?: number | null;
    theme?: string;
    invalidText: string;
    helperText?: string;
}

export class NumberQuestion extends QuestionBase<string> implements INumberQuestion {
    public controlType: string = 'number';
    public max: number;
    public min: number;
    public theme: string;
    public invalidText: string;
    public helperText: string;

    public constructor(options: any = {}) {
        super(options);

        this.max = options.max || null;
        this.min = options.min || null;
        this.theme = options.theme;
        this.invalidText = options.invalidText || 'Incorrect Value';
        this.helperText = options.helperText;
    }
}
