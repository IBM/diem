import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload } from '@interfaces';
import { format } from 'sql-formatter';
import { publisher } from '@config/nats_publisher';
import {
    DataModel,
    IJobBody,
    IModel,
    ITemplatesModel,
    TemplatesModel,
    ISocketPayload,
    EJobTypes,
} from '@models';
import { addTrace } from '../shared/functions';

export const lookupTemplate: (id: string) => Promise<ITemplatesModel | null> = async (
    id: string
): Promise<ITemplatesModel | null> => TemplatesModel.findOne({ _id: id }).exec();

const detail_store: string = 'jobdetail.store';
const update_request: string = 'Template Request';

const getTemplate: (body: IJobBody) => Promise<any> = async (body: IJobBody): Promise<any> => {
    /* get the id here */

    // the calling document
    const doc: IModel | null = await DataModel.findOne({ _id: body.id }).exec();

    // the template

    if (doc === null) {
        return Promise.reject({
            message: 'The document to update could not be found',
            name: update_request,
            trace: ['@at $job.template (jobdetail) - doc'],
        });
    }

    const templateid: string | undefined = body.templateid || doc.templateid;

    if (!templateid) {
        return Promise.reject({
            message: 'This document has no template id',
            name: update_request,
            trace: ['@at $job.template (getTemplate) - document'],
        });
    }

    const templ: ITemplatesModel | null = await lookupTemplate(templateid);

    if (!templ) {
        return Promise.reject({
            message: 'This template could not be found',
            name: update_request,
            trace: ['@at $job.template (getTemplate) - templateid'],
        });
    }

    if (!body.template_copy) {
        doc.templateid = templ._id;
    }

    // here remove it
    if (doc.templateid && body.template_copy) {
        doc.templateid = undefined;
    }

    doc.set({
        annotations: {
            createdbyemail: body.email,
            createdbyname: body.username,
            createddate: doc.annotations.createddate,
            modifiedbyemail: body.email,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        },
    });

    let field: string;
    let templatename: string;

    if (doc.type === EJobTypes.pystmt) {
        field = 'stmt__sql';
        templ.template = format(templ.template, { language: 'db2' });
        templatename = 'stmt__templatename';
    } else if (doc.type === EJobTypes.pyspark) {
        field = 'source__sql';
        templ.template = format(templ.template, { language: 'db2' });
        templatename = 'source__templatename';
    } else {
        field = 'custom__code';
        templatename = 'custom__templatename';
    }

    try {
        await doc.save().catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.template (save)');

            return Promise.reject(err);
        });

        const payload: IntPayload[] = [
            {
                key: 'id',
                loaded: true,
                store: detail_store /** not used as forcestore is enabled */,
                targetid: doc.id,
                type: EStoreActions.UPD_STORE_FORM_RCD,
                values: {
                    [templatename]: templ.name,
                    templateid: doc.templateid, // will be undefined if it's copy from
                    [field]: templ.template,
                },
            },
        ];

        const serverPayload: ISocketPayload = {
            org: body.org,
            message: 'Template Added',
            payload,
            success: true /** just display a success message */,
        };

        void publisher.publish_global('users', serverPayload);

        return Promise.resolve(true);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.template (getTemplate)');

        return Promise.reject(err);
    }
};

export const usetemplate: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: [number, number] = process.hrtime();

    const body: IJobBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;

    body.org = req.user.org;

    await getTemplate(body);

    utils.logInfo(`$job.update (jobupdates) document ${body.id} saved`, req.transid, process.hrtime(hrstart));

    return Promise.resolve(true);
};

export const removetemplate: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const body: IJobBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;

    body.org = req.user.org;

    const doc: IModel | null = await DataModel.findOne({ _id: body.id }).exec();

    // the template

    if (doc === null) {
        return Promise.reject({
            message: 'The document to remove the template from ',
            name: update_request,
            id: body.id,
            trace: ['@at $job.template (removetemplate) - doc'],
        });
    }

    const templateid: string | undefined = doc.templateid;

    if (!templateid) {
        return Promise.reject({
            message: 'This document has no template id',
            name: update_request,
            trace: ['@at $job.template (jobdetail) - document'],
        });
    }

    doc.templateid = undefined;

    doc.annotations.modifiedbyemail = body.email;
    doc.annotations.modifiedbyname = body.username;
    doc.annotations.modifieddate = new Date();
    doc.annotations.transid = body.transid;

    let templatename: string;

    if (doc.type === EJobTypes.pystmt) {
        templatename = 'stmt__templatename';
    } else if (doc.type === EJobTypes.pyspark) {
        templatename = 'source__templatename';
    } else {
        templatename = 'custom__templatename';
    }

    try {
        await doc.save().catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.template (save) - removetemplate');

            return Promise.reject(err);
        });

        const payload: IntPayload[] = [
            {
                key: 'id',
                loaded: true,
                store: detail_store /** not used as forcestore is enabled */,
                targetid: doc.id,
                type: EStoreActions.UPD_STORE_FORM_RCD,
                values: {
                    [templatename]: null,
                    templateid: null, // will be undefined if it's copy from
                },
            },
        ];

        const serverPayload: ISocketPayload = {
            org: body.org,
            message: 'Template Removed',
            payload,
            success: true /** just display a success message */,
        };

        void publisher.publish_global('users', serverPayload);

        return Promise.resolve(true);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.template (getTemplate)');

        return Promise.reject(err);
    }
};
