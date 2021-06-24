import jwt from 'jsonwebtoken';
import { IntPassportUser, IRequest, IResponse } from '@interfaces';
import { utils } from '@common/utils';
import { IWebApikeysModel, WebApikeysModel } from '@models';

const getToken: (id: string) => Promise<boolean> = async (id: string): Promise<boolean> => {
    const hrstart: [number, number] = process.hrtime();

    try {
        const doc: IWebApikeysModel | null = await WebApikeysModel.findOne({ _id: id }, {}).exec();

        if (!doc) {
            utils.logInfo('$webapikeys.jwtcheck (getToken) - invalid token', `api: ${id}`, process.hrtime(hrstart));

            return Promise.reject({ message: 'Api could not be found' });
        }

        const data: string = doc.webapikey;
        utils.logInfo('$webapikeys.jwtcheck (getToken)', `api: ${id}`, process.hrtime(hrstart));
        /** cache the request response  */

        if (data) {
            return Promise.resolve(true);
        } else {
            return Promise.reject({ message: 'Apikey has no valid data' });
        }
    } catch (err) {
        return Promise.reject({ message: 'Apikey could not be validated' });
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
            .catch((error) => res.status(401).json(error));
    } catch (err) {
        return res.status(403).json({ error: 'Forbidden, invalid API KEY !' });
    }
};
