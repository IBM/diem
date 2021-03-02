/* eslint-disable max-len */
/* eslint-disable sonarjs/cognitive-complexity */
import { utils } from '@mydiem/diem-common/lib/common/utils';
import { jobStartHandler } from '../../job.backend/job.start.handler';
import { IJobResponse, IModel, IJobDetails, EJobStatus } from '../../models/models';
import { addTrace } from '../../shared/functions';
import { findOne } from './findone';

const getNextInQueue: (pldid: string, nodeIds: string[], id: string) => Promise<string[]> = async (
    plid: string,
    nodeIds: string[],
    id: string
): Promise<string[]> => {
    const pldoc: IModel | null = await findOne(plid);

    if (pldoc === null) {
        return Promise.reject({
            trace: ['@at $startnextjobs (getNextInQueue) - no doc'],
            message: 'no pipeline document',
            plid,
        });
    }

    const nodes: string[] = [];

    // eslint-disable-next-line guard-for-in
    for await (const nodeId of nodeIds) {
        if (pldoc.jobs[nodeId]) {
            if (!pldoc.jobs[nodeId].queue) {
                pldoc.jobs[nodeId].queue = [id];
            }

            if (pldoc.jobs[nodeId].queue && !pldoc.jobs[nodeId].queue.includes(id)) {
                pldoc.jobs[nodeId].queue.push(id);
            }

            pldoc.markModified('jobs');

            // add some piece on checking the continueing conditions
            if (
                pldoc.jobs[nodeId].from &&
                pldoc.jobs[nodeId].queue &&
                pldoc.jobs[nodeId].queue.length === pldoc.jobs[nodeId].from.length
            ) {
                nodes.push(nodeId);
                // eslint-disable-next-line max-len
                utils.logInfo(
                    `$startnextjobs (getNextInQueue): adding next job - pl: ${plid} - job: ${id} - adding job: ${nodeId} - node: ${nodes.length}`
                );
            } else {
                utils.logInfo(
                    `$startnextjobs (getNextInQueue): no next job - pl: ${plid} - job: ${id} - node: ${nodeId}  - queue: ${pldoc.jobs[nodeId].from.length}`
                );
            }
        }
    }

    await pldoc.save().catch(async (err: any) => {
        err.trace = ['$startnextjobs (getNextInQueue)'];
        void utils.logError(`$startnextjobs (getNextInQueue): save failed - doc: ${plid}`, err);

        return Promise.reject(err);
    });

    utils.logInfo(
        `$startnextjobs (getNextInQueue): pipeline updated - returning nodes - pl: ${plid} - job: ${id} - nodes: ${nodes.length}`
    );

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

export const startNextJobs: (job: IJobResponse, pldoc: IModel) => Promise<number> = async (
    job: IJobResponse,
    pldoc: IModel
): Promise<number> => {
    const plid: string = pldoc._id.toString();

    // we have now the job and now need to find the nodeIds where the from contains the job id

    const nodeIds: string[] = await getNodesWithIdFrom(pldoc.jobs, job.id);

    if (nodeIds && nodeIds.length === 0) {
        // there are no nodeIds so let's stop here
        utils.logInfo(
            `startnextjobs (startNextJobs): no dependent job found - pl: ${plid} - job: ${job.id}`,
            job.transid
        );

        return Promise.resolve(0);
    }

    // nodeIds length is always greater then 0
    const d: string[] = await getNextInQueue(plid, nodeIds, job.id).catch(async (err: any) => {
        err.trace = ['startnextjobs (startNextJobs)'];

        return Promise.reject(err);
    });

    if (d && d.length > 0) {
        for (const id of d) {
            if (id) {
                utils.logInfo(
                    `$startnextjobs (startNextJobs): calling jobStartHandler - pl: ${job.jobid} - next job: ${id}`,
                    job.transid
                );

                void jobStartHandler(
                    {
                        email: job.email,
                        executor: job.executor,
                        id,
                        jobid: job.jobid, // this is the pipeline indicator
                        jobstart: new Date(),
                        name: job.name,
                        runby: pldoc.job.runby,
                        status: EJobStatus.submitted,
                        transid: job.transid,
                        org: job.org,
                    },
                    {
                        name: 'startnextjob',
                        id: plid,
                    }
                ).catch(async (err) => {
                    err.trace = addTrace(err.trace, '@at $pipeline.handler (startNextJobs)');

                    return Promise.resolve(0);
                });
            }
        }

        return Promise.resolve(d.length);
    }
    utils.logInfo(
        `$job.handler (startNextJobs): no depending job in queue - pl: ${job.jobid} - job: ${job.id}`,
        job.transid
    );

    return Promise.resolve(0);
};
