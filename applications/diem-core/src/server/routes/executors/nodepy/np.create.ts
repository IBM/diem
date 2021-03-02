import { IError } from '@interfaces';
import { ECodeLanguage, IETLJob, IModel } from '../../models/models';
import { addTrace } from '../../shared/functions';
import { javascriptHandler } from './javascript/javascript.handler';
import { INodePyJob } from './np.interfaces';
import { nodePyPostJob } from './np.postjob';
import { pythonHandler } from './python/python.handler';

export const createNodePyJob: (doc: IModel, job: IETLJob) => Promise<void> = async (
    doc: IModel,
    job: IETLJob
): Promise<void> => {
    let nodepyJob: INodePyJob | undefined;

    if (doc.custom?.executor === ECodeLanguage.javascript) {
        nodepyJob = await javascriptHandler(doc, job).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $nodepy.file (createNodePyJob) - javascriptHandler');

            return Promise.reject(err);
        });
        if (nodepyJob) {
            nodepyJob.language = ECodeLanguage.javascript;
        }
    } else {
        nodepyJob = await pythonHandler(doc, job).catch(async (err: IError) => {
            err.trace = addTrace(err.trace, '@at $nodepyjob (createNodePyJob) - pythonHandler');

            return Promise.reject(err);
        });
        if (nodepyJob) {
            nodepyJob.language = ECodeLanguage.python;
        }
    }

    if (nodepyJob?.language) {
        void nodePyPostJob(nodepyJob); // don't do anything here.. errors are handled via socket

        return Promise.resolve();
    }
};
