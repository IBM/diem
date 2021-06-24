/* eslint-disable complexity */
import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IError } from '@interfaces';
import { ISnippetsBody, ISnippetsModel, SnippetsModel, FaIcons, EIdType, UserModel } from '@models';

export const snippetupdate: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();
    const managerSecurity: number = 80;

    const body: ISnippetsBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;

    let id: string;
    let isnew: boolean = false;
    let doc: ISnippetsModel | null;

    if (!body.id) {
        isnew = true;
        doc = new SnippetsModel({});

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
        doc = await SnippetsModel.findOne({ 'project.org': req.user.org, _id: body.id }, {}).exec();

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
    doc.snippet = body.snippet;
    doc.description = body.description;
    doc.idtype = body.idtype || doc.idtype;
    doc.selector = body.selector;

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
        void utils.logError(`$snippets (snippetsupdate): snippets updated failed for doc ${body.name} failed`, err);

        return Promise.reject({
            close: false,
            displayerr: err.message,
        });
    });

    utils.logInfo(
        `$snippets (snippetsupdate): snippets updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const lock: string | undefined =
        doc.idtype !== EIdType.personal
            ? undefined
            : body.email && body.email === doc.owner
            ? 'fas fa-lock-open'
            : 'fas fa-lock';

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
        doc.snippet = '/* redacted */';
    }

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'snippets',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: isnew ? EStoreActions.ADD_STORE_RCD : EStoreActions.UPD_STORE_RCD,
            values: {
                createdby: doc.owner || doc.annotations.createdbyemail,
                createddate: doc.annotations.createddate.toISOString(),
                deleteicon,
                description: doc.description,
                editicon,
                id,
                idtype: doc.idtype,
                lock,
                name: doc.name,
                org: doc.project.org,
                snippet: doc.snippet,
                selector: doc.selector,
                viewicon: `${FaIcons.viewicon}`,
                owner: doc.owner || null,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Snippets Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const snippetdelete: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: ISnippetsBody = { ...req.body };

    await SnippetsModel.deleteOne({ 'project.org': req.user.org, _id: body.id })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $snippets (snippetdelete)'];
            err.message = 'The document to delete could not be found';
            err.id = body.id;

            return Promise.reject(err);
        });

    utils.logInfo(
        `$snippets (snippetdelete): snippet updated - email: ${body.email}`,
        req.transid,
        process.hrtime(hrstart)
    );

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'snippets',
            },
            store: body.store /** not used as forcestore is enabled */,
            type: EStoreActions.REM_STORE_RCD,
            values: {
                id: body.id,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        message: 'Snippet Deleted',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
