/* eslint-disable @typescript-eslint/indent */
/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */

import { EStoreActions, IntPayload } from '@interfaces';
import { utils } from '@common/utils';
import { DataModel, EJobTypes, IJobResponse, IModel, EJobStatus, ISocketPayload } from '@models';
import { pipelineHandler } from '../pipeline.backend/pipeline.handler';
import { addTrace } from '../shared/functions';
import { PayloadValues } from './job.functions';
import { finishJob } from './job.finish';

interface IOut {
    out: string;
    special?: string;
}

const jobdetail: string = 'jobdetail.store';

const runTime: (doc: IModel) => number = (doc: IModel): number => {
    const je: Date | undefined = doc.job.jobend ? new Date(doc.job.jobend) : new Date();

    const js: Date | undefined = doc.job.jobstart ? new Date(doc.job.jobstart) : new Date();

    return je && js ? Math.round(Math.abs(je.getTime() - js.getTime()) / 1000) : 0;
};

export const updateOne: (doc: IModel, obj: any) => any = async (doc: IModel, obj: any) =>
    Promise.resolve(await doc.updateOne(obj));

export const jobOutHandler: (doc: IModel, job: IJobResponse) => Promise<ISocketPayload> = async (
    doc: IModel,
    job: IJobResponse
): Promise<ISocketPayload> => {
    const id: string = doc._id.toString();
    const obj: IOut = {
        out: job.out,
        special: job.special,
    };

    if (Array.isArray(doc.out)) {
        doc.out.push(obj);
    } else {
        doc.out = [obj];
    }

    await doc.save().catch(async (err: any) => {
        err.caller = '$job.handler';
        void utils.logError(`$job.handler (jobHandler): save failed - doc: ${id}`, err);
    });

    utils.logInfo(`$job.handler (jobHandler): out payload - job: ${job.id}`, job.transid);

    const load: ISocketPayload = {
        org: doc.project.org,
        payload: [
            {
                loaded: true,
                store: jobdetail,
                targetid: job.id,
                options: {
                    field: 'out',
                },
                type: EStoreActions.ADD_STORE_TABLE_RCD,
                values: {
                    out: job.out,
                    special: job.special,
                },
            },
        ],
    };

    return Promise.resolve(load);
};

const jobDocOutHandler: (payload: IntPayload[], doc: IModel, job: IJobResponse) => Promise<IntPayload[]> = async (
    payload: IntPayload[],
    doc: IModel,
    job: IJobResponse
): Promise<IntPayload[]> => {
    const obj: IOut = {
        out: job.out,
        special: job.special,
    };

    if (Array.isArray(doc.out)) {
        doc.out.push(obj);
    } else {
        doc.out = [obj];
    }

    utils.logInfo(`$job.handler (jobDocOutHandler): out payload - job: ${job.id}`, job.transid);

    payload.push({
        loaded: true,
        store: jobdetail,
        targetid: job.id,
        options: {
            field: 'out',
        },
        type: EStoreActions.ADD_STORE_TABLE_RCD,
        values: {
            out: job.out,
            special: job.special,
        },
    });

    return Promise.resolve(payload);
};

/**
 *
 *
 * @param {*} job
 * @returns {Promise<IjobHandler>}
 */
export const jobHandler: (job: IJobResponse) => Promise<ISocketPayload> = async (
    job: IJobResponse
): Promise<ISocketPayload> => {
    /**
     * @info Job can be a pipeline or a regular job
     *
     * if it's a pipeline we need to do some other pipeline actions
     */

    try {
        const id: string = job.id;
        const doc: IModel | null = await DataModel.findOne({ _id: id })
            .exec()
            .catch(async (err: any) => {
                err.trace = addTrace(err.trace, '@at $job.handler (jobHandler) - findOne');
                err.id = id;

                return Promise.reject(err);
            });

        if (doc === null) {
            return Promise.reject({
                id: job.id,
                message: 'The document could not be found',
                trace: ['@at $job.handler (jobHandler)'],
            });
        }

        let payload: IntPayload[] = [];

        // if it's just an out message and it's not the end then handle it as just an out
        if (job.out && !job.status) {
            return await jobOutHandler(doc, job);
        } else if (job.out) {
            payload = await jobDocOutHandler(payload, doc, job);
        }

        /**
         * @info it's a pipeline unless it's not a pipeline job in itsel
         */
        const isPl: boolean = doc.type === EJobTypes.pipeline; // is a pipeline
        const jobkind: string = isPl ? 'pl' : 'job';

        doc.job = { ...doc.toObject().job, ...job };

        doc.job.runtime = runTime(doc);

        const values: IJobResponse = PayloadValues({
            id,
            status: doc.job.status,
            jobend: doc.job.jobend,
            jobstart: doc.job.jobstart,
            runtime: doc.job.runtime,
            count: doc.job.count,
        });

        // just to make sure we have the right start moment
        job.jobstart = doc.job.jobstart;

        if (doc.job.error && !job.error) {
            doc.job.error = null;
        }

        // always display the error or return null to clean the ui
        values.error = doc.job.error || null;

        // can i remove this
        const isActivePl: boolean = isPl && doc.jobs && Object.keys(doc.jobs).length > 0; // has pipeline items
        if (isActivePl && ['Running', 'Failed', 'Completed'].includes(doc.job.status)) {
            values.jobs = job.jobs;
        }

        if (doc.out && doc.out.length === 0) {
            values.out = doc.out;
        }

        // update the all jobs
        payload.push({
            key: 'id',
            loaded: true,
            store: 'jobs',
            type: EStoreActions.UPD_STORE_RCD, // update all jobs
            values,
        });

        // adding the job log
        if (['Failed', 'Stopped', 'Completed'].includes(job.status) && !isPl) {
            await finishJob(doc);
        }

        // if it's a regular job , make sure that the stop is really stopped, so this does not include pipelines
        if (job.jobid !== id) {
            utils.logInfo(
                `$job.handler (jobHandler): handle pipeline - pl: ${job.jobid} - job: ${id} - job status: ${job.status}`,
                job.transid
            );

            // handles the pipeline and returns the payload for that pipeline
            payload = await pipelineHandler(job, payload).catch(async (err) => {
                err.trace = addTrace(err.trace, '@at $job.handler (pipelineHandler)');

                return Promise.reject(err);
            });

            // this is the payload for the pipeline table
            payload.push({
                key: 'id',
                loaded: true,
                options: {
                    field: 'jobs',
                },
                store: jobdetail,
                targetid: job.jobid,
                type: EStoreActions.UPD_STORE_TABLE_RCD,
                values,
            });
        }
        values.log = doc.toObject().log;

        payload.push({
            loaded: true,
            store: jobdetail,
            targetid: job.id,
            type: EStoreActions.UPD_STORE_FORM_RCD,
            values,
        });

        // here we save the job as no more values of the document will be changed
        await doc.save().catch(async (err: any) => {
            err.caller = '$job.handler';
            void utils.logError(`$job.handler (jobHandler): save failed - doc: ${id}`, err);
        });

        const load: ISocketPayload = {
            org: doc.project.org,
            payload,
        };

        // not all payload types require a popup message
        if (job.status) {
            load.message = `${jobkind}: ${doc.name} ${doc.job.status}`;
            load.success = job.status === EJobStatus.failed ? false : true; /** just display a success message */
        }

        return Promise.resolve(load);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.handler (jobHandler)');

        return Promise.reject(err);
    }
};
