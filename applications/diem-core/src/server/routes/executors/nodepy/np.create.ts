import { IError } from '@interfaces';
import { ECodeLanguage, IJobSchema } from '@models';
import { addTrace } from '@functions';
import { javascriptHandler } from './javascript/javascript.handler';
import { INodePyJob } from './np.interfaces';
import { nodePyRequestJob } from './np.publish';
import { pythonHandler } from './python/python.handler';

export const createNodePyJob: (doc: IJobSchema) => Promise<void> = async (doc: IJobSchema): Promise<void> => {
    let nodepyJob: INodePyJob | undefined;

    if (doc.custom?.executor === ECodeLanguage.javascript) {
        nodepyJob = await javascriptHandler(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $nodepy.file (createNodePyJob) - javascriptHandler');

            return Promise.reject(err);
        });
        if (nodepyJob) {
            nodepyJob.language = ECodeLanguage.javascript;
        }
    } else {
        nodepyJob = await pythonHandler(doc).catch(async (err: IError) => {
            err.trace = addTrace(err.trace, '@at $nodepyjob (createNodePyJob) - pythonHandler');

            return Promise.reject(err);
        });
        if (nodepyJob) {
            nodepyJob.language = ECodeLanguage.python;
        }
    }

    if (nodepyJob?.language) {
        void nodePyRequestJob(nodepyJob); // don't do anything here.. errors are handled via socket
    }

    return Promise.resolve();
};
