import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { redisf } from '@common/redis.functions';
import { addTrace } from '../shared/functions';
import { FormsModel } from '../models/models';

const app: string = utils.Env.app;

const operator: string = '@at $operator (getFormQuestions)';

export const getFormQuestions: (req: IRequest) => Promise<any> = async (req: IRequest): Promise<any> => {
    const hrstart: [number, number] = process.hrtime();

    if (!(req.query.form && typeof req.query.form === 'string')) {
        return Promise.resolve([]);
    }

    const form_name: string = req.query.form;

    const cache: any = await redisf.getAsync(`${app}-${form_name}`);

    if (cache) {
        utils.logInfo(
            '$operator (getFormQuestions) - using redis cache',
            `form: ${req.query.form} - ti: ${req.transid}`,
            process.hrtime(hrstart)
        );

        return Promise.resolve(cache);
    }

    try {
        const form: any = await FormsModel.findOne({ _id: form_name });
        utils.logInfo(operator, `form: ${req.query.form} - ti: ${req.transid}`, process.hrtime(hrstart));
        await redisf.setAsync(`${app}-${req.query.form}`, form);

        return Promise.resolve(form);
    } catch (err) {
        err.trace = addTrace(err.trace, operator);
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
        const doc: any = await FormsModel.findOne({ _id: form_name });
        utils.logInfo('$operator (getFormQuestionsUpdate)', form, process.hrtime(hrstart));
        await redisf.setAsync(`${app}-${form}`, doc);

        return Promise.resolve(doc);
    } catch (err) {
        utils.logInfo(`$operator (getFormQuestionsUpdate) => ${err.message}`);

        err.trace = addTrace(err.trace, '$operator (getFormQuestions)');
        err.form = req.query.form;

        return Promise.reject(err);
    }
};

export const refreshallforms: () => Promise<any> = async (): Promise<any> => {
    const hrstart: [number, number] = process.hrtime();

    const forms: any = await FormsModel.find({});

    const resp: { id: string; rev: string }[] = [];

    //return Promise.resolve(resp);

    try {
        for (const form of forms) {
            const doc: any = await FormsModel.findOne({ _id: form._id });
            utils.logInfo('$operator (getFormQuestionsUpdate)', form.id, process.hrtime(hrstart));
            await redisf.setAsync(`${app}-${form.id}`, doc);
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
