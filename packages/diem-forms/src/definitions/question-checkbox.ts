import { QuestionBase } from './question-base';

export interface ICheckboxQuestion {
    binary: boolean;
}

export class CheckboxQuestion extends QuestionBase<string[]> {
    public controlType = 'checkbox';
    public value: any;
    public binary: boolean;
    public options: { key: string; value: string }[] = [];

    public constructor(options: any = {}) {
        super(options);
        this.options = options.options || [];
        this.binary = options.binary || false;
        this.value = options.binary ? false : [];
    }
}
