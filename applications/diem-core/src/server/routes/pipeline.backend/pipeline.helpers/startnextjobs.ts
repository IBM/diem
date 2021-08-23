/* eslint-disable sonarjs/cognitive-complexity */
import { utils } from '@common/utils';
import { IJobResponse, IJobModel, IJobDetails, EJobStatus, EJobStatusCodes, EJobContinue } from '@models';
import { addTrace } from '@functions';
import { jobStartHandler } from '../../job.backend/job.start.handler';
import { findOne } from './findone';

const getNextInQueue: (pldid: string, id: string) => Promise<string[]> = async (
    plid: string,

    id: string
): Promise<string[]> => {
    const pldoc: IJobModel | null = await findOne(plid);
    if (pldoc === null) {
        return Promise.reject({
            trace: ['@at $startnextjobs (getNextInQueue) - no doc'],
            message: 'no pipeline document',
            plid,
        });
    }

    /* get getNodesFromId returns a string[] with all nodes that are to be run after the current node */
    const nodeIds: string[] = await getNodesFromId(pldoc.jobs, id);
    const nodes: string[] = [];

    for await (const nodeId of nodeIds) {
        /* at the beginning the queue is empty, when a job completed, it's add to the queue
         * once the queue has the same number of elements as the from (can be multiple jobs)
         * this would mean that all parent jobs have completed and we can run the next job
         */

        if (pldoc.jobs[nodeId]) {
            // add some piece on checking the continuing conditions
            if (
                pldoc.jobs[nodeId].from &&
                pldoc.jobs[nodeId].queue &&
                pldoc.jobs[nodeId].queue.length === pldoc.jobs[nodeId].from.length
            ) {
                if (pldoc.jobs[nodeId].required === EJobContinue.all) {
                    /*
                     * now we need to do a special check
                     * only jobs
                     */

                    let allowed: boolean = true;

                    for await (const parentId of pldoc.jobs[nodeId].queue) {
                        if (pldoc.jobs[parentId].status !== EJobStatus.completed) {
                            allowed = false;
                        }
                    }

                    if (!allowed) {
                        utils.logInfo(
                            `$startnextjobs (getNextInQueue): job not allowed to continue - pl: ${plid} - job: ${id} - blocked job: ${nodeId} - required: ${pldoc.jobs[nodeId].required}`
                        );
                        continue;
                    }
                }
                nodes.push(nodeId);

                utils.logInfo(
                    `$startnextjobs (getNextInQueue): adding next job - pl: ${plid} - job: ${id} - adding job: ${nodeId} - node: ${nodes.length} - required: ${pldoc.jobs[nodeId].required}`
                );
            } else {
                const ql: number = pldoc.jobs[nodeId].queue?.length ? pldoc.jobs[nodeId].queue.length : -1;
                utils.logInfo(
                    `$startnextjobs (getNextInQueue): no next job - pl: ${plid} - job: ${id} - node: ${nodeId}  - queue: ${ql} - from: ${pldoc.jobs[nodeId].from.length}`
                );
            }
        }
    }

    return Promise.resolve(nodes);
};

export const getNodesFromId: (jobs: IJobDetails, id: string) => Promise<string[]> = async (
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

export const startNextJobs: (job: IJobResponse, pldoc: IJobModel) => Promise<number> = async (
    job: IJobResponse,
    pldoc: IJobModel
): Promise<number> => {
    const plid: string = pldoc._id.toString();

    // nodeIds length is always greater then 0
    let d: string[] = await getNextInQueue(plid, job.id).catch(async (err: any) => {
        err.trace = ['@at $startnextjobs (startNextJobs) - getNextInQueue'];

        return Promise.reject(err);
    });

    if (d?.length > 0) {
        for await (const id of d) {
            if (id) {
                const batch_doc: IJobModel | null = await findOne(id);

                if (!batch_doc) {
                    const err: any = {
                        message: `No config file found - id: ${job.id} - batch_job: ${id}`,
                        trace: ['@at $startnextjobs (startNextJobs) - batch_doc'],
                    };

                    return Promise.reject(err);
                }

                if (([EJobStatus.running, EJobStatus.submitted] as EJobStatusCodes[]).includes(batch_doc.job.status)) {
                    utils.logInfo(
                        `$startnextjobs (startNextJobs): already running - pl: ${plid} - pl status: ${batch_doc.job.status}`,
                        job.transid
                    );
                } else {
                    batch_doc.job.email = job.email; // runs under the owner of the document that triggers
                    batch_doc.job.executor = job.executor;
                    batch_doc.job.jobstart = new Date();
                    batch_doc.job.status = EJobStatus.submitted;
                    batch_doc.job.transid = pldoc.job.transid;
                    batch_doc.job.jobid = plid;
                    batch_doc.job.runby = pldoc.job.runby;

                    utils.logInfo(
                        `$startnextjobs (startNextJobs): passing to jobStartHandler - pl: ${job.jobid} - id: ${job.id} - job: ${id}`,
                        job.transid
                    );

                    void jobStartHandler(batch_doc).catch(async (err) => {
                        if (err.VersionError) {
                            /*
                             * we are getting version error, this means the job is already running
                             * we log the event and then stop proceeding
                             * we filter out the node , there might be others running
                             */
                            d = d.filter((a) => a !== id);

                            utils.logRed(
                                `$startnextjobs (startNextJobs): version error, not proceeding - pl: ${job.jobid} - id: ${job.id} - job: ${id}`
                            );

                            return Promise.resolve(0);
                        } else {
                            err.trace = addTrace(err.trace, '@at $startnextjobs (startNextJobs) - batch');

                            return Promise.reject(err);
                        }
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
