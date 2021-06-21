/* eslint-disable complexity */
import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IError } from '@interfaces';
import { parse, stringify } from 'yaml';
import { addTrace } from '@functions';
import { IWebApikeysBody, IWebApikeysModel, WebApikeysModel, FaIcons, EIdType, UserModel } from '@models';
import { createJWT } from './webapikeys.jwt';

export const webapikeyupdate: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();
    const managerSecurity: number = 80;

    const body: IWebApikeysBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;
    body.org = req.user.org;

    let id: string;
    let isnew: boolean = false;
    let doc: IWebApikeysModel | null;

    if (!body.id) {
        isnew = true;
        doc = new WebApikeysModel({ _id: utils.guid() });

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

        id = doc._id;
    } else {
        id = body.id;
        doc = await WebApikeysModel.findOne({ 'project.org': body.org, _id: body.id }, {}).exec();

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
    doc.description = body.description;
    doc.idtype = body.idtype || doc.idtype;
    doc.selector = body.selector;

    if (!body.params) {
        doc.params = {
            email: body.email,
            name: body.name,
            org: body.org,
            uid: body.selector,
            id,
        };
    } else {
        const yaml: any = parse(body.params);
        doc.params = { ...doc.params, ...yaml };
        doc.params.uid = body.selector;
        doc.params.org = body.org;
        doc.params.id = id;
    }

    doc.webapikey = await createJWT(doc.params).catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $webapikeys.actions (webapikeyupdate) - createjwt');

        void utils.logError(`$webapikeys.actions (webapikeyupdate): error creating jwt for ${body.name}`, err);

        return Promise.reject({
            close: false,
            displayerr: err.message,
        });
    });

    if (doc.idtype === EIdType.personal) {
        doc.owner = body.email;
        if (body.owner !== body.email) {
            const exists = await UserModel.exists({ email: body.owner, org: req.user.org });

            if (exists) {
                doc.owner = body.owner;
            }
        }
    }

    await doc.save().catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $webapikeys.actions (webapikeyupdate) - doc save');
        void utils.logError(
            `$webapikeys.actions (webapikeyupdate): webapi updated failed for doc ${body.name} failed`,
            err
        );

        return Promise.reject({
            close: false,
            displayerr: err.message,
        });
    });

    utils.logInfo(
        `$webapikey (webapikeyupdate): webapi updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    let deleteicon;
    let editicon;

    if (
        doc.idtype !== EIdType.personal ||
        req.user.rolenbr >= managerSecurity ||
        (doc.idtype === EIdType.personal && body.email === doc.owner)
    ) {
        deleteicon = `${FaIcons.deleteicon}`;
    }

    if (doc.idtype !== EIdType.personal || (doc.idtype === EIdType.personal && body.email === doc.owner)) {
        editicon = `${FaIcons.editicon}`;
    }

    if (doc.idtype && doc.idtype === EIdType.personal && body.email !== doc.owner) {
        doc.webapikey = '/* redacted */';
    }

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'webapikey',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: isnew ? EStoreActions.ADD_STORE_RCD : EStoreActions.UPD_STORE_RCD,
            values: {
                createdby: doc.owner || doc.annotations.createdbyemail,
                createddate: doc.annotations.createddate.toISOString(),
                deleteicon,
                description: doc.description,
                editicon,
                id: doc._id.toString(),
                idtype: doc.idtype,
                name: doc.name,
                org: doc.project.org,
                params: stringify(doc.params),
                webapikey: doc.webapikey,
                selector: doc.selector,
                viewicon: `${FaIcons.viewicon}`,
                owner: doc.owner || null,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'WebApikeys Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const webapikeydelete: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IWebApikeysBody = { ...req.body };

    await WebApikeysModel.deleteOne({ 'project.org': req.user.org, _id: body.id })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $webapikey (webapikeydelete)'];
            err.message = 'The document to delete could not be found';
            err.id = body.id;

            return Promise.reject(err);
        });

    utils.logInfo(
        `$webapikey (webapikeydelete): webapikey updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'webapikey',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: EStoreActions.REM_STORE_RCD,
            values: {
                id: body.id,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'WebApikeys Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
