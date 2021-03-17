import { IntPythonStmtJob } from '../../np.interfaces';
import { py_select_services } from '../python.code/py';

export const handleNodePyServicesSelect: (code: string, job: IntPythonStmtJob) => Promise<string> = async (
    code: string,
    job: IntPythonStmtJob
): Promise<string> => {
    const pyselect: string = await py_select_services(job);

    return Promise.resolve(`${code}\n${pyselect}`);
};
