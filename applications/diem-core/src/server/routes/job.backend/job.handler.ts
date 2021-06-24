/* eslint-disable complexity */

import { EStoreActions, IntPayload } from '@interfaces';
import { utils } from '@common/utils';
import { DataModel, EJobTypes, IJobResponse, IJobModel, EJobStatus, ISocketPayload, ExecutorTypes } from '@models';
import { addTrace } from '@functions';
import { pipelineHandler } from '../pipeline.backend/pipeline.handler';
import { findOneAndUpdate } from '../pipeline.backend/pipeline.helpers/helpers';
import { PayloadValues } from './job.functions';
import { jobFinish, getPySparkJobLog } from './job.finish';

interface IOut {
    out: string;
    special?: string;
    outl?: boolean;
}

const jobdetail: string = 'jobdetail.store';

const runTime: (doc: IJobModel) => number = (doc: IJobModel): number => {
    if (!doc.job.jobend) {
        return 0;
    }

    const je: Date | undefined = new Date(doc.job.jobend);

    const js: Date | undefined = doc.job.jobstart ? new Date(doc.job.jobstart) : new Date();

    return je && js ? Math.round(Math.abs(je.getTime() - js.getTime()) / 1000) : 0;
};

export const updateOne: (doc: IJobModel, obj: any) => any = async (doc: IJobModel, obj: any) =>
    Promise.resolve(await doc.updateOne(obj));

export const jobOutHandler: (doc: IJobModel, job: IJobResponse) => Promise<ISocketPayload> = async (
    doc: IJobModel,
    job: IJobResponse
): Promise<ISocketPayload> => {
    const job_copy: IJobResponse = { ...job };

    const obj: IOut = {
        out: job.out,
        special: job.special,
    };

    let insert;

    if (job.outl) {
        insert = {
            $push: { out: { $each: job.out } },
        };
    } else {
        insert = {
            $push: { out: obj },
        };
    }

    await findOneAndUpdate(doc._id, insert).catch(async (err: any) => {
        if (err?.name && err.name.toLowerCase().includes('versionerror')) {
            err.VersionError = true;

            utils.logRed(
                `$job.handler (jobHandler) - out: version error, retrying - pl: ${job.jobid} - job: ${job.id}`
            );

            return jobHandler(job_copy);
        } else {
            err.trace = addTrace(err.trace, '@at $job.handler (jobHandler) - findOne');
            err.id = doc._id.toString();

            return Promise.reject(err);
        }
    });

    utils.logInfo(`$job.handler (jobHandler): adding out - job: ${job.id} - status: ${doc.job.status}`, job.transid);

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
                type: job.outl ? EStoreActions.APPEND_STORE_TABLE_RCD : EStoreActions.ADD_STORE_TABLE_RCD,
                values: {
                    out: job.out,
                    special: job.special,
                },
            },
        ],
    };

    return Promise.resolve(load);
};

const jobDocOutHandler: (payload: IntPayload[], doc: IJobModel, job: IJobResponse) => Promise<[IntPayload[], any]> =
    async (payload: IntPayload[], doc: IJobModel, job: IJobResponse): Promise<[IntPayload[], any]> => {
        const obj: IOut = {
            out: job.out,
            special: job.special,
        };

        let insert;

        if (job.outl) {
            insert = {
                $push: { out: { $each: job.out } },
            };
            doc.out = doc.out.concat(job.out);
        } else {
            if (Array.isArray(doc.out)) {
                doc.out.push(obj);
            } else {
                doc.out = [obj];
            }
            insert = {
                $push: { out: obj },
            };
        }

        utils.logInfo(
            `$job.handler (jobDocOutHandler): adding out - job: ${job.id} - status: ${job.status}`,
            job.transid
        );

        payload.push({
            loaded: true,
            store: jobdetail,
            targetid: job.id,
            options: {
                field: 'out',
            },
            type: job.outl ? EStoreActions.APPEND_STORE_TABLE_RCD : EStoreActions.ADD_STORE_TABLE_RCD,
            values: {
                out: job.out,
                special: job.special,
            },
        });

        return Promise.resolve([payload, insert]);
    };

/**
 *
 *
 * @param {*} job
 * @returns {Promise<IjobHandler>}
 */
export const jobHandler: (job: IJobResponse) => Promise<ISocketPayload | false> = async (
    job: IJobResponse
): Promise<ISocketPayload | false> => {
    /**
     * @info Job can be a pipeline or a regular job
     *
     * if it's a pipeline we need to do some other pipeline actions
     */

    // make a copy of the job to reuse it in case of failure
    const job_copy: IJobResponse = { ...job };

    // the object that will be used to insert
    let insert: any = { $set: {} };

    const id: string = job.id;
    let doc: IJobModel | null = await DataModel.findOne({ _id: id })
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.handler (jobHandler) - findOne');
            err.id = id;

            return Promise.reject(err);
        });

    if (doc === null) {
        return Promise.reject({
            id,
            message: 'The document could not be found',
            trace: ['@at $job.handler (jobHandler) - null doc'],
        });
    }

    // keep a reference to the original status , we use it later
    const doc_status: string = doc.job.status;

    let payload: IntPayload[] = [];

    try {
        // if it's just an out message and it's not the end then handle it as just an out

        if (job.out !== undefined && !job.status) {
            const load: any = await jobOutHandler(doc, job).catch(async (err: any) => {
                err.trace = addTrace(err.trace, '@at $job.handler (jobHandler) - jobOutHandler');
                err.id = id;

                return Promise.reject(err);
            });

            return Promise.resolve(load);
        } else if (job.out) {
            const out_handler: [IntPayload[], any] = await jobDocOutHandler(payload, doc, job);
            payload = out_handler[0];
            insert = { ...insert, ...out_handler[1] };
        }

        /**
         * @info it's a pipeline unless it's not a pipeline job in itsel
         */
        const isPl: boolean = doc.type === EJobTypes.pipeline; // is a pipeline
        const jobkind: string = isPl ? 'pl' : 'job';

        doc.job = { ...doc.toObject().job, ...job };

        doc.job.runtime = runTime(doc);

        if (doc.job.error && !job.error) {
            doc.job.error = null;
        }

        const values: IJobResponse = PayloadValues({
            id,
            status: doc.job.status,
            jobend: doc.job.jobend,
            jobstart: doc.job.jobstart,
            runtime: doc.job.runtime,
            count: doc.job.count,
            error: doc.job.error || null,
        });

        // remove log from values for jobs
        const { log, audit, ...rest } = values;

        // update the all jobs
        payload.push({
            key: 'id',
            loaded: true,
            store: 'jobs',
            type: EStoreActions.UPD_STORE_RCD, // update all jobs
            values: rest,
        });

        // can i remove this
        const isActivePl: boolean = isPl && doc.jobs && Object.keys(doc.jobs).length > 0; // has pipeline items
        if (isActivePl && ['Running', 'Failed', 'Completed'].includes(doc.job.status)) {
            values.jobs = job.jobs;
        }

        // if the doc has no out, then provide an empty arry
        if (doc.out?.length === 0) {
            values.out = [];
        }

        // adding the job log
        if (['Failed', 'Stopped', 'Completed'].includes(job.status) && !isPl) {
            // we crosscheck with the original status to ensure we don't finish a job already finished
            if (['Failed', 'Stopped', 'Completed'].includes(doc_status)) {
                utils.logInfo(
                    `$job.handler (jobHandler): job is already in a finished status - stopping here  - status: ${job.status} - job: ${job.id}`,
                    job.transid
                );

                return Promise.resolve(false);
            }

            // set the end time of the job here
            job.jobend = new Date();
            doc.job.jobend = job.jobend;

            // get the log of the sparkjob in case of an error
            if (doc.job.error && doc.job.executor === ExecutorTypes.pyspark) {
                utils.logInfo(`$job.handler (getPySparkJobLog): passing to getPySparkJobLog - id: ${id}`);

                doc = await getPySparkJobLog(doc);
            }

            utils.logInfo(
                `$job.handler (jobHandler): passing to jobFinish - status: ${job.status} - job: ${job.id}`,
                job.transid
            );
            const t = await jobFinish(doc);
            doc = t[0];
            insert = { ...insert, ...t[1] };
        }

        insert.$set.job = doc.toObject().job;

        await findOneAndUpdate(doc._id, insert).catch(async (err: any) => {
            if (err?.name && err.name.toLowerCase().includes('versionerror')) {
                err.VersionError = true;

                utils.logRed(
                    `$job.handler (jobHandler) - save : version error, retrying - pl: ${job.jobid} - job: ${job.id}`
                );

                return jobHandler(job_copy);
            } else {
                err.trace = addTrace(err.trace, '@at $job.handler (jobHandler) - save');
                err.id = id;

                return Promise.reject(err);
            }
        });

        // if it's a regular job , make sure that the stop is really stopped, so this does not include pipelines
        if (job.jobid !== id) {
            utils.logInfo(
                `$job.handler (jobHandler): passing to pipelineHandler - pl: ${job.jobid} - job: ${id} - job status: ${job.status}`,
                job.transid
            );

            // handles the pipeline and returns the payload for that pipeline
            payload = await pipelineHandler(job, payload).catch(async (err) => {
                err.trace = addTrace(err.trace, '@at $job.handler (pipelineHandler)');

                return Promise.reject(err);
            });

            // this is the payload for the pipeline table

            // remove log from values for jobs

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

        const load: ISocketPayload = {
            org: doc.project.org,
            payload,
        };

        // not all payload types require a popup message
        if (job.status) {
            load.message = `${jobkind}: ${doc.name} ${doc.job.status}`;
            load.success = job.status === EJobStatus.failed ? false : true; /** just display a success message */
        }

        utils.logInfo(
            `$job.handler (jobHandler): passing back to publish - job: ${job.id} - status: ${job.status}`,
            job.transid
        );

        return Promise.resolve(load);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $job.handler (jobHandler) - try catch');

        return Promise.reject(err);
    }
};
