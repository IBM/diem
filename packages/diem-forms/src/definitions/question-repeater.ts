/* eslint-disable @typescript-eslint/ban-types */
import { QuestionBase } from './question-base';

export class RepeaterQuestion extends QuestionBase<string> {
    public controlType = 'repeater';
    public class: string;
    public options: { label: string; value: string; style: any; action: () => {} }[] = [];

    public constructor(options: any = {}) {
        super(options);
        this.options = options.options;
        this.class = options.class;
    }
}
