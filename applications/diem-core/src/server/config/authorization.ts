/* eslint-disable @typescript-eslint/no-unused-vars */
import jwt from 'jsonwebtoken';
import { IntPassportUser, IProfile, IRequest, IXorg } from '@interfaces';
import { utils } from '@common/utils';
import { addTrace } from '@functions';
import { getProfile } from '../routes/profiles/profile';

const makeToken: (user: IntPassportUser, maxAge: number, transid: string) => Promise<any> = async (
    user: IntPassportUser,
    maxAge: number,
    transid: string
): Promise<IProfile> => {
    const xorgprofile: [string[], IXorg] = await getProfile(user.email, transid);

    const profile: IProfile = {
        email: user.email,
        name: user.name,
        roles: xorgprofile[0],
        xorg: xorgprofile[1],
    };

    utils.logInfo(`$authorization (makeToken): signing the token for ${profile.email}`);

    /** adding the roles */

    const jwth: any = {
        alg: 'HS256',
        typ: 'JWT',
    };

    profile.token = jwt.sign(profile, utils.jwtTokenKey, {
        expiresIn: Math.round(maxAge / 1000) /** expires after 5 days, */,
        header: jwth,
    });

    return profile;
};

export const login: (req: IRequest, res: any) => Promise<boolean | Error> = async (
    req: IRequest,
    res: any
): Promise<boolean | Error> => {
    if (!req.user) {
        utils.logInfo(`$authorization (login): ev: 'no session' - ti: ${req.transid}`);

        return Promise.reject({
            message: 'no session',
            trace: ['@at $authorization (login-session)'],
        });
    }

    const email: string = req.user.email;

    if (!email) {
        return Promise.reject({
            message: 'no email',
            trace: ['@at $authorization (login-email)'],
        });
    }

    utils.logGreen(`$authorization (login): user: ${email} - ti: ${req.transid}`);

    const maxAge: number = req.session.cookie.maxAge || 86400000;

    return makeToken(req.user, maxAge, req.transid)
        .then(async (profile: IProfile) => {
            res.cookie(`${utils.Env.appcookie}`, profile.token, {
                maxAge,
                secure: true,
                sameSite: 'strict',
            });
            utils.logGreen(`$authorization (created token): user: ${email} - ti: ${req.transid}`);

            return Promise.resolve(true);
        })
        .catch(async (err) => {
            err.name = '$authorization (login) : error creating token';
            err.trace = addTrace(err.trace, '@at $authorization (login)');

            return Promise.reject(err);
        });
};
