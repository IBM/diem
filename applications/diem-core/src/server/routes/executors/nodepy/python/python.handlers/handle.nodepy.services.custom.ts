import { addTrace } from '../../../../shared/functions';
import { IJobSchema } from '../../../../models/models';

export const handleNodePyServicesCustomJob: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    if (!doc.custom || (doc.custom && !doc.custom.code)) {
        return Promise.resolve(code);
    }

    try {
        const custom: string = `### custom ###\n${doc.custom.code}\n\n######`;

        code = code.replace('######', custom);

        return Promise.resolve(code);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.custom (handleNodePyCustomJob)');

        return Promise.reject(err);
    }
};
