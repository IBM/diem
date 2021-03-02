import { IntPythonRestJob } from '../../np.interfaces';
import { py_rest_services } from '../python.code/py';

export const handleNodePyServicesRestJob: (code: string, job: IntPythonRestJob) => Promise<string> = async (
    code: string,
    job: IntPythonRestJob
): Promise<string> => {
    const rest: string = py_rest_services(job);

    return Promise.resolve(`${code} \n${rest}`);
};
