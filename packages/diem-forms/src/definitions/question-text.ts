import { QuestionBase } from './question-base';

export class TextQuestion extends QuestionBase<string> {
    public controlType = 'text';

    public dateFormat: string;
    public ngDateFormat: string;
    public type: string;
    public text: string;
    public style: any;

    public constructor(options: any = {}) {
        super(options);
        this.dateFormat = options.dateFormat;
        this.ngDateFormat = options.ngDateFormat;
        this.type = options.type || 'text';
        this.text = options.text;
        this.style = options.style;
    }
}
