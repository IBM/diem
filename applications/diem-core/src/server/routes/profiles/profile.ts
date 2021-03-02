import { utils } from '@common/utils';
import { IXorg } from '@interfaces';
import { IUserModel, UserModel, EUserRolesNbr } from '../models/model.profiles';
import { IProfileModel, ProfileModel } from '../models/model.profile';

const calcRoleNbr: (role: string) => number = (role: string) => EUserRolesNbr[role as keyof typeof EUserRolesNbr] || 0;

export const getProfile: (email: string, transid: string) => Promise<[string[], IXorg]> = async (
    email: string,
    transid: string
): Promise<[string[], IXorg]> => {
    const hrstart: [number, number] = process.hrtime();

    const d1: Promise<IUserModel[] | null> = UserModel.find({ email }).sort({ org: 1 }).exec();
    const d2: Promise<IProfileModel | null> = ProfileModel.findOne({ email }).exec();

    const roles: string[] = ['authenticated', 'consent'];

    const xorg: IXorg = {
        current: {
            org: '',
            role: '',
            rolenbr: 0,
        },
        orgs: [],
    };

    try {
        const dbjobs: [IUserModel[] | null, IProfileModel | null] = await Promise.all([d1, d2]);

        if (!dbjobs[0] || !dbjobs[1]) {
            utils.logInfo(`$users (getProfile): no profile found -  user: ${email}`, transid, process.hrtime(hrstart));

            return Promise.resolve([roles, xorg]);
        }

        roles.push('authorized');

        const orgs: string[] = [];

        dbjobs[0].forEach((org: IUserModel) => {
            orgs.push(org.org);
        });

        xorg.current.org = dbjobs[1].org;
        xorg.current.role = dbjobs[1].role;
        xorg.current.rolenbr = calcRoleNbr(dbjobs[1].role);
        xorg.orgs = orgs;

        utils.logInfo(
            `$users (getProfile): ${xorg.current.org} profile found for user: ${email}`,
            transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve([roles, xorg]);
    } catch (err) {
        return Promise.resolve([roles, xorg]);
    }
};
