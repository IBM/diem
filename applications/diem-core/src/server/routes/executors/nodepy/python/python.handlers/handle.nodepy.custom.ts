import { addTrace } from '@functions';
import { IJobSchema } from '@models';

const py_end: () => string = (): string => String.raw`
### py_end ###

time.sleep(0.1)
endjob()

###__CODE__###`;

export const handleNodePyCustomJob: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    if (!doc.custom || (doc.custom && !doc.custom.code)) {
        return Promise.resolve(code);
    }

    try {
        const custom: string = `### custom ###\n${doc.custom.code}\n\n###__CODE__###`;

        code = code.replace('###__CODE__###', custom);

        code = code.replace('###__CODE__###', py_end());

        return Promise.resolve(code);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.custom (handleNodePyCustomJob)');

        return Promise.reject(err);
    }
};
