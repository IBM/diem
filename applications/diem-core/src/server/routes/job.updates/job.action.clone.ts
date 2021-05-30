import { IntServerPayload } from '@interfaces';
import { DataModel, EJobStatus, IJobBody, IJobModel, IJobSchema, newId, IJobDetail } from '@models';
import { addTrace } from '@functions';

export const actionClone: (body: IJobBody) => Promise<any> = async (body: IJobBody) => {
    /* get the id here */

    const doc: IJobSchema | null = await DataModel.findOne({ _id: body.id }).lean().exec();

    if (doc === null) {
        return Promise.reject({
            message: 'The document to clone could not be found',
            name: 'Clone Request',
        });
    }

    doc.annotations = {
        createdbyemail: body.email,
        createdbyname: body.username,
        createddate: new Date(),
        modifiedbyemail: body.email,
        modifiedbyname: body.username,
        modifieddate: new Date(),
        transid: body.transid,
    };

    doc.name = `${doc.name} (Clone)`;
    doc.job.status = EJobStatus.pending;
    doc.job.jobstart = new Date();
    doc.job.jobend = null;
    doc.log = [];
    doc.out = [];
    doc.job.runtime = 0;
    doc.job.count = 0;
    doc.job.error = null;
    const name: string = doc.name;

    const id: string = newId();

    if (doc.jobs && Object.keys(doc.jobs).length > 0) {
        /*
         so we have a pipeline and this means we need to ensure the from field is pointing
         to the new document and not to the old
        */

        Object.entries(doc.jobs).forEach(([, value]: [string, IJobDetail]) => {
            if (body.id && value.from.includes(body.id)) {
                value.from.forEach((element, index) => {
                    if (element === body.id) {
                        value.from[index] = id;
                    }
                });
            }
        });
    }

    const ndoc: IJobModel = new DataModel(doc);
    ndoc._id = id;

    try {
        await ndoc.save().catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.action (actionClone) - save');

            return Promise.reject(err);
        });

        const sharedActions: any[] = [
            {
                params: {
                    route: `/jobdetail/${ndoc._id.toString()}`,
                },
                sessionid: body.sessionid,
                type: 'route',
            },
        ];

        const serverPayload: IntServerPayload = {
            actions: sharedActions,
            message: `${name} Cloned`,
            success: true /** just display a success message */,
        };

        return Promise.resolve(serverPayload);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.action (actionClone)');

        return Promise.reject(err);
    }
};
