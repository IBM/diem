import { QuestionBase } from './question-base';

export interface IChipsQuestion {
    separator: string;
    style?: any;
}

export class ChipsQuestion extends QuestionBase<string> {
    public controlType = 'chips';
    public separator: string;
    public style: any;

    public constructor(options: any = {}) {
        super(options);

        this.separator = options.seperator || ',';
        this.style = options.style;
    }
}
