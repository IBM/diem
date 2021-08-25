import { IError, IRequest } from '@interfaces';
import { DataModel, ECodeLanguage, IJobSchema } from '@models';
import { addTrace, base64decode } from '@functions';
import { utils } from '@common/utils';
import { javascriptHandler } from './javascript/javascript.handler';
import { INodePyJob } from './np.interfaces';
import { nodePyRequestJob } from './np.request';
import { pythonHandler } from './python/python.handler';

const prepareNodePyJob: (id: string) => Promise<INodePyJob> = async (id: string): Promise<INodePyJob> => {
    const doc: IJobSchema | null = await DataModel.findOne({ _id: id })
        .lean()
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $np.create (prepareNodePyJob) - findOne');

            return Promise.reject(err);
        });

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $np.create (prepareNodePyJob) - null document'],
        });
    }

    let nodepyJob: INodePyJob;

    if (doc.custom?.executor === ECodeLanguage.javascript) {
        nodepyJob = await javascriptHandler(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $np.create (prepareNodePyJob) - javascriptHandler');

            return Promise.reject(err);
        });

        nodepyJob.language = ECodeLanguage.javascript;
    } else {
        nodepyJob = await pythonHandler(doc).catch(async (err: IError) => {
            err.trace = addTrace(err.trace, '@at $nodepyjob (prepareNodePyJob) - pythonHandler');

            return Promise.reject(err);
        });

        nodepyJob.language = ECodeLanguage.python;
    }

    if (!nodepyJob) {
        return Promise.reject({
            message: 'no file could be prepared',
            trace: ['@at $np.create (prepareNodePyJob)'],
        });
    }

    return Promise.resolve(nodepyJob);
};

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
            trace: ['@at $np.create (npcodefile) - nodid'],
        });
    }

    const nodepyJob: INodePyJob = await prepareNodePyJob(id).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $np.create (npcodefile) - prepareNodePyJob');

        return Promise.reject(err);
    });

    utils.logInfo(`$nodepy.file (npcodefile): file prepared - doc: ${id} - transid: ${req.transid}`);

    return Promise.resolve(base64decode(nodepyJob.code));
};

export const createNodePyJob: (doc: IJobSchema) => Promise<void> = async (doc: IJobSchema): Promise<void> => {
    const nodepyJob: INodePyJob = await prepareNodePyJob(doc._id.toString()).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $np.create (createNodePyJob) - prepareNodePyJob');

        return Promise.reject(err);
    });

    await nodePyRequestJob(nodepyJob).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $np.create (createNodePyJob) - request');

        return Promise.reject(err);
    });

    return Promise.resolve();
};
