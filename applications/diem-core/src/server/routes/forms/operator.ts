import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { addTrace } from '@functions';
import { FormsModel } from '@models';

const cache: any = {};

const operator = '$operator (getFormQuestions)';

export const getFormQuestions: (req: IRequest) => Promise<any> = async (req: IRequest): Promise<any> => {
    const hrstart: [number, number] = process.hrtime();

    if (!(req.query.form && typeof req.query.form === 'string')) {
        return Promise.resolve([]);
    }

    const form_name: string = req.query.form;

    if (cache[req.query.form]) {
        utils.logInfo(
            '$operator (getFormQuestions): using cache',
            `form: ${req.query.form} - ti: ${req.transid}`,
            process.hrtime(hrstart)
        );

        return Promise.resolve(cache[req.query.form]);
    }

    try {
        const doc: any = FormsModel.findOne({ _id: form_name });
        utils.logInfo(operator, `form: ${req.query.form} - ti: ${req.transid}`, process.hrtime(hrstart));
        cache[req.query.form] = doc;

        return Promise.resolve(doc);
    } catch (err) {
        err.trace = addTrace(err.trace, `#at ${operator}`);
        err.form = req.query.form;

        return Promise.reject(err);
    }
};

export const getFormQuestionsUpdate: (req: IRequest) => Promise<any> = async (req: IRequest): Promise<any> => {
    const hrstart: [number, number] = process.hrtime();

    if (!(req.query.form && typeof req.query.form === 'string')) {
        return Promise.resolve([]);
    }

    const form_name: string = req.query.form;

    try {
        const form: string = typeof req.query.form === 'string' ? req.query.form : '';
        const doc: any = FormsModel.findOne({ _id: form_name });
        utils.logInfo('$operator (getFormQuestionsUpdate)', form, process.hrtime(hrstart));
        cache[req.query.form] = doc;

        return Promise.resolve(doc);
    } catch (err) {
        utils.logInfo(`$operator (getFormQuestionsUpdate): error => ${err.message}`);

        err.trace = addTrace(err.trace, operator);
        err.form = req.query.form;

        return Promise.reject(err);
    }
};

export const refreshallforms: () => Promise<any> = async (): Promise<any> => {
    const hrstart: [number, number] = process.hrtime();

    const forms: any = FormsModel.find({});

    const resp: { id: string; rev: string }[] = [];

    try {
        for (const form of forms) {
            const doc: any = FormsModel.findOne({ _id: form._id });
            utils.logInfo('$operator (getFormQuestionsUpdate)', form.id, process.hrtime(hrstart));
            cache[form.id] = doc;
            resp.push({
                id: doc._id.toString(),
                rev: doc._rev,
            });
        }
    } catch (err) {
        utils.logInfo(`$operator (getFormQuestionsUpdate) => ${err.message}`);

        err.trace = addTrace(err.trace, '$operator (getFormQuestions)');

        return Promise.reject(err);
    }

    return Promise.resolve(JSON.stringify(resp, undefined, 2));
};
