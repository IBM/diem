import { IntPythonStmtJob } from '../../np.interfaces';
import { py_stmt_services } from '../python.code/py';

export const handleNodePyServicesStmtJob: (code: string, job: IntPythonStmtJob) => Promise<string> = async (
    code: string,
    job: IntPythonStmtJob
): Promise<string> => {
    const pystmt: string = await py_stmt_services(job);

    return Promise.resolve(`${code}\n${pystmt}`);
};
