import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { IUserSchema, UserModel, ProfilePayloadValues, IQuery, FaIcons } from '@models';
import { addTrace } from '@functions';
import { userProfile } from './profile.actions';

export const getProfiles: (body: IQuery) => Promise<any> = async (body: IQuery) => {
    const users: IUserSchema[] = await UserModel.find({ org: body.org })
        .skip(body.first || 0)
        .limit(body.rows || 0)
        .sort({ email: 1 })
        .lean()
        .exec();

    try {
        const payload: ProfilePayloadValues[] = []; // the payload return array

        users.forEach((row: IUserSchema, i: number) => {
            payload[i] = {
                ...row.annotations,
                email: row.email,
                id: row._id,
                org: row.org,
                role: row.role,
            };

            if (body.rolenbr && body.rolenbr > 60) {
                payload[i].deleteicon = `${FaIcons.deleteicon}`;
                payload[i].editicon = `${FaIcons.editicon}`;
            }
        });

        return Promise.resolve(payload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $profiles (getProfiles)');

        return Promise.reject(err);
    }
};

export const listprofiles: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IQuery = req.body.query ? req.body.query : req.body;

    if (body.id) {
        if (body.id === 'profile') {
            body.id = req.user.email;
        }

        const userprofile: { orgs?: any[]; profile?: any } = await userProfile({
            user: body.id,
            transid: req.transid,
        });

        const userprofiletable: any = userprofile.orgs;

        const user: any = userprofile.profile;

        return Promise.resolve({
            ...user,
            id: body.id,
            org: body.org,
            orgs: userprofiletable,
        });
    }

    body.rolenbr = req.user.rolenbr;
    body.org = req.user.org;

    const users: any[] = await getProfiles(body).catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $profiles (orgusers)');

        return Promise.reject(err);
    });

    users.forEach((user: any) => {
        user.href = `/profile/${user.email}`;
    });

    utils.logInfo(`$profiles (getprofiles): email: ${body.user}`, req.transid, process.hrtime(hrstart));

    return Promise.resolve(users);
};
