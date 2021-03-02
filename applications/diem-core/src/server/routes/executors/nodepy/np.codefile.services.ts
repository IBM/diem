/*
Used purely for debugging purposes
Could be used later in previewing the job
*/

import { utils } from '@common/utils';
import { DataModel, ExecutorTypes, IJobSchema } from '../../models/models';
import { base64decode, addTrace } from '../../shared/functions';
import { INodePyJob } from './np.interfaces';
import { pythonServicesHandler } from './python/python.services.handler';

export interface IServices {
    email: string;
    id: string;
    jobid?: string;
    token: string;
    transid: string;
    params?: any;
}

export const npcodefileservices: (body: IServices) => Promise<string> = async (body: IServices): Promise<string> => {
    if (body.id === null) {
        return Promise.reject({
            message: 'no id provided',
            trace: ['@at $nodepy.services.pyfile (npcodefile) - nodid'],
        });
    }

    // a job can be called via url or via body
    const id: string = body.id;
    const params: any = body.params || {};

    const doc: IJobSchema | null = await DataModel.findOne({ _id: id })
        .lean()
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $nodepy.services.pyfile (npcodefile) - findOne');

            return Promise.reject(err);
        });

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $nodepy.services.pyfile (npcodefile) - null document'],
        });
    }

    const pubJob: INodePyJob | undefined = await pythonServicesHandler(doc, {
        email: body.email,
        executor: ExecutorTypes.nodepy,
        id,
        jobid: body.jobid || id,
        jobstart: doc.job.jobstart,
        name: doc.name,
        runby: body.email,
        status: 'Submitted',
        transid: body.transid,
        org: doc.project.org,
        params,
    }).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $nodepy.services.pyfile (npcodefile)');

        return Promise.reject(err);
    });

    if (!pubJob) {
        utils.logInfo(`$nodepy.services.pyfile (npcodefile): no file prepared - doc: ${id} - ti: ${body.transid}`);

        return Promise.resolve('No Python file available');
    }

    utils.logInfo(`$nodepy.services.pyfile (npcodefile): file prepared - doc: ${id} - ti: ${body.transid}`);

    return Promise.resolve(base64decode(pubJob.code));
};
