import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IError } from '@interfaces';
import { IWebhooksBody, IWebhooksModel, WebhooksModel, FaIcons, EIdType } from '@models';

export const webhookupdate: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IWebhooksBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;

    let id: string;
    let isnew: boolean = false;
    let doc: IWebhooksModel | null;

    if (!body.id) {
        isnew = true;
        doc = new WebhooksModel({});

        doc.annotations = {
            createdbyemail: body.email,
            createdbyname: body.email,
            createddate: new Date(),
            modifiedbyemail: body.email,
            modifiedbyname: body.email,
            modifieddate: new Date(),
            transid: body.transid,
        };
        doc.project = {
            org: req.user.org,
        };

        id = doc._id.toString();
    } else {
        id = body.id;
        doc = await WebhooksModel.findOne({ 'project.org': req.user.org, _id: body.id }, {}).exec();

        if (doc === null) {
            return Promise.reject({
                close: false,
                displayerr: `No Document with id ${id} Found`,
            });
        }

        doc.annotations.modifiedbyname = body.username;
        doc.annotations.modifiedbyemail = body.email;
        doc.annotations.modifieddate = new Date();
        doc.annotations.transid = body.transid;
    }

    doc.name = body.name;
    doc.webhook = body.webhook;
    doc.description = body.description;
    doc.idtype = body.idtype || doc.idtype;
    doc.selector = body.selector;

    if (doc.idtype === EIdType.personal) {
        doc.owner = body.email;
    }

    await doc.save().catch(async (err) => {
        void utils.logError(`$webhooks (webhooksupdate): webhooks updated failed for doc ${body.name} failed`, err);

        return Promise.reject({
            close: false,
            displayerr: err.message,
        });
    });

    utils.logInfo(
        `$webhooks (webhooksupdate): webhooks updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'webhooks',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: isnew ? EStoreActions.ADD_STORE_RCD : EStoreActions.UPD_STORE_RCD,
            values: {
                createdby: doc.annotations.createdbyemail,
                createddate: doc.annotations.createddate.toISOString(),
                deleteicon: `${FaIcons.deleteicon}`,
                description: doc.description,
                editicon: `${FaIcons.editicon}`,
                id: doc._id.toString(),
                idtype: doc.idtype,
                name: doc.name,
                org: doc.project.org,
                webhook: doc.webhook,
                selector: doc.selector,
                viewicon: `${FaIcons.viewicon}`,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Webhooks Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const webhookdelete: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IWebhooksBody = { ...req.body };

    await WebhooksModel.deleteOne({ 'project.org': req.user.org, _id: body.id })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $webhooks (webhookdelete)'];
            err.message = 'The document to delete could not be found';
            err.id = body.id;

            return Promise.reject(err);
        });

    utils.logInfo(
        `$webhooks (webhookdelete): webhook updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'webhooks',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: EStoreActions.REM_STORE_RCD,
            values: {
                id: body.id,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Webhooks Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
