import { QuestionBase } from './question-base';

export interface INumberQuestion {
    controlType: string;
    max?: number | null;
    min?: number | null;
    theme?: string;
    step: number;
}

export class NumberQuestion extends QuestionBase<string> implements INumberQuestion {
    public controlType: string = 'number';
    public max: number | null;
    public min: number | null;
    public theme: string;
    public step: number;

    public constructor(options: any = {}) {
        super(options);

        this.max = options.max || null;
        this.min = options.min || null;
        this.theme = options.theme;
        this.step = options.step || 1;
    }
}
