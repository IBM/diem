import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntServerPayload, IntSharedAction } from '@interfaces';
import { ITagsBody, ITagsModel, TagsModel } from '../models/models';

/**
 * Nothing will be rejected here, in case of an error we log the error but return an empty [] to the user
 * We though check if it's a casterror (wrong id) or a real error
 */

interface ITags {
    tags: string[];
}

export const tags: (req: IRequest) => Promise<string[]> = async (req: IRequest): Promise<string[]> => {
    const hrstart: [number, number] = process.hrtime();

    const doc: ITags | null = await TagsModel.findOne({ org: req.user.org }, {}).lean().exec();

    utils.logInfo(
        `$tags (tags) - email: ${req.user.email} - org: ${req.user.org}`,
        req.transid,
        process.hrtime(hrstart)
    );

    if (doc === null) {
        return Promise.resolve([]);
    }

    return Promise.resolve(doc.tags);
};

export const tagsupdate: (req: IRequest) => Promise<IRequest | any> = async (
    req: IRequest
): Promise<IRequest | any> => {
    const hrstart: [number, number] = process.hrtime();

    const body: ITagsBody = { ...req.body };

    body.email = req.user.email;
    body.username = req.user.name;
    body.transid = req.transid;
    body.sessionid = req.sessionid;
    body.org = req.user.org;

    let doc: ITagsModel | null = await TagsModel.findOne({ org: body.org }).exec();

    if (doc === null) {
        doc = new TagsModel({
            annotations: {
                createdbyemail: body.email,
                createdbyname: req.user.name,
                modifiedbyemail: body.email,
                modifiedbyname: req.user.name,
                modifieddate: new Date(),
                transid: body.transid,
            },
            org: body.org,
            tags: body.tags,
        });
    } else {
        doc.tags = body.tags;
        doc.annotations.modifiedbyname = body.username;
        doc.annotations.modifiedbyemail = body.email;
        doc.annotations.modifieddate = new Date();
        doc.annotations.transid = body.transid;
    }

    await doc.save();

    utils.logInfo(`$tags (tagsupdate): tags updated - email: ${body.email}`, req.transid, process.hrtime(hrstart));

    const actions: IntSharedAction[] = [
        {
            target: body.target,
            targetid: doc.id,
            type: 'read',
        },
    ];

    const payload: IntPayload[] = [
        {
            loaded: true,
            store: body.store /** not used as forcestore is enabled */,
            type: EStoreActions.UPD_STORE_FORM_RCD,
            values: {
                ...body,
            },
        },
    ];

    const serverPayload: IntServerPayload = {
        actions,
        message: 'Tags Updated',
        payload,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};

export const listtags: (req: IRequest) => Promise<ITags> = async (req: IRequest): Promise<ITags> => {
    const listtag: ITags = { tags: await tags(req) };

    return Promise.resolve(listtag);
};
