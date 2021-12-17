import { utils } from '@common/utils';
import { IntPayload, EStoreActions } from '@interfaces';
import { IJobModel, IJobResponse, IJobSchema, IntPayloadValues } from '@models';
import { addTrace } from '@functions';
import { PayloadValues } from '../../job.backend/job.functions';
import { jobLogger } from '../../job.logger/job.logger';
import { getGraphLinks } from '../../job.front/job.grapht';

export const makePlPayload: (
    doc: IJobModel | boolean,
    job: IJobResponse,
    payload: IntPayload[]
) => Promise<boolean> = async (
    doc: IJobModel | boolean,
    job: IJobResponse,
    payload: IntPayload[]
): Promise<boolean> => {
    if (typeof doc !== 'boolean') {
        // we log as the pipeline has failed
        const jobdetail = 'jobdetail.store';

        const pldoc: IJobSchema = doc.toObject();

        const values: IJobResponse = PayloadValues({ ...pldoc.job, id: job.jobid, org: job.org });

        if (['Failed', 'Stopped', 'Completed'].includes(job.status)) {
            // logging and stopping
            values.log = pldoc.log;

            const DBJobs: [string?, string?, IntPayloadValues[]?] = await getGraphLinks(doc).catch(async (err: any) => {
                err.trace = addTrace(err.trace, '@at $job.detail (makePayload)');

                return Promise.reject(err);
            });

            values.gantt = DBJobs[1];
        }

        // remove the audit field
        values.audit = undefined;

        // the payload for the pipeline in the all jobs

        payload.push({
            key: 'id',
            loaded: true,
            store: 'jobs',
            type: EStoreActions.UPD_STORE_RCD, // update all jobs
            values,
        });

        payload.push({
            // payload for users who have the document open
            loaded: true,
            store: jobdetail,
            targetid: job.jobid,
            type: EStoreActions.UPD_STORE_FORM_RCD,
            values,
        });

        await jobLogger(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $pipeline.handler (makePlPayload)');

            // we just log the error here
            void utils.logError('$pipeline.handler (makePlPayload): error', err);
        });
    }

    return Promise.resolve(true);
};
