import { IConfigmapsModel, ConfigmapsModel } from '@models';
import { json } from './handle.params.util';

export const getConfigmap: (id: string, org: string) => Promise<IConfigmapsModel | null> = async (
    id: string,
    org: string
): Promise<IConfigmapsModel | null> => {
    if (id.includes('sysadmin_')) {
        org = 'sysadmin';
    }
    if (id.includes('sysutil_')) {
        org = 'sysutil';
    }

    return ConfigmapsModel.findOne({ 'project.org': org, selector: id }).exec();
};

export const handleConfigmaps: (code: string, org: string, configmaps: string | string[]) => Promise<string> = async (
    code: string,
    org: string,
    configmaps: string | string[]
): Promise<string> => {
    // const configmaps: any = code.match(/(\b#INCLUDE__\S+\b)/gi);

    if (Array.isArray(configmaps)) {
        for await (const configmap of configmaps) {
            const doc = await getConfigmap(configmap, org);

            if (doc && doc.configmap) {
                const str: string = String.raw`${json(doc.configmap)}`;
                const code_str: string = `${doc.selector} = ${str}\n###__CODE__###`;

                code = code.replace('###__CODE__###', code_str);
            }
        }

        return Promise.resolve(code);
    } else if (typeof configmaps === 'string') {
        const doc = await getConfigmap(configmaps, org);

        if (doc && doc.configmap) {
            const str: string = String.raw`${json(doc.configmap)}`;
            const code_str: string = `${doc.selector} = ${str}\n###__CODE__###`;

            code = code.replace('###__CODE__###', code_str);

            return Promise.resolve(code);
        }
    }

    return Promise.resolve(code);
};
