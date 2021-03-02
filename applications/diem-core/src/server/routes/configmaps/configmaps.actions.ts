/* eslint-disable @typescript-eslint/indent */
import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IError } from '@interfaces';
import { parse, stringify } from 'yaml';
import { IConfigmapsBody, IConfigmapsModel, ConfigmapsModel, FaIcons, EIdType } from '../models/models';

export const configmapupdate: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IConfigmapsBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;

    let id: string;
    let isnew: boolean = false;
    let doc: IConfigmapsModel | null;

    if (!body.id) {
        isnew = true;
        doc = new ConfigmapsModel({});

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
        doc = await ConfigmapsModel.findOne({ 'project.org': req.user.org, _id: id }, {}).exec();

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

    let yaml: any;
    try {
        yaml = parse(body.configmap);
    } catch (err) {
        return Promise.reject({
            status: 301,
            displayerr: `Params parsing error:\n ${err.message || ''}`,
        });
    }

    doc.name = body.name;
    doc.configmap = yaml;
    doc.description = body.description;
    doc.idtype = body.idtype || doc.idtype;
    doc.selector = body.selector;

    if (doc.idtype === EIdType.personal) {
        doc.owner = body.email;
    }

    await doc.save().catch(async (err) => {
        void utils.logError(
            `$configmaps (configmapsupdate): configmaps updated failed for doc ${body.name} failed`,
            err
        );

        return Promise.reject({
            close: false,
            displayerr: err.message,
        });
    });

    utils.logInfo(
        `$configmaps (configmapsupdate): configmaps updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const lock: string | undefined =
        doc.idtype !== EIdType.personal
            ? undefined
            : body.email && body.email === doc.owner
            ? 'fas fa-lock-open'
            : 'fas fa-lock';

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'configmaps',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: isnew ? EStoreActions.ADD_STORE_RCD : EStoreActions.UPD_STORE_RCD,
            values: {
                configmap: stringify(doc.configmap),
                createdby: doc.annotations.createdbyemail,
                createddate: doc.annotations.createddate.toISOString(),
                deleteicon: `${FaIcons.deleteicon}`,
                description: doc.description,
                editicon: `${FaIcons.editicon}`,
                id,
                idtype: doc.idtype,
                lock,
                name: doc.name,
                org: doc.project.org,
                selector: doc.selector,
                viewicon: `${FaIcons.viewicon}`,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'configmaps Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const configmapdelete: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IConfigmapsBody = { ...req.body };

    await ConfigmapsModel.deleteOne({ 'project.org': req.user.org, _id: body.id })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $configmaps (configmapdelete)'];
            err.message = 'The document to delete could not be found';
            err.displayerr = err.message;
            err.close = false;

            return Promise.reject(err);
        });

    utils.logInfo(
        `$configmaps (configmapdelete): configmap updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'configmaps',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: EStoreActions.REM_STORE_RCD,
            values: {
                id: body.id,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'configmaps Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
