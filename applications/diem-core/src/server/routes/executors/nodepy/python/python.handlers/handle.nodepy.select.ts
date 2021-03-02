import { IntPythonStmtJob } from '../../np.interfaces';
import { py_select } from '../python.code/py';

export const handleNodePySelect: (code: string, job: IntPythonStmtJob) => Promise<string> = async (
    code: string,
    job: IntPythonStmtJob
): Promise<string> => {
    const pyselect: string = await py_select(job);

    return Promise.resolve(`${code}\n${pyselect}`);
};
