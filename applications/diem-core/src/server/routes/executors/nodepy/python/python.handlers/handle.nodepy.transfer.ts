/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable max-len */

import { addTrace } from '@functions';
import { IntPythonTransferJob } from '../../np.interfaces';
import { py_transfer } from '../python.code/py';

/**
 *
 * @input job
 * @returns {(Promise<INodePyJob>)}
 * @error {message, connection, trace[]}
 */
export const handleNodePyTransferJob: (code: string, job: IntPythonTransferJob) => Promise<string> = async (
    code: string,
    job: IntPythonTransferJob
): Promise<string> => {
    let pytransfer: string;

    try {
        pytransfer = await py_transfer(job);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle_nodepy.transfer (handleNodePyTransferJob)');

        return Promise.reject(err);
    }

    return Promise.resolve(`${code}\n${pytransfer}`);
};
