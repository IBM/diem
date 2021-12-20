import { EStoreActions, IntPayload, IntServerPayload, IntSharedAction } from '@interfaces';
import { DataModel, IJobBody, IJobModel } from '@models';
import { addTrace } from '@functions';
import { makePayload } from '../job.front/job.detail';

const detail_store = 'jobdetail.store';
const update_request = 'Update Request';

export const actionAssign: (body: IJobBody) => Promise<any> = async (body: IJobBody) => {
    /* get the id here */

    const doc: IJobModel | null = await DataModel.findOne({ _id: body.id }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'The document to update could not be found',
            name: update_request,
        });
    }

    if (doc.annotations.createdbyemail === body.email) {
        const serverPayload: IntServerPayload = {
            message: 'Job Not Updated, same user',
            success: true /** just display a success message */,
            payload: [
                {
                    key: 'id',
                    loaded: true,
                    store: detail_store /** not used as forcestore is enabled */,
                    targetid: doc._id.toString(),
                    type: EStoreActions.UPD_STORE_FORM_RCD,
                    values: {},
                },
            ],
        };

        return Promise.resolve(serverPayload);
    }

    doc.events.unshift({
        created: new Date(),
        createdbyemail: body.email,
        createdbyname: body.username,
        event: `Reassigned from ${doc.annotations.createdbyname} (${doc.annotations.createdbyemail}) to ${body.username} (${body.email})`,
    });

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

    const docs: any = await doc.save().catch(async (err: any) => {
        err.trace = addTrace(err.trace, '@at $job.action (assign) - save');

        return Promise.reject(err);
    });

    let sharedActions: IntSharedAction[] = [];

    let payload: IntPayload[] = [];

    sharedActions = [
        {
            target: 'jobdetail.general.form',
            targetid: doc._id.toString(),
            type: 'read',
        },
    ];

    try {
        payload = [
            {
                key: 'id',
                loaded: true,
                store: detail_store /** not used as forcestore is enabled */,
                targetid: doc._id.toString(),
                type: EStoreActions.UPD_STORE_FORM_RCD,
                values: await makePayload(docs.toObject()),
            },
        ];

        const serverPayload: IntServerPayload = {
            actions: sharedActions,
            message: 'Job Updated',
            payload,
            success: true /** just display a success message */,
        };

        return Promise.resolve(serverPayload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.action (assign)');

        return Promise.reject(err);
    }
};
