import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IError, IResponse } from '@interfaces';
import { login } from '@config/authorization';
import { IOrgsBody, IOrgsModel, IProfileSchema, IUserSchema, OrgsModel, ProfileModel, UserModel } from '@models';

export const orgdelete: (req: IRequest, res: IResponse) => Promise<IRequest | any> = async (
    req: IRequest,
    res: IResponse
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IOrgsBody = { ...req.body };
    if (!body.id) {
        return Promise.reject({
            displayerr: 'Sorry, no Organisation was provided',
        });
    }

    body.email = req.user.email;

    const orgdoc: IOrgsModel | null = await OrgsModel.findById({ _id: body.id }).exec();

    if (!orgdoc) {
        return Promise.reject({
            displayerr: 'Sorry, this organisation does not exist',
        });
    }

    const org: string = orgdoc.org;

    await OrgsModel.deleteOne({ _id: body.id })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $org.delete (orgdelete) - deleteorg'];
            err.message = 'The document to delete could not be found';
            err.id = org;

            return Promise.reject(err);
        });

    utils.logInfo(
        `$org.delete (Orgdelete): deleted org: ${org} - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    // delete all users with this org profile

    const todelete: {
        acknowledged?: boolean;
        deletedCount?: number;
    } = await UserModel.deleteMany({ org })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $org.delete (orgdelete) - deleteuser'];
            err.message = 'The document to delete could not be found';
            err.id = body.id;

            return Promise.reject(err);
        });

    if (res && todelete.deletedCount) {
        utils.logInfo(
            `$org.delete (Orgdelete): Users removed: ${todelete.deletedCount}`,
            req.transid,
            process.hrtime(hrstart)
        );
    }

    // reset the users profile or delete it

    // get all profile that currently have this org active
    const profiles: IProfileSchema[] = await ProfileModel.find({ org }).sort({ email: 1 }).lean().exec();

    utils.logInfo(
        `$org.delete (Orgdelete): profiles to clean: ${profiles.length}`,
        req.transid,
        process.hrtime(hrstart)
    );

    let relogin: boolean = false;

    // for each of the users lookup how many user profiles we still have
    profiles.forEach(async (profile: IProfileSchema) => {
        const email: string = profile.email;

        const users: IUserSchema[] = await UserModel.find({ email }).sort({ email: 1 }).lean().exec();

        if (users && users.length > 1) {
            await ProfileModel.updateOne(
                {
                    email: profile.email,
                },
                {
                    email: profile.email,
                    modifieddate: new Date(),
                    org: users[0].org,
                    role: users[0].role,
                },
                {
                    upsert: false,
                }
            ).exec();

            utils.logInfo(
                `$org.delete (Orgdelete): profile updated - email: ${users[0].email} - new org: ${users[0].org}`,
                req.transid,
                process.hrtime(hrstart)
            );

            relogin = true;
        } else {
            // we delete the profile
            await ProfileModel.deleteOne({ _id: profile._id.toString(), org })
                .exec()
                .catch(async (err: IError) => {
                    err.trace = ['@at $org.delete (deleteuser) - User'];
                    err.id = profile.email;
                    err.org = org;
                    err.message = 'This profile could not be found';

                    return Promise.reject(err);
                });
            utils.logInfo(
                `$org.delete (Orgdelete): profile deleted - email: ${profile.email}`,
                req.transid,
                process.hrtime(hrstart)
            );
        }
    });

    if (relogin) {
        await login(req, res);
    }

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            store: body.store /** not used as forcestore is enabled */,
            type: EStoreActions.REM_STORE_RCD,
            values: {
                id: body.id,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Org Deleted',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
