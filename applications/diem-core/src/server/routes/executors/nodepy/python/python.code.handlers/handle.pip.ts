import { addTrace } from '../../../../shared/functions';
import { IJobSchema } from '@models';

const py_pipinstall: (id: string, pip: string[]) => string = (id: string, pip: string[]): string => String.raw`

### py_pipinstall ###

for __pip in ['${pip.join("','")}']:
    try:
        os.system(f"python3 -m pip install {__pip} -q --disable-pip-version-check --target=/home/app/workdir/${id}/")
        mq({"out": f"{__pip} installed"})
    except subprocess.CalledProcessError as e:
        error(e)
######`;

export const handlePip: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    try {
        if (
            doc.job &&
            doc.job.params &&
            doc.job.params.pip &&
            Array.isArray(doc.job.params.pip) &&
            doc.job.params.pip.length > 0
        ) {
            const pipcode: string = py_pipinstall(doc._id.toString(), doc.job.params.pip);
            code = code.replace('######', pipcode);
        }

        return Promise.resolve(code);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.pip (handleNodePyCustomJob)');

        return Promise.reject(err);
    }
};
