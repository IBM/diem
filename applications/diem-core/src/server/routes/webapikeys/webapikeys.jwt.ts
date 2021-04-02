import jwt from 'jsonwebtoken';
import { IWebApiKey } from '@models';
import { utils } from '@common/utils';
import { addTrace } from '../shared/functions';

export const createJWT: (params: IWebApiKey) => Promise<string> = async (params: IWebApiKey): Promise<string> => {
    let webapikey: string;

    utils.logInfo(`$authorization (makeToken): signing the token for ${params.email}`);

    /** adding the roles */

    const jwth: any = {
        alg: 'HS256',
        typ: 'JWT',
    };

    try {
        webapikey = jwt.sign(params, utils.jwtTokenKey, {
            header: jwth,
        });
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $webapikeys.jwt (createJWT)');

        return Promise.reject(err);
    }

    return Promise.resolve(webapikey);
};
