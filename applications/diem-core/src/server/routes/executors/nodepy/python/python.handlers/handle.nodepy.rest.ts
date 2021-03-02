import { IntPythonRestJob } from '../../np.interfaces';
import { py_rest } from '../python.code/py';

export const handleNodePyRestJob: (code: string, job: IntPythonRestJob) => Promise<string> = async (
    code: string,
    job: IntPythonRestJob
): Promise<string> => {
    const rest: string = py_rest(job);

    return Promise.resolve(`${code} \n${rest}`);
};
