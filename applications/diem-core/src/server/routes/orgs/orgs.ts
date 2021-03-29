import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { IOrgsModel, OrgsModel, FaIcons, IProfilesBody } from '@models';
import { addTrace } from '../shared/functions';

const viewSecurity: number = 60;
const editSecurity: number = 80;

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

    body.user = req.user.email;

    if (req.user.rolenbr < viewSecurity) {
        utils.logInfo(
            `$orgs (listorgs): not allowed - email: ${req.user.email} - role: ${req.user.role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve({});
    }

    body.org = req.user.org;
    body.rolenbr = req.user.rolenbr;

    const docs: IOrgsModel[] | [] = await OrgsModel.find({}, {})
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $orgs (listorgs)');

            return Promise.reject(err);
        });

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

        if (req.user.rolenbr >= editSecurity) {
            payload[i].deleteicon = `${FaIcons.deleteicon}`;
            payload[i].editicon = `${FaIcons.editicon}`;
        }
    });

    return Promise.resolve(payload);
};
