import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { IOrgsModel, OrgsModel, FaIcons, IProfilesBody, IUserSchema, UserModel } from '@models';
import { addTrace } from '@functions';

const viewSecurity: number[] = [100, 80, 40, 20, 10, 5, 1];
const editSecurity: number[] = [100, 80, 1];

interface IntOrgsPayload {
    createdby: string;
    createddate: string;
    deleteicon?: string;
    description: string;
    editicon?: string;
    id: string;
    org: string;
    viewicon: string;
    href: string;
}

export const listorgs: (req: IRequest) => Promise<IntOrgsPayload[] | unknown> = async (
    req: IRequest
): Promise<IntOrgsPayload[] | unknown> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IProfilesBody = { ...req.body };

    body.org = req.user.org;
    body.rolenbr = req.user.rolenbr;
    body.user = req.user.email;

    if (!viewSecurity.includes(body.rolenbr)) {
        utils.logInfo(
            `$orgs (listorgs): not allowed - email: ${req.user.email} - role: ${req.user.role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve({});
    }

    let docs: IOrgsModel[] | [] = [];

    if (body.rolenbr === 100) {
        docs = await OrgsModel.find({}, {})
            .exec()
            .catch(async (err: any) => {
                err.trace = addTrace(err.trace, '@at $orgs (listorgs) - admin');

                return Promise.reject(err);
            });
    } else {
        const myorgs: IUserSchema[] = await UserModel.find({ email: body.user }, { org: 1 }).lean().exec();

        const myorgsl: string[] = myorgs.map((myorg: IUserSchema) => myorg.org);

        docs = await OrgsModel.find({ org: { $in: myorgsl } }, {})
            .exec()
            .catch(async (err: any) => {
                err.trace = addTrace(err.trace, '@at $orgs (listorgs) - user');

                return Promise.reject(err);
            });
    }

    utils.logInfo(`$Orgs (Orgs) - email: ${req.user.email}}`, req.transid, process.hrtime(hrstart));

    const payload: IntOrgsPayload[] = [];

    docs.forEach((doc: IOrgsModel, i: number) => {
        payload[i] = {
            createddate: doc.annotations.createddate.toISOString(),
            createdby: doc.annotations.createdbyemail,
            description: doc.description,
            href: `/organization/${doc.org}`,
            id: doc._id.toString(),
            org: doc.org,
            viewicon: `${FaIcons.viewicon}`,
        };

        /**
         * security
         *
         * @remarks
         * user needs to be orgmanager(1) or having more then 60
         */
        if (editSecurity.includes(body.rolenbr)) {
            payload[i].deleteicon = `${FaIcons.deleteicon}`;
            payload[i].editicon = `${FaIcons.editicon}`;
        }
    });

    return Promise.resolve(payload);
};
