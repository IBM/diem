/* eslint-disable @typescript-eslint/ban-types */
import { QuestionBase } from './question-base';
import { ILocals, IParams } from './interfaces';

export interface ITableQuestion {
    locals: ILocals;
    params: IParams;
}

export class TableQuestion extends QuestionBase<string> {
    public controlType = 'table';
    public locals: any;
    public params: any;

    public constructor(options: any = {}) {
        super(options);
        this.locals = options.locals;
        this.params = options.params;
    }
}
