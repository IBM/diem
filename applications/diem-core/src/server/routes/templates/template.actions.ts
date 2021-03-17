import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IError } from '@interfaces';
import { ITemplatesBody, ITemplatesModel, TemplatesModel, FaIcons } from '../models/models';

export const templateupdate: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: ITemplatesBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;
    body.org = req.user.org;

    let id: string;
    let isnew: boolean = false;
    let doc: ITemplatesModel | null;

    if (!body.id) {
        isnew = true;
        doc = new TemplatesModel({});

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
        doc = await TemplatesModel.findOne({ 'project.org': body.org, _id: id }, {}).exec();

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
    doc.annotations.transid = body.transid;
    doc.template = body.template;
    doc.description = body.description;
    doc.type = body.type;

    await doc.save().catch(async (err) => {
        void utils.logError(`$templates (templatesupdate): templates updated failed for doc ${body.name} failed`, err);

        return Promise.reject({
            close: false,
            displayerr: err.message,
        });
    });

    utils.logInfo(
        `$templates (templatesupdate): templates updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            store: body.store /** not used as forcestore is enabled */,
            type: isnew ? EStoreActions.ADD_STORE_RCD : EStoreActions.UPD_STORE_RCD,
            values: {
                viewicon: `${FaIcons.viewicon}`,
                type: doc.type,
                template: doc.template,
                org: doc.project.org,
                name: doc.name,
                id,
                editicon: `${FaIcons.editicon}`,
                description: doc.description,
                deleteicon: `${FaIcons.deleteicon}`,
                createddate: doc.annotations.createddate.toISOString(),
                createdby: doc.annotations.createdbyemail,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Templates Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const templatedelete: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: ITemplatesBody = { ...req.body };
    body.org = req.user.org;

    if (!body.id) {
        return Promise.reject({
            close: false,
            displayerr: 'No Id Found',
        });
    }

    const id: string = body.id;

    await TemplatesModel.deleteOne({ 'project.org': body.org, _id: id })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $templates (templatedelete)'];
            err.message = 'The document to delete could not be found';
            err.id = body.id;

            return Promise.reject(err);
        });

    utils.logInfo(
        `$templates (templatedelete): template updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'templates',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: EStoreActions.REM_STORE_RCD,
            values: {
                id,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Templates Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
