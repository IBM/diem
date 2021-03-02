import { IConfigmapsModel, ConfigmapsModel } from '../../../../models/models';
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

    return ConfigmapsModel.findOne({ selector: id, 'project.org': org }).exec();
};

export const handleConfigmaps: (code: string, org: string, configmaps: string | string[]) => Promise<string> = async (
    code: string,
    org: string,
    configmaps: string | string[]
): Promise<string> => {
    // const configmaps: any = code.match(/(\b#INCLUDE__\S+\b)/gi);

    if (Array.isArray(configmaps)) {
        // eslint-disable-next-line guard-for-in
        for await (const configmap of configmaps) {
            const doc = await getConfigmap(configmap, org);

            if (doc && doc.configmap) {
                const str: string = String.raw`${json(doc.configmap)}`;
                const code_str: string = `${doc.selector} = ${str}\n######`;

                code = code.replace('######', code_str);
            }
        }

        return Promise.resolve(code);
    } else if (typeof configmaps === 'string') {
        const doc = await getConfigmap(configmaps, org);

        if (doc && doc.configmap) {
            const str: string = String.raw`${json(doc.configmap)}`;
            const code_str: string = `${doc.selector} = ${str}\n######`;

            code = code.replace('######', code_str);

            return Promise.resolve(code);
        }
    }

    return Promise.resolve(code);
};
