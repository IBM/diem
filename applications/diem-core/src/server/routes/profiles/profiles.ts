import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { IUserSchema, UserModel, ProfilePayloadValues, IQuery, FaIcons, IProfilesBody } from '@models';
import { addTrace } from '@functions';
import { userProfile } from './profile.actions';

const viewSecurity: number[] = [100, 80, 40, 20, 10, 5, 1];
const editSecurity: number[] = [100, 80, 1];

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

            /**
             * security
             *
             * @remarks
             * user needs to be orgmanager(1) or having more then 60
             */
            if (body.rolenbr && editSecurity.includes(body.rolenbr)) {
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

    const body: IProfilesBody = req.body.query ? req.body.query : req.body;

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

    body.org = req.user.org;
    body.rolenbr = req.user.rolenbr;
    body.user = req.user.email;

    if (!viewSecurity.includes(body.rolenbr)) {
        utils.logInfo(
            `$profiles (listprofiles): not allowed - email: ${req.user.email} - role: ${req.user.role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve({});
    }

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
