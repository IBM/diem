import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IError, IResponse } from '@interfaces';
import { parse, stringify } from 'yaml';
import { IOrgsBody, IOrgsModel, OrgsModel, FaIcons, IProfileBody } from '@models';
import { addTrace } from '@functions';
import { login } from '@config/authorization';
import { newUser } from '../profiles/profile.actions';

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

export const orgupdate: (req: IRequest, res: IResponse) => Promise<IRequest | any> = async (
    req: IRequest,
    res: IResponse
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: IOrgsBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;

    let id: string;
    let isnew = false;
    let doc: IOrgsModel | null = null;

    let org: string | undefined = body.org;

    if (!org) {
        return Promise.reject({
            displayerr: 'Sorry, this request has no organisation',
        });
    }

    org = org.toLocaleLowerCase();

    if (!body.id) {
        doc = await OrgsModel.findOne({ org }, {}).exec();

        if (doc) {
            return Promise.reject({
                displayerr: 'Sorry, this organisation is already created',
            });
        }

        isnew = true;

        doc = new OrgsModel({});

        doc.annotations = {
            createdbyemail: body.email,
            createdbyname: body.username,
            createddate: new Date(),
            modifiedbyemail: body.email,
            modifiedbyname: body.username,
            modifieddate: new Date(),
            transid: body.transid,
        };

        doc.org = org;

        id = doc._id.toString();
    } else {
        id = body.id;

        doc = await OrgsModel.findOne({ _id: id }, {}).exec();
    }

    if (!doc) {
        return Promise.reject({
            displayerr: 'Sorry, Your organisation could not be created',
        });
    }

    let yaml: any;
    if (body.config) {
        try {
            yaml = parse(body.config);
        } catch (err) {
            return Promise.reject({
                status: 301,
                displayerr: `Params parsing error:\n ${err.message || ''}`,
            });
        }
    }

    doc.config = yaml || {};
    doc.description = body.description;
    doc.annotations.modifiedbyname = body.username;
    doc.annotations.modifieddate = new Date();
    doc.annotations.transid = body.transid;

    // console.info(doc.config);

    try {
        await doc.save();
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $orgs (orgupdate)');
        err.close = false;
        err.displayerr = err.message;

        return Promise.reject(err);
    }

    if (isnew) {
        // we need to add a new user to the org

        const profile: IProfileBody = {
            user: body.email,
            username: body.username,
            org,
            transid: body.transid,
            role: 'admin',
            rolenbr: 100,
            email: body.email,
            store: '',
            id: body.email,
        };

        await newUser(profile).catch(async (err: IError) => {
            err.trace = ['@at $orgs (orgupdate) - newUser'];
            err.id = body.email;

            return Promise.reject(err);
        });

        await login(req, res);
    }

    utils.logInfo(`$org.update (Orgupdate): Org updated - email: ${body.email}`, req.transid, process.hrtime(hrstart));

    // when doing an update for a single document, return the action to put the document in read mode
    const actions: any =
        body.store === 'org.store'
            ? [
                  {
                      target: 'organization.form',
                      targetid: id,
                      type: 'read',
                  },
              ]
            : undefined;

    const type: string =
        body.store === 'org.store'
            ? EStoreActions.UPD_STORE_FORM_RCD
            : isnew
            ? EStoreActions.ADD_STORE_RCD
            : EStoreActions.UPD_STORE_RCD;

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            options: {
                field: 'orgs',
            },
            store: body.store /** not used as forcestore is enabled */,
            type,
            values: {
                createddate: doc.annotations.createddate.toISOString(),
                createdby: doc.annotations.createdbyemail,
                deleteicon: `${FaIcons.deleteicon}`,
                description: doc.description,
                editicon: `${FaIcons.editicon}`,
                id,
                org: doc.org,
                viewicon: `${FaIcons.viewicon}`,
                config: stringify(doc.config),
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        actions,
        message: 'Orgs Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
