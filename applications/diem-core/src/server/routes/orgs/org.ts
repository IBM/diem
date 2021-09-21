import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { stringify } from 'yaml';
import { IOrg, IUserSchema, OrgsModel, UserModel } from '@models';

interface IOrgPayload {
    email: string;
    org: string;
    transid: string;
}

interface IOrgBody {
    email: string;
    org: string;
    role: string;
    rolenbr: number;
    transid: string;
    id: string;
}

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

// the code below can be deleted once carbon is alive

export const getorg: (body: IOrgPayload) => Promise<IOrg> = async (body: IOrgPayload): Promise<IOrg> => {
    const hrstart: [number, number] = process.hrtime();

    const doc: IOrg | null = await OrgsModel.findOne({ org: body.org }, {}).lean().exec();

    if (doc === null) {
        return Promise.reject({
            id: body.org,
            message: 'The document to update could not be found',
            trace: ['@at $org (getorg)'],
        });
    }

    utils.logInfo(`$orgs (Orgs) - email: ${body.email}}`, body.transid, process.hrtime(hrstart));

    return Promise.resolve(doc);
};

export const listorg: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IOrgBody = { ...req.body };

    body.email = req.user.email;
    body.role = req.user.xorg.current.role;
    body.rolenbr = req.user.rolenbr;

    let org: string = body.id;

    if (!org) {
        return Promise.reject({
            return: { message: 'No or incorrect Document ID Provided' },
            status: 404,
        });
    }

    if (body.id.includes('organization')) {
        utils.logInfo(`$orgs (Orgs) - using default email: ${body.email} - org: ${req.user.org}`, body.transid);
        org = req.user.org;
    }

    if (body.rolenbr !== 100) {
        const myorgs: IUserSchema[] = await UserModel.find({ email: body.email }, { org: 1 }).lean().exec();

        const myorgsl: string[] = myorgs.map((myorg: IUserSchema) => myorg.org);

        if (!myorgsl.includes(org)) {
            utils.logInfo(
                `$org (listorg): not allowed - email: ${req.user.email} - role: ${req.user.role} - org: ${req.user.org}`,
                req.transid,
                process.hrtime(hrstart)
            );

            return Promise.resolve({ description: 'You are not allowed to view this organization' });
        }
    }

    const doc: IOrg | null = await OrgsModel.findOne({ org }, {})
        .lean()
        .exec()
        .catch(async (err: any) => {
            err.trace = ['@at $org (userorg)'];
            err.id = req.user.org;
            err.message = 'The document to update could not be found';

            return Promise.reject(err);
        });

    if (doc === null) {
        return Promise.reject({
            return: { message: `document ${org} not found` },
            status: 404,
        });
    }

    utils.logInfo(`$orgs (Orgs) - email: ${body.email}}`, body.transid, process.hrtime(hrstart));

    return Promise.resolve({
        ...doc.config,
        ...doc.annotations,
        config: stringify(doc.config),
        description: doc.description,
        id: doc._id.toString(),
        org: doc.org,
    });
};
