import { addTrace } from '@functions';
import { IJobSchema, ITemplatesModel } from '@models';
import { lookupTemplate } from '../../../../job.front/job.template';

const py_end: () => string = (): string => String.raw`### handle.nodepy.custom (py_end) ###

time.sleep(1)
endjob()

###__CODE__###`;

export const handleNodePyCustomJob: (code: string, doc: IJobSchema) => Promise<string> = async (
    code: string,
    doc: IJobSchema
): Promise<string> => {
    if (!doc.custom) {
        return Promise.resolve(code);
    }

    let custom_code: string | undefined;

    if (doc.custom.code) {
        custom_code = doc.custom.code;
    }

    if (doc.templateid) {
        const templ: ITemplatesModel | null = await lookupTemplate(doc.templateid);

        if (templ?.template) {
            custom_code = templ.template;
        }
    }

    if (!custom_code) {
        return Promise.resolve(code);
    }

    try {
        const custom = `### handle.nodepy.custom (handleNodePyCustomJob) ###\n\n${custom_code}\n\n###__CODE__###`;

        code = code.replace('###__CODE__###', custom);

        code = code.replace('###__CODE__###', py_end());

        return Promise.resolve(code);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $handle.custom (handleNodePyCustomJob)');

        return Promise.reject(err);
    }
};
