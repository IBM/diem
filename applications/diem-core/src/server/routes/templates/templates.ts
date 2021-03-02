import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { IQuery, ITemplatesModel, TemplatesModel, FaIcons } from '../models/models';
import { parseFilter } from '../jobs/jobs';

const viewSecurity: number = 5;
const editSecurity: number = 60;

interface ITemplatePayload {
    createdby: string;
    createddate: string;
    deleteicon?: string;
    description: string;
    editicon?: string;
    id: string;
    name: string;
    org: string;
    template: string;
    templateid: string;
    type: string;
    viewicon: string;
}

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

export const gettemplates: (req: IRequest) => Promise<ITemplatePayload[]> = async (
    req: IRequest
): Promise<ITemplatePayload[]> => {
    const hrstart: [number, number] = process.hrtime();

    if (req.user.rolenbr < viewSecurity) {
        utils.logInfo(
            `$templates (gettemplates): not allowed - email: ${req.user.email} - role: ${req.user.role} - org: ${req.user.org}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve([]);
    }

    const body: IQuery = { ...req.body };

    body.org = req.user.org;
    body.email = req.user.email;
    body.rolenbr = req.user.rolenbr;

    const filter: any = parseFilter(body);

    const docs: ITemplatesModel[] | [] = await TemplatesModel.find(filter, {}).exec();

    utils.logInfo(
        `$templates (templates) - email: ${body.email} - org: ${body.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: ITemplatePayload[] = [];

    docs.forEach((doc: ITemplatesModel, i: number) => {
        const id: string = doc._id.toString();
        payload[i] = {
            createdby: doc.annotations.createdbyemail,
            createddate: doc.annotations.createddate.toISOString(),

            description: doc.description,

            id,
            templateid: id,
            name: doc.name,
            org: doc.project.org,
            template: doc.template,
            type: doc.type,
            viewicon: `${FaIcons.viewicon}`,
        };

        if (req.user.rolenbr >= editSecurity) {
            payload[i].deleteicon = `${FaIcons.deleteicon}`;
            payload[i].editicon = `${FaIcons.editicon}`;
        }
    });

    return Promise.resolve(payload);
};
