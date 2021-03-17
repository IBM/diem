import { QuestionBase } from './question-base';

export interface IButtonQuestion {
    focus: string | null;
    type: string;
    size: string;
}

export class ButtonQuestion extends QuestionBase<string> {
    public controlType = 'button';
    public focus: string | null;
    public type: string;
    public size: string;

    public constructor(options: any = {}) {
        super(options);
        this.focus = options.focus || null;
        this.type = options.type;
        this.size = options.size;
    }
}
