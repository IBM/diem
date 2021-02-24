import jwt from 'jsonwebtoken';
import { IRequest, IResponse } from '../interfaces/shared';
import { IntPassportUser } from '../interfaces/env';
import { utils } from './utils';
import { verifyToken } from './tokens';

interface IPRequest extends IRequest {
    isAuthenticated(): boolean;
}

export const verifyInternalApiToken: (req: IRequest, res: IResponse, next: any) => Promise<any> = async (
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

        /** now let's verify if this token has access to our application */

        if (profile.blueGroups && (profile.blueGroups.includes(utils.Env.app) || profile.blueGroups.includes('all'))) {
            req.user = profile;
            req.token = {
                ...profile,
                roles: profile.blueGroups && profile.blueGroups.length > 0 ? profile.blueGroups : [],
            };

            utils.logCyan(
                `$authentication (verifyInternalApiToken): ev: 'jwt verfied' - user: ${req.user.email} - ti: ${req.transid}`
            );

            return next();
        } else {
            utils.logInfo('$tokens (getToken)', `rejected: api not allowed - token: ${profile.id}`);

            return res.status(403).json({ error: `Forbidden, your API does not cover ${utils.Env.app}` });
        }
    } catch (err) {
        err.caller = '$authentication (verifyInternalApiToken)';

        await utils.logError(
            `$authentication (verifyInternalApiToken):  ev: 'jwt error' - user: api - ti: ${req.transid}`,
            err
        );

        return res.status(403).json({ error: 'Forbidden, invalid API KEY !' });
    }
};

export const verifyApiToken: (req: IRequest, res: IResponse, next: any) => Promise<any> = async (
    req: IRequest,
    res: IResponse,
    next: any
) => {
    const apiKey: undefined | string | string[] = req.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
        return res.status(403).json({ error: 'Forbidden, no api key or valid api key' });
    }

    try {
        const z: any = jwt.verify(apiKey, utils.jwtTokenKey);

        if (!z || typeof z === 'string') {
            return res.status(403).json({ error: 'Forbidden, no id on this token' });
        }

        const profile: IntPassportUser = z;

        if (profile.blueGroups && (profile.blueGroups.includes(utils.Env.app) || profile.blueGroups.includes('all'))) {
            return verifyToken(profile)
                .then(() => {
                    req.user = profile;
                    req.token = {
                        ...profile,
                        roles: profile.blueGroups && profile.blueGroups.length > 0 ? profile.blueGroups : [],
                    }; /** For easy access */

                    utils.logCyan(
                        `$authentication (verifyApiToken): api verfied - user: ${req.user.email} - ti: ${req.transid}`
                    );

                    return next();
                })
                .catch(async (err) => {
                    await utils.logMQError(
                        `$authentication (verifyApiToken): api ${apiKey} not allowed - ti: ${req.transid}`,
                        req,
                        401,
                        '$authentication (verifyApiToken)',
                        {
                            apiKey,
                            location: 'verifytoken',
                            message: err.message,
                            name: err.name,
                            caller: '$authentication',
                        }
                    );

                    return res.status(401).json({ error: 'Not Authorized - wrong api key !' });
                });
        } else {
            utils.logInfo('$tokens (getToken)', `rejecting: api not allowed - token: ${profile.id}`);

            return res.status(403).json({ error: 'Forbidden - This api is not allowed to access this application !' });
        }

        /** now let's verify if this token has access to our application */
    } catch (err) {
        await utils.logMQError(
            `$authentication (verifyApiToken):  ev: 'jwt error' - user: api - ti: ${req.transid}`,
            req,
            401,
            '$authentication (verifyApiToken)',
            {
                apiKey,
                location: 'verify',
                message: err.message,
                name: err.name,
                caller: '$authentication',
            }
        );

        return res.status(403).json({ error: 'Forbidden, invalid API KEY !' });
    }
};

export const ensureAuthenticated: (req: IPRequest, res: IResponse, next: any) => any = (
    req: IPRequest,
    res: IResponse,
    next: any
) => {
    if (req.xhr) {
        return;
    }

    if (req.isAuthenticated()) {
        utils.log(
            `$authentication (ensureAuthenticated): ev: 'authenticated user' - ${req.user.email} - ti: ${req.transid}`
        );

        return next();
    } else {
        utils.logWarn(`$authentication (ensureAuthenticated): ev: 'not authenticated' - ti: ${req.transid}`);

        res.redirect('/auth/loginw3');
    }
};
