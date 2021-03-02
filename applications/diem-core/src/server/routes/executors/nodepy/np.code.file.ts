/*
Used purely for debugging purposes
Could be used later in previewing the job
*/

import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { DataModel, ECodeLanguage, IETLJob, IJobSchema, ExecutorTypes } from '../../models/models';
import { base64decode, addTrace } from '../../shared/functions';
import { javascriptHandler } from './javascript/javascript.handler';
import { INodePyJob } from './np.interfaces';
import { pythonHandler } from './python/python.handler';

export const npcodefile: (req: IRequest) => Promise<string> = async (req: IRequest): Promise<string> => {
    if (req.query.id === null) {
        return Promise.resolve('');
    }

    if (req.user.role !== 'admin') {
        return Promise.resolve('You need to be Admin to view this file');
    }

    const id: string =
        req.params && req.params.pyfile ? req.params.pyfile.split('.')[0] : req.body ? req.body.id : undefined;

    if (!id) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $nodepy.file (npcodefile) - nodid'],
        });
    }

    const doc: IJobSchema | null = await DataModel.findOne({ _id: id })
        .lean()
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $nodepy.file (npcodefile) - findOne');

            return Promise.reject(err);
        });

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $nodepy.file (npcodefile) - null document'],
        });
    }

    const jobConfig: IETLJob = {
        email: req.user && req.user.email ? req.user.email : '',
        executor: ExecutorTypes.nodepy,
        id,
        jobid: id,
        jobstart: doc.job.jobstart,
        name: doc.name,
        runby: req.user && req.user.email ? req.user.email : '',
        status: 'Submitted',
        transid: req.transid,
        org: doc.project.org,
    };

    let nodepyJob: INodePyJob | undefined;

    if (doc.custom?.executor === ECodeLanguage.javascript) {
        nodepyJob = await javascriptHandler(doc, jobConfig).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $nodepy.file (npcodefile) - javascript');

            return Promise.reject(err);
        });
    } else {
        nodepyJob = await pythonHandler(doc, jobConfig).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $nodepy.file (npcodefile) - python');

            return Promise.reject(err);
        });
    }

    if (!nodepyJob) {
        utils.logInfo(`$nodepy.file (npcodefile): no file prepared - doc: ${id} - ti: ${req.transid}`);

        return Promise.resolve('No Python file available');
    }

    utils.logInfo(`$nodepy.file (npcodefile): file prepared - doc: ${id} - ti: ${req.transid}`);

    return Promise.resolve(base64decode(nodepyJob.code));
};
