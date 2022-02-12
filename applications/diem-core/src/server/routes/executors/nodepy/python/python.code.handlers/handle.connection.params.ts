import { ConnModel, IConnSchema } from '@models';
import { regEx, json } from './handle.params.util';

const replaceParams: (code: string, connection: string, org: string) => Promise<string> = async (
    code: string,
    connection: string,
    org: string
) => {
    const doc: IConnSchema | null = await ConnModel.findOne({ 'project.org': org, alias: connection }).lean().exec();

    if (doc === null) {
        return code;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, odbc, __v, annotations, project, ...conn }: any = doc;

    for (const [key, value] of Object.entries(doc)) {
        if (typeof value !== 'object') {
            code = regEx(code, `${connection}_${key}`, value);
        }
    }

    return regEx(code, connection, json(conn));
};

export const handleConnectionParams: (
    code: string,
    connections: string | string[],
    org: string
) => Promise<string> = async (code: string, connections: string | string[], org: string): Promise<string> => {
    if (typeof connections === 'string') {
        code = await replaceParams(code, connections, org);
    }

    // if there's only multiple connections
    if (connections instanceof Array) {
        for await (const connAlias of connections) {
            code = await replaceParams(code, connAlias, org);
        }
    }

    return Promise.resolve(code);
};
