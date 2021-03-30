import { utils } from '@common/utils';
import { IJobSchema, DataModel, EJobTypes } from '@models';
import { addTrace } from '../../shared/functions';

export const allPipelineJobs: (id: string) => Promise<string[]> = async (id: string): Promise<string[]> => {
    // let's find if this jobs is part of a pipeline

    const pipelines: IJobSchema[] | [] = await DataModel.find({ type: EJobTypes.pipeline }).lean().exec();

    const jobids: string[] = [];

    if (pipelines && Array.isArray(pipelines) && pipelines.length > 0) {
        for await (const pipeline of pipelines) {
            if (pipeline.jobs) {
                const pl: string[] = Object.keys(pipeline.jobs);
                if (pl.includes(id)) {
                    jobids.push(pipeline.name);
                }
            }
        }
    }

    return Promise.resolve(jobids);
};

export const allPipelineIds: (org: string, id: string) => Promise<string[]> = async (
    org: string,
    id: string
): Promise<string[]> => {
    // let's find if this jobs is part of a pipeline

    try {
        const pipelines: IJobSchema[] | [] = await DataModel.find({ 'project.org': org, type: EJobTypes.pipeline })
            .lean()
            .exec();

        let jobids: string[] = [];

        if (pipelines && Array.isArray(pipelines) && pipelines.length > 0) {
            for await (const pipeline of pipelines) {
                if (pipeline.jobs) {
                    const keys: string[] = Object.keys(pipeline.jobs);
                    jobids = jobids.concat(keys);
                    if (keys.includes(id)) {
                        jobids.push(pipeline._id);
                    }
                }
            }
        }

        utils.logInfo(`$getallpipelinejobs (allPipelineIds): found ${jobids.length}  org: ${org}`);

        return Promise.resolve(jobids);
    } catch (err) {
        err.trace = addTrace(err.trace, '@at $getallpipelinejobs (allPipelineIds)');

        return Promise.reject(err);
    }
};
