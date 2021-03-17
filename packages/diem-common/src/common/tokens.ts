import { IntPassportUser } from '../interfaces/env';
import { cloudant } from './cloudant';
import { utils } from './utils';
import { Credentials } from './cfenv';

const db: any = cloudant.db.use(Credentials('k8_apidb'));

interface IJWTToken {
    _id: string;
    token: string;
    user: IntPassportUser;
    applications: string[];
}

const authorised: string[] = [];
const rejected: string[] = [];

const getToken: (id: string) => Promise<boolean> = async (id: string): Promise<boolean> => {
    // eslint-disable-next-line no-async-promise-executor

    const hrstart: [number, number] = process.hrtime();

    try {
        const data: IJWTToken = await db.get(id);
        utils.logInfo('$tokens (getToken)', `api: ${id}`, process.hrtime(hrstart));
        /** cache the request response  */

        if (data) {
            authorised.push(id);

            return Promise.resolve(true);
        } else {
            rejected.push(id);

            return Promise.reject(false);
        }
    } catch (err) {
        await utils.logError('$token (getToken): error', {
            caller: '$tokens',
            description: err.description,
            error: err.error,
            message: 'token lookup',
            name: err.name,
            reason: err.reason,
            scope: err.scope,
            statusCode: err.statusCode,
            uri: err.request.uri,
        });

        return Promise.reject(false);
    }
};

export const verifyToken: (token: IntPassportUser) => Promise<boolean> = async (
    token: IntPassportUser
): Promise<boolean> =>
    new Promise((resolve, reject) => {
        if (rejected.includes(token.id)) {
            return reject(false);
        }

        if (authorised.includes(token.id)) {
            utils.logInfo('$tokens (verifyToken)', `authorizing from cache - token: ${token.id}`);

            return resolve(true);
        }

        getToken(token.id)
            .then((valid: boolean) => resolve(valid))
            .catch((invalid: boolean) => reject(invalid));
    });
