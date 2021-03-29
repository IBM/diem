import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IResponse, IError } from '@interfaces';
import { FaIcons, IProfileModel, ProfileModel, IProfileBody, IUserModel, UserModel, IProfilesBody } from '@models';
import { addTrace } from '../shared/functions';

export const newUser: (body: IProfileBody) => Promise<any> = async (body: IProfileBody) => {
    const doc: IUserModel = new UserModel({
        annotations: {
            createdbyemail: body.user,
            createdbyname: body.username,
            createddate: new Date(),
            modifiedbyemail: body.user,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        },
        email: body.email.toLowerCase().trim(),
        org: body.org,
        role: body.role,
    });

    let users: any;

    try {
        users = await doc.save();
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $users (newUser) - save');
        if (err.errmsg) {
            err.displayerr = 'Sorry, this name is already in the users list and cannot be added twice';
        } else {
            void utils.logError(`$users (newUser): save failed for doc ${doc.email} failed`, err);
        }

        return Promise.reject(err);
    }

    try {
        await ProfileModel.updateOne(
            {
                email: doc.email,
            },
            {
                email: doc.email,
                modifieddate: new Date(),
                org: doc.org,
                role: doc.role,
            },
            {
                upsert: true,
            }
        ).exec();
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $users (newUser) - update');

        return Promise.reject(err);
    }

    const payload: IntPayload[] = [
        {
            key: 'email',
            loaded: true,
            store: body.store /** not used as forcestore is enabled */,
            type: EStoreActions.ADD_STORE_RCD,
            values: {
                createddate: doc.annotations.createddate,
                deleteicon: `${FaIcons.deleteicon}`,
                editicon: `${FaIcons.editicon}`,
                email: doc.email,
                id: users._id,
                org: doc.org,
                role: doc.role,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'jobection Created',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

const updateUser: (body: IProfileBody) => Promise<any> = async (
    body: IProfileBody
): Promise<IntServerPayload | Error> => {
    /* get the id here */

    const doc: IUserModel | null = await UserModel.findOne({ email: body.email, org: body.org }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'The document to update could not be found',
            trace: ['@at $user (updateUser)'],
        });
    }

    doc.set({
        ...body,
        annotations: {
            createdbyemail: doc.annotations.createdbyemail || body.user,
            createdbyname: doc.annotations.createdbyname || body.username,
            createddate: doc.annotations.createddate || new Date(),
            modifiedbyemail: body.user,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        },
    });

    await doc.save().catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $users (updateUser) - save');

        return Promise.reject(err);
    });

    try {
        const profileDoc: IProfileModel | null = await ProfileModel.findOne({
            email: body.email,
            org: body.org,
        }).exec();

        if (profileDoc) {
            profileDoc.role = doc.role;

            await profileDoc.save().catch(async (err) => {
                err.trace = addTrace(err.trace, '@at $users (newUser) - profile');

                return Promise.reject(err);
            });

            utils.logInfo(`$users (actionUpdate): profile updated - email: ${body.email}`);
        }

        const payload: IntPayload[] = [
            {
                key: 'email',
                loaded: true,
                options: {
                    field: 'users',
                },
                store: body.store /** not used as forcestore is enabled */,
                type: EStoreActions.UPD_STORE_RCD,
                values: {
                    ...body,
                    id: body.id,
                },
            },
        ];

        const serverPayload: IntServerPayload = {
            message: 'Job Updated',
            payload,
            success: true /** just display a success message */,
        };

        return Promise.resolve(serverPayload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $users (newUser) - final');

        return Promise.reject(err);
    }
};

export const newuser: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IProfileBody = { ...req.body };

    const email: string = req.user.email;

    body.user = email; // to differentiate with email
    body.username = req.user.name; // to differentiate with email

    body.transid = req.transid;

    body.org = req.user.org;

    try {
        const payload: IntServerPayload = await newUser(body);

        utils.logInfo(`$users (mewuser): new user - email: ${email}`, req.transid, process.hrtime(hrstart));

        return Promise.resolve(payload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $users (newuser)');
        // error already constructed in the newUser

        return Promise.reject(err);
    }
};

export const updateuser: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IProfileBody = { ...req.body };

    const email: string = req.user.email;

    body.transid = req.transid;
    body.user = email;
    body.username = req.user.name;
    body.org = req.user.org;

    try {
        const payload: IntServerPayload = await updateUser(body);

        utils.logInfo(`$users (updateuser): updated user - email: ${email}`, req.transid, process.hrtime(hrstart));

        return Promise.resolve(payload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $users (updateuser)');
        err.email = email;

        return Promise.reject(err);
    }
};

export const deleteuser: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IProfileBody = { ...req.body };

    const email: string = req.user.email;

    body.org = req.user.org;

    try {
        /** this needs to be rewritten
         * we need first to find the count of all user documents
         * if the count is 1 then we can remove user as well as profile
         *
         * if the count is more then one we need to remove the user document related to that org
         * but we need to update the profile to another group
         *
         * so we can flter that group to
         * 1 find the id of the job to be deleted
         * 2 to find the if of the first job that is ok to be used
         *
         */

        await UserModel.deleteOne({ _id: body.id, org: body.org })
            .exec()
            .catch(async (err: IError) => {
                err.trace = ['@at $user (deleteuser) - User'];
                err.id = body.email;
                err.org = body.org;
                err.message = 'This document could not be found';

                return Promise.reject(err);
            });

        utils.logInfo(`$users (deleteuser): removed user - email: ${email}`, req.transid, process.hrtime(hrstart));

        const docs: IUserModel[] | null = await UserModel.find({ email: body.email }).exec();

        if (docs === null || docs.length < 1) {
            await ProfileModel.deleteOne({ email: body.email })
                .exec()
                .catch(async (err: IError) => {
                    err.trace = ['@at $user (deleteuser) - Profile'];
                    err.id = body.email;
                    err.org = body.org;
                    err.message = 'This document could not be found';

                    return Promise.reject(err);
                });
        } else {
            const firstDoc: IUserModel = docs[0];

            await ProfileModel.updateOne(
                {
                    email: body.email,
                },
                {
                    email: body.email,
                    modifieddate: new Date(),
                    org: firstDoc.org,
                    role: firstDoc.role,
                },
                {
                    upsert: true,
                }
            ).exec();

            utils.logInfo(
                `$users (deleteuser): updated profile - email: ${email}`,
                req.transid,
                process.hrtime(hrstart)
            );
        }

        const payload: IntPayload[] = [
            {
                key: 'id',
                loaded: true,
                store: body.store /** not used as forcestore is enabled */,
                type: EStoreActions.REM_STORE_RCD,
                values: {
                    ...body,
                    id: body.id,
                },
            },
        ];

        const serverPayload: IntServerPayload = {
            message: 'Profile Deleted',
            payload,
            success: true /** just display a success message */,
        };

        utils.logInfo(`$users (deleteuser): removed user - email: ${email}`, req.transid, process.hrtime(hrstart));

        return Promise.resolve(serverPayload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $users (deleteuser)');
        void utils.logError('$users (jobupdates): error', err);

        return Promise.reject(err);
    }
};

export const userProfile: (body: { user: string; transid: string }) => Promise<any> = async (body: {
    user: string;
    transid: string;
}): Promise<{ orgs?: any[]; profile?: any }> => {
    const hrstart: [number, number] = process.hrtime();

    const email: string = body.user;

    const d1: Promise<IUserModel[] | null> = UserModel.find({ email }).sort({ org: 1 }).exec();
    const d2: Promise<IProfileModel | null> = ProfileModel.findOne({ email }).exec();

    try {
        const dbjobs: [IUserModel[] | null, IProfileModel | null] = await Promise.all([d1, d2]);

        if (!dbjobs[0] || !dbjobs[1]) {
            utils.logInfo(
                `$users (getProfile): no profile found -  user: ${email}`,
                body.transid,
                process.hrtime(hrstart)
            );

            return Promise.resolve({});
        }

        const orgs: any[] = [];

        dbjobs[0].forEach((job: IUserModel) => {
            orgs.push({
                createdbyemail: job.annotations.createdbyemail,
                createddate: job.annotations.createddate,
                email: job.email,
                org: job.org,
                role: job.role,
            });
        });

        utils.logInfo(
            `$users (userprofile): profile retrieved - email: ${email}`,
            body.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve({
            orgs,
            profile: dbjobs[1].toObject(),
        });
    } catch (err) {
        return Promise.resolve({});
    }
};

export const updateprofile: (req: IRequest, res: IResponse) => Promise<any> = async (
    req: IRequest,
    res: IResponse
): Promise<any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IProfilesBody = { ...req.body };

    const email: string = req.user.email;

    const org: string = body.org.toLowerCase();

    /**
     * We have the new org from the body
     * we have the user from the req
     *
     * let's first check if the requested org exists for that user
     * then we can update the profile with the new users
     *
     * then we return a somple ok
     *
     */

    const d1: IUserModel | null = await UserModel.findOne({ email, org }).exec();

    if (d1) {
        utils.logInfo(
            `$users (updateprofile): profile found - email: ${email} - org: ${org}`,
            req.transid,
            process.hrtime(hrstart)
        );
    } else {
        utils.logInfo(
            `$users (updateprofile): no profile found - email: ${email} - org: ${org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.reject({
            displayerr: `The profile for the organization: ${org} cannot be found`,
        });
    }

    try {
        await ProfileModel.updateOne(
            {
                email,
            },
            {
                email,
                modifieddate: new Date(),
                org: d1.org,
                role: d1.role,
            },
            {
                upsert: true,
            }
        ).exec();

        utils.logInfo(`$users (updateprofile): profile updated - email: ${email} - org: ${d1.org}`);

        res.cookie(`${utils.Env.appcookie}`, req.cookies[utils.Env.appcookie], {
            maxAge: 100,
            secure: true,
        });

        return Promise.resolve({ ok: true });
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $users (updateprofile)');

        return Promise.reject(err);
    }
};

export const listprofile: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IProfilesBody = { ...req.body };

    const email: string = req.user.email;

    body.user = email;

    body.role = req.user.xorg.current.role;

    if (!body.id) {
        return Promise.reject({
            return: { message: 'No or incorrect Document ID Provided' },
            status: 404,
        });
    }

    body.org = req.user.org;

    if (body.id === 'profile') {
        body.id = body.user;
    }

    const userprofile: { orgs?: any[]; profile?: any } = await userProfile({
        user: body.id,
        transid: body.transid,
    });

    const userprofiletable: any = userprofile.orgs;

    const user: any = userprofile.profile;

    utils.logInfo(`$user (listuser) - email: ${body.id}}`, body.transid, process.hrtime(hrstart));

    return Promise.resolve({
        ...user,
        id: body.id,
        org: body.org,
        orgs: userprofiletable,
    });
};
