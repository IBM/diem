/* eslint-disable @typescript-eslint/no-unused-vars */
import { IConfigmapsModel, ConfigmapsModel } from '../../../../models/models';
import { regEx } from './handle.params.util';

const replace: (code: string, configmap: string, org: string) => Promise<string> = async (
    code: string,
    configmap: string,
    org: string
) => {
    const doc: IConfigmapsModel | null = await ConfigmapsModel.findOne({
        selector: configmap,
        'project.org': org,
    }).exec();

    if (doc === null) {
        return code;
    }

    if (!doc.configmap) {
        return code;
    }

    for (const [key, value] of Object.entries(doc.configmap)) {
        if (typeof value !== 'object') {
            code = regEx(code, `${configmap}_${key}`, value);
        }
    }

    return Promise.resolve(code);
};

export const handleConfigmapsParams: (
    code: string,
    configmaps: string | string[],
    org: string
) => Promise<string> = async (
    code: string,
    configmaps: string | string[],
    org: string
    // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<string> => {
    if (typeof configmaps === 'string') {
        code = await replace(code, configmaps, org);
    }

    // if there's only multiple confimaps
    if (configmaps instanceof Array) {
        for await (const configmap of configmaps) {
            code = await replace(code, configmap, org);
        }
    }

    return Promise.resolve(code);
};
