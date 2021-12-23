import { utils } from '@common/utils';
import { EStoreActions, IError, IntPayload, IntServerPayload, IRequest } from '@interfaces';
import { ConnModel, IConnBody, IConnModel, IConnSchema, FaIcons, EIdType } from '@models';
import { addTrace } from '@functions';

export const connnew: (body: IConnBody) => Promise<any> = async (body: IConnBody) => {
    const input: IConnSchema = {
        ...body,
        annotations: {
            createdbyemail: body.email,
            createdbyname: body.email,
            createddate: new Date(),
            modifiedbyemail: body.email,
            modifiedbyname: body.email,
            modifieddate: new Date(),
            transid: body.transid,
        },
        project: {
            org: body.org,
            orgscope: body.orgscope,
        },
    };

    const doc: IConnModel = new ConnModel(input);

    const docs: any = await doc.save().catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $connection (connnew) - save');
        err.doc = doc._id.toString();

        return Promise.reject(err);
    });

    const payload: IntPayload[] = [
        {
            loaded: true,
            store: 'conn' /** not used as forcestore is enabled */,
            type: EStoreActions.ADD_STORE_RCD,
            values: {
                ...body,
                deleteicon: `${FaIcons.deleteicon}`,
                editicon: `${FaIcons.editicon}`,
                id: docs._id,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Connection Created',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const connupdate: (body: Partial<IConnBody>) => Promise<any> = async (body: Partial<IConnBody>) => {
    /* get the id here */

    if (!body.id) {
        return Promise.reject({
            close: false,
            displayerr: 'No Id Found',
        });
    }

    const id: string = body.id;

    const doc: IConnModel | null = await ConnModel.findOne({ _id: id }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'This document could not be found',
            name: 'Document is Null',
            trace: addTrace([], '@at $connection (connupdate)'),
        });
    }

    if (body.expires && Array.isArray(body.expires) && body.expires.length === 0) {
        body.expires = null;
    }

    // if it's personal and not the user prevent update of password
    if (doc.idtype === EIdType.personal && doc.owner !== body.email) {
        delete body.owner;
        delete body.password;
    }

    doc.set({
        ...body,
        annotations: {
            createdbyemail: doc.annotations.createdbyemail || body.email,
            createdbyname: doc.annotations.createdbyname || body.username,
            modifiedbyemail: body.email,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        },
        project: {
            org: body.org,
            orgscope: body.orgscope,
        },
    });

    await doc.save().catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $connection (connupdate) - save');
        err.doc = id;

        return Promise.reject(err);
    });

    let lock;

    if (doc.idtype === EIdType.personal) {
        lock = 'fas fa-lock';
        if (body.email && body.email === doc.owner) {
            lock = 'fas fa-lock-open';
        }
    }

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            store: 'conn' /** not used as forcestore is enabled */,
            type: EStoreActions.UPD_STORE_RCD,
            values: {
                ...body,
                deleteicon: `${FaIcons.deleteicon}`,
                editicon: `${FaIcons.editicon}`,
                id,
                lock,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Connection Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const connectionupd: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const hrstart: any = process.hrtime();

    const body: IConnBody = { ...req.body };
    body.transid = req.transid;
    body.email = req.user.email;
    body.username = req.user.name;

    body.org = req.user.org;

    try {
        utils.logInfo('$connections (connections)', req.transid, process.hrtime(hrstart));

        if (body.id) {
            return Promise.resolve(await connupdate(body));
        } else {
            return Promise.resolve(await connnew(body));
        }
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $connection (connections)');

        return Promise.reject(err);
    }
};

export const conndelete: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    /* get the id here */

    const body: IConnBody = { ...req.body };

    await ConnModel.deleteOne({ _id: body.id })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $connection (conndelete)'];
            err.message = 'The document to delete could not be found';
            err.id = body.id;

            return Promise.reject(err);
        });

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            store: 'conn' /** not used as forcestore is enabled */,
            type: EStoreActions.REM_STORE_RCD,
            values: {
                ...body,
                id: body.id,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Connection Deleted',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
