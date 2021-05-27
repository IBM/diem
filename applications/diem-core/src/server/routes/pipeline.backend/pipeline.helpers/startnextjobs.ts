/* eslint-disable max-len */
/* eslint-disable sonarjs/cognitive-complexity */
import { utils } from '@common/utils';
import { IJobResponse, IJobModel, IJobDetails, EJobStatus, EJobStatusCodes } from '@models';
import { addTrace } from '@functions';
import { jobStartHandler } from '../../job.backend/job.start.handler';
import { findOne } from './findone';

const getNextInQueue: (pldid: string, id: string) => Promise<string[]> = async (
    plid: string,

    id: string
): Promise<string[]> => {
    console.info('$startnextjobs (getNextInQueue): looking up', id);
    const pldoc: IJobModel | null = await findOne(plid);
    console.info('$startnextjobs (getNextInQueue): looked up', id);
    if (pldoc === null) {
        return Promise.reject({
            trace: ['@at $startnextjobs (getNextInQueue) - no doc'],
            message: 'no pipeline document',
            plid,
        });
    }

    const nodeIds: string[] = await getNodesFromId(id, pldoc);
    console.info('$startnextjobs (getNextInQueue): after getnodes', id);
    const nodes: string[] = [];

    // eslint-disable-next-line guard-for-in
    for await (const nodeId of nodeIds) {
        /* at the beginning the queue is empty, when a job completed, it's add to the queue
         * once the queue has the same number of elements as the from (can be multiple jobs)
         * this would mean that all parent jobs have completed and we can run the next job
         */
        if (pldoc.jobs[nodeId]) {
            // add some piece on checking the continueing conditions
            if (
                pldoc.jobs[nodeId].from &&
                pldoc.jobs[nodeId].queue &&
                pldoc.jobs[nodeId].queue.length === pldoc.jobs[nodeId].from.length
            ) {
                const check_doc: IJobModel | null = await findOne(nodeId);

                console.info(check_doc?.job);

                if (check_doc?.job.status === EJobStatus.pending) {
                    nodes.push(nodeId);
                    // eslint-disable-next-line max-len
                    utils.logInfo(
                        `$startnextjobs (getNextInQueue): adding next job - pl: ${plid} - job: ${id} - adding job: ${nodeId} - node: ${nodes.length}`
                    );
                } else {
                    utils.logInfo(
                        `$startnextjobs (getNextInQueue): next job not in pending state - pl: ${plid} - job: ${id} - adding job: ${nodeId} - node: ${nodes.length}`
                    );
                }
            } else {
                utils.logInfo(
                    `$startnextjobs (getNextInQueue): no next job - pl: ${plid} - job: ${id} - node: ${nodeId}  - queue: ${pldoc.jobs[nodeId].queue.length} - from: ${pldoc.jobs[nodeId].from.length}`
                );
            }
        }
    }

    return Promise.resolve(nodes);
};

const getNodesWithIdFrom: (jobs: IJobDetails, id: string) => Promise<string[]> = async (
    jobs: IJobDetails,
    id: string
): Promise<string[]> => {
    const nodes: string[] = []; // all keys are nodes

    for await (const [key, value] of Object.entries(jobs)) {
        const t: string[] = value.from;
        if (t.includes(id) && !nodes.includes(key)) {
            nodes.push(key);
        }
    }

    return Promise.resolve(nodes);
};

export const getNodesFromId: (id: string, pldoc: IJobModel) => Promise<string[]> = async (
    id: string,
    pldoc: IJobModel
): Promise<string[]> => {
    // we have now the job and now need to find the nodeIds where the from contains the job id

    const nodeIds: string[] = await getNodesWithIdFrom(pldoc.jobs, id);

    if (nodeIds && nodeIds.length === 0) {
        return Promise.resolve([]);
    }

    return Promise.resolve(nodeIds);
};

export const startNextJobs: (job: IJobResponse, pldoc: IJobModel) => Promise<number> = async (
    job: IJobResponse,
    pldoc: IJobModel
): Promise<number> => {
    const plid: string = pldoc._id.toString();

    // nodeIds length is always greater then 0
    const d: string[] = await getNextInQueue(plid, job.id).catch(async (err: any) => {
        err.trace = ['startnextjobs (startNextJobs)'];

        return Promise.reject(err);
    });

    if (d && d.length > 0) {
        for await (const id of d) {
            if (id) {
                utils.logInfo(
                    `$startnextjobs (startNextJobs): calling jobStartHandler - pl: ${job.jobid} - next job: ${id}`,
                    job.transid
                );

                const batch_doc: IJobModel | null = await findOne(id);

                if (!batch_doc) {
                    const err: any = {
                        message: `No config file found - id: ${job.id} - batch_job: ${id}`,
                        trace: ['@at $startnextjobs (startNextJobs)'],
                    };

                    return Promise.reject(err);
                }

                if (([EJobStatus.running, EJobStatus.submitted] as EJobStatusCodes[]).includes(batch_doc.job.status)) {
                    utils.logInfo(
                        `$startnextjobs (startNextJobs): already running - pl: ${plid} - pl status: ${batch_doc.job.status}`,
                        job.transid
                    );
                } else {
                    batch_doc.job.email = job.email;
                    batch_doc.job.executor = job.executor;
                    batch_doc.job.jobstart = new Date();
                    batch_doc.job.status = EJobStatus.submitted;
                    batch_doc.job.transid = job.transid;
                    batch_doc.job.jobid = plid;
                    batch_doc.job.runby = job.runby;

                    await jobStartHandler(batch_doc).catch(async (err) => {
                        err.trace = addTrace(err.trace, '@at $startnextjobs (startNextJobs) - batch');

                        return Promise.reject(err);
                    });
                }
            }
        }

        return Promise.resolve(d.length);
    }
    utils.logInfo(
        `$startnextjobs (startNextJobs): no depending job in queue - pl: ${job.jobid} - job: ${job.id}`,
        job.transid
    );

    return Promise.resolve(0);
};
