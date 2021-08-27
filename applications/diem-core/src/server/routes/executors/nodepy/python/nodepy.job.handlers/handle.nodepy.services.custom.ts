import { addTrace } from '@functions';
import { IJobSchema } from '@models';

export const handleNodePyServicesCustomJob: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    if (!doc.custom || (doc.custom && !doc.custom.code)) {
        return Promise.resolve(code);
    }

    try {
        const custom: string = `### handle.nodepy.services.custom (handleNodePyServicesCustomJob) ###\n${doc.custom.code}\n\n###__CODE__###`;

        code = code.replace('###__CODE__###', custom);

        return Promise.resolve(code);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.custom (handleNodePyCustomJob)');

        return Promise.reject(err);
    }
};
