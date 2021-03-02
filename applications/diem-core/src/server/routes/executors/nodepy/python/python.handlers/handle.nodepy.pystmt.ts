import { IntPythonStmtJob } from '../../np.interfaces';
import { py_stmt } from '../python.code/py';

export const handleNodePyStmtJob: (code: string, job: IntPythonStmtJob) => Promise<string> = async (
    code: string,
    job: IntPythonStmtJob
): Promise<string> => {
    const pystmt: string = await py_stmt(job);

    return Promise.resolve(code.replace('######', pystmt));
};
