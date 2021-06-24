import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { addTrace } from '@functions';
import { DataModel, EJobStatus, EJobStatusCodes, IJobModel } from '@models';
import { jobStart } from '../job.backend/job.start';
import { jobHandleStop } from '../job.front/job.actions';

interface IApiJob {
    email: string;
    id: string;
    jobid?: string;
    token: string;
    transid: string;
    action: 'start' | 'stop';
}

interface IApiJobReturn {
    message: string;
}

export const apijob: (req: IRequest) => Promise<IApiJobReturn> = async (req: IRequest): Promise<IApiJobReturn> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IApiJob = { ...req.body };
    body.transid = req.transid || body.transid;
    body.email = req.user?.email ? req.user.email : body.email ? body.email : 'system';

    const id: string = body.id;

    const doc: IJobModel | null = await DataModel.findOne({ _id: id })
        .exec()
        .catch(async (err: any) => {
            if (err.message && err.message.includes('Cast to ObjectI')) {
                return Promise.reject({
                    message: 'this is not a vamid id',
                    return: { error: `document ${id} could not be found` },
                    status: 200,
                    id,
                });
            }

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
            status: 200,
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

    const action: string = body.action || undefined;

    if (!action || (action && action.toLowerCase() === 'start')) {
        if (([EJobStatus.running, EJobStatus.submitted] as EJobStatusCodes[]).includes(doc.job.status)) {
            utils.logInfo(
                `$api.job (apijob): already running - job: ${id} - status: ${doc.job.status}`,
                doc.job.transid
            );

            return Promise.resolve({
                message: 'job already running',
            });
        }

        await jobStart(doc).catch(async (err) => {
            err.trace = addTrace(err.trace, '@at $api.job (apijob) - jobStart');
            err.id = body.jobid;

            return Promise.reject({
                message: 'job start failed',
                error: err.message || err,
            });
        });

        utils.logInfo(`$api.job (apijob) - job ${req.body.id}`, req.transid, process.hrtime(hrstart));

        return Promise.resolve({
            message: 'job started',
        });
    }

    if (action && action.toLowerCase() === 'stop') {
        if (([EJobStatus.stopped] as EJobStatusCodes[]).includes(doc.job.status)) {
            utils.logInfo(
                `$api.job (apijob): already stopped - job: ${id} - status: ${doc.job.status}`,
                doc.job.transid
            );

            return Promise.resolve({
                message: 'job already stopped',
            });
        }
        await jobHandleStop(doc, body).catch(async (err) => {
            err.trace = addTrace(err.trace, '@at $api.job (apijob)');
            err.id = body.jobid;

            return Promise.reject({
                message: 'job stop failed',
                error: err.message || err,
            });
        });

        utils.logInfo(`$api.job (apijob) - job ${req.body.id}`, req.transid, process.hrtime(hrstart));

        return Promise.resolve({
            message: 'job stopped',
        });
    }

    utils.logInfo(
        `$api.job (apijob) - not a valid action - action: ${action} - job ${req.body.id}`,
        req.transid,
        process.hrtime(hrstart)
    );

    return Promise.resolve({
        message: 'not a valid method',
        action,
    });
};
