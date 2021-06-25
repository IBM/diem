import { QuestionBase } from './question-base';

export interface ITextareaQuestion {
    rows: number;
    cols: number;
    placeHolder: string;
}

export class TextareaQuestion extends QuestionBase<string> {
    public controlType = 'textarea';
    public cols: number;
    public rows: number;
    public placeHolder: string;

    public constructor(options: any = {}) {
        super(options);
        this.cols = options.cols || 30;
        this.rows = options.rows || 5;
        this.placeHolder = options.placeHolder || 'Enter your text';
    }
}
