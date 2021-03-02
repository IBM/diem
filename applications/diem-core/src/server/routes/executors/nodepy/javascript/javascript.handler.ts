/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { ECodeLanguage, IETLJob, IJobSchema } from '../../../models/models';
import { base64encode, addTrace } from '../../../shared/functions';
import { INodePyJob } from '../np.interfaces';
import { javascript_start, javascript_end } from './javascript.code/js';

/**
 *
 *
 * @param {IJobSchema} doc
 * @param {IETLJob} job
 * @returns {(Promise<INodePyJob | undefined>)}
 */
export const javascriptHandler: (doc: IJobSchema, job: IETLJob) => Promise<INodePyJob> = async (
    doc: IJobSchema,
    job: IETLJob
): Promise<INodePyJob> => {
    try {
        let code: string = javascript_start(job);

        if (doc.custom?.code) {
            code = code.replace('/* ###### */', `\n${doc.custom.code}\n/* ###### */`);
        }

        code = code.replace('/* ###### */', javascript_end);

        const regExp: string | RegExp = new RegExp('__\\\\', 'ig');
        code = code.replace(regExp, '');

        // we need to base64encode this file
        const nodepy: INodePyJob = {
            ...job,
            language: ECodeLanguage.javascript,
            code: base64encode(code),
        };

        return Promise.resolve(nodepy);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.nodepy (handleNodePy)');
        err.message = `No nodepy job could be created for doc: ${doc.name} - name: ${doc.name}`;

        return Promise.reject(err);
    }
};
