import { IJobSchema } from '@models';
import { addTrace } from '@functions';

const py_pipinstall: (id: string, pip: string[]) => string = (_id: string, pip: string[]): string => String.raw`

### py_pipinstall ###

for __pip in ['${pip.join("','")}']:
    try:
        os.system(f"python3 -m pip install {__pip} -q --disable-pip-version-check --prefer-binary --target=./workdir/")
        mq({"out": f"pip: {__pip} installed"})
    except subprocess.CalledProcessError as e:
        error(e)
###__CODE__###`;

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
            code = code.replace('###__CODE__###', pipcode);
        }

        return Promise.resolve(code);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.pip (handleNodePyCustomJob)');

        return Promise.reject(err);
    }
};
