import jwt from 'jsonwebtoken';
import { IntPassportUser, IRequest, IResponse } from '@interfaces';
import { utils } from '@common/utils';
import { IWebApikeysModel, WebApikeysModel } from '@models';

const getToken: (id: string) => Promise<boolean> = async (id: string): Promise<boolean> => {
    // eslint-disable-next-line no-async-promise-executor

    const hrstart: [number, number] = process.hrtime();

    try {
        const doc: IWebApikeysModel | null = await WebApikeysModel.findOne({ _id: id }, {}).exec();

        if (!doc) {
            return Promise.reject({ message: 'Api could not be found', id });
        }

        const data: string = doc.webapikey;
        utils.logInfo('$webapikeys.jwtcheck (getToken)', `api: ${id}`, process.hrtime(hrstart));
        /** cache the request response  */

        if (data) {
            return Promise.resolve(true);
        } else {
            return Promise.reject({ message: 'Apikey could not be found', id });
        }
    } catch (err) {
        await utils.logError('$token (getToken): error', {
            caller: '$webapikeys.jwtcheck',
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

const verifyToken: (token: IntPassportUser) => Promise<boolean> = async (token: IntPassportUser): Promise<boolean> =>
    new Promise((resolve, reject) => {
        getToken(token.id)
            .then((valid: boolean) => resolve(valid))
            .catch((invalid: boolean) => reject(invalid));
    });

export const jwtCheck: (req: IRequest, res: IResponse, next: any) => Promise<any> = async (
    req: IRequest,
    res: IResponse,
    next: any
) => {
    const apiKey: undefined | string | string[] = req.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
        return res.status(403).json({ error: 'Forbidden, no api key or valid api key' });
    }

    try {
        const z: any = jwt.decode(apiKey);

        if (!z || typeof z === 'string') {
            return res.status(403).json({ error: 'Forbidden, no id on this token' });
        }

        const profile: IntPassportUser = z;

        return verifyToken(profile)
            .then(() => {
                req.user = profile;
                req.token = profile;
                utils.logCyan(
                    `$webapikeys.jwtcheck (verifyApiToken): api verfied - user: ${req.user.email} - ti: ${req.transid}`
                );

                return next();
            })
            .catch(async (err) => {
                await utils.logMQError(
                    `$webapikeys.jwtcheck (verifyApiToken): api ${apiKey} not allowed - ti: ${req.transid}`,
                    req,
                    401,
                    '$webapikeys.jwtcheck (verifyApiToken)',
                    {
                        apiKey,
                        location: 'verifytoken',
                        message: err.message,
                        name: err.name,
                        caller: '$webapikeys.jwtcheck',
                    }
                );

                return res.status(401).json({ error: 'Not Authorized - wrong api key !' });
            });
    } catch (err) {
        err.caller = '$webapikeys.jwtcheck (verifyInternalApiToken)';

        await utils.logError(
            `$webapikeys.jwtcheck (verifyInternalApiToken):  ev: 'jwt error' - user: api - ti: ${req.transid}`,
            err
        );

        return res.status(403).json({ error: 'Forbidden, invalid API KEY !' });
    }
};
