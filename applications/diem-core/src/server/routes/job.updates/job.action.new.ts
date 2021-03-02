import { EStoreActions, IntPayload, IntServerPayload } from '@interfaces';
import { DataModel, IJobBody, IModel, IJobSchema } from '../models/models';
import { extract__, expand, addTrace } from '../shared/functions';

const detail_store: string = 'jobdetail.store';

export const actionNew: (body: IJobBody) => Promise<any> = async (body: IJobBody) => {
    const input: IJobSchema = {
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
    };

    if (body.source__sql) {
        body.source__sql = body.source__sql ? body.source__sql.replace(/[\t\n\r]/gm, ' ') : '';
    }

    body.config = expand(extract__(body, '__'), '__');

    const doc: IModel = new DataModel(input);

    try {
        const docs: any = await doc.save().catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.action (actionNew) - save');

            return Promise.reject(err);
        });

        const payload: IntPayload[] = [
            {
                loaded: true,
                store: detail_store /** not used as forcestore is enabled */,
                type: EStoreActions.UPD_STORE_FORM_RCD,
                values: {
                    ...body,
                    id: docs._id,
                },
            },
        ];

        const serverPayload: IntServerPayload = {
            message: 'jobection Created',
            payload,
            success: true /** just display a success message */,
        };

        return Promise.resolve(serverPayload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.action (actionNew)');

        return Promise.reject(err);
    }
};
