import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { addTrace } from '../shared/functions';
import { DataModel, IModel } from '@models';
import { jobStart } from '../job.backend/job.start';

interface IApiJob {
    email: string;
    id: string;
    jobid?: string;
    token: string;
    transid: string;
}

interface IApiJobReturn {
    message: string;
}

export const apijob: (req: IRequest) => Promise<IApiJobReturn> = async (req: IRequest): Promise<IApiJobReturn> => {
    // eslint-disable-next-line no-async-promise-executor

    const hrstart: [number, number] = process.hrtime();

    const body: IApiJob = { ...req.body };
    body.transid = req.transid;
    body.email = req.user.email;

    const id: string = body.id;

    const doc: IModel | null = await DataModel.findOne({ _id: id })
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $api.job (apijob) - findOne');

            return Promise.reject(err);
        });

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            return: { error: `document ${id} could not be found` },
            id,
            email: body.email,
            transid: body.transid,
            trace: ['@at $api.job (apijob)'],
        });
    }

    if (body.jobid) {
        // adding the jobid to keep track of the pipeline calling it
        doc.job.jobid = body.jobid || id;
    }

    /* The slack message will be handled in the doc.type.handler */

    /** there are 3 places manual, cron and api that can trigger a doc */
    doc.job.transid = body.transid;
    doc.job.email = body.email;
    doc.job.runby = 'apicall';

    await jobStart(doc);

    utils.logInfo(`$api.job (apijob) - job ${req.body.id}`, req.transid, process.hrtime(hrstart));

    return Promise.resolve({
        message: 'job started',
    });
};
