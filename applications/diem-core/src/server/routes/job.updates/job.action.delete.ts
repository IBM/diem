import { EStoreActions, IError, IntPayload, IntServerPayload, IntSharedAction } from '@interfaces';
import { allPipelineJobs } from '../pipeline.backend/pipeline.helpers/getallpipelinejobs';
import { DataModel, IJobBody } from '../models/models';

export const actionDelete: (body: IJobBody) => Promise<any> = async (body: IJobBody) => {
    // let's find if this jobs is part of a pipeline

    if (!body.id) {
        return Promise.reject({ message: 'document has not id' });
    }

    const id: string = body.id;

    const jobids: string[] = await allPipelineJobs(id);

    if (jobids.length > 0) {
        return Promise.reject({
            close: false,
            displayerr: `This Job cannot be deleted as it's part of one or more pipelines,
            remove them from your pipeline(s) first: ${jobids.join(' - ')}`,
        });
    }

    await DataModel.deleteOne({ _id: id })
        .exec()
        .catch(async (err: IError) => {
            err.trace = ['@at $job.action (actionDelete)'];
            err.message = 'The document to delete could not be found';

            return Promise.reject(err);
        });

    const payload: IntPayload[] = [
        {
            key: 'id',
            loaded: true,
            store: 'jobs' /** not used as forcestore is enabled */,
            type: EStoreActions.REM_STORE_RCD,
            values: {
                id,
            },
        },
    ];

    const sharedActions: IntSharedAction[] = [
        {
            params: {
                route: '/jobs',
            },
            targetid: id,
            type: 'route',
        },
    ];

    const serverPayload: IntServerPayload = {
        actions: sharedActions,
        payload,
        message: `${id} Deleted`,
        success: true /** just display a success message */,
    };

    return Promise.resolve(serverPayload);
};
