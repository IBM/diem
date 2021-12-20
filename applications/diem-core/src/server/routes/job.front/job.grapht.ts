import moment, { Moment } from 'moment';
import {
    IJobDetails,
    IJobDetail,
    EJobTypes,
    DataModel,
    IntPayloadValues,
    IJobSchema,
    EJobStatus,
    EJobContinue,
} from '@models';
import { addTrace } from '@functions';
import { handlePayloadValues } from '../job.backend/job.functions';

export const getGraphLinks: (pldoc: IJobSchema) => Promise<[string, string, IntPayloadValues[]]> = async (
    pldoc: IJobSchema
): Promise<[string, string, IntPayloadValues[]]> => {
    const jobs: IJobDetails = pldoc.jobs;
    const plid: string = pldoc._id.toString();

    const rounds: number[] = [];
    const getTree = (root: string, round: number) => {
        const level = [];
        for (const [key, value] of Object.entries(jobs)) {
            if (value.from && value.from.includes(root)) {
                level.push(key);
            }
        }
        if (level.length > 0) {
            round += 1;
            level.forEach((l) => {
                rounds.push(round);
                getTree(l, round);
            });
        }
    };
    getTree(plid, 1);
    const rounds_nbr: number = Math.max(...rounds);

    // let's replace this for a while and make the chart always LR
    // const l: number = Object.keys(jobs).length;
    // const gl: string = l > 4 ? 'TD' : 'LR';
    const gl: string = rounds_nbr > 7 ? 'TD' : 'LR';

    let graph = `%%{init: {'themeVariables': { 'fontSize': '12px'}}}%%\ngraph ${gl};linkStyle default interpolate basis;classDef mm_green fill:PaleGreen;classDef mm_red fill:lightcoral;;classDef mm_tan fill:Tan;`;

    const nodes: string[] = [];

    Object.entries(jobs).forEach(([key, value]: [string, IJobDetail]) => {
        nodes.push(key);
        if (value && value.from) {
            const t: string[] = value.from;

            let arrow = '-->';

            if (jobs[key].required === EJobContinue.continue) {
                arrow = '-.->';
            }

            t.forEach((ref: string) => {
                const link = `${ref} ${arrow} ${key};`;

                graph += link;
            });
        }
    });

    graph += `${plid}((Start)):::graphStatClass;`;

    const dbjobs: IJobSchema[] = await DataModel.find({ _id: { $in: nodes } }, {})
        .sort({ name: 1 })
        .lean()
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.detail (getDBJobs) - findByFilter');

            return Promise.reject(err);
        });

    const payload: IntPayloadValues[] = handlePayloadValues(dbjobs); // the payload return array

    let gantt = `gantt
    title ${pldoc.name.replace(':', '')}
    todayMarker off
    dateFormat  YYYY-MM-DD HH:mm:ss
    axisFormat  %H:%M:%S\n`;

    dbjobs.forEach((doc: IJobSchema) => {
        const id: string = doc._id.toString();
        if (doc.type === EJobTypes.pipeline) {
            graph += `${id}[["${doc.name}"]];`;
        } else if (doc.type === EJobTypes.pyspark) {
            graph += `${id}{{"${doc.name}"}};`;
        } else if (doc.type === EJobTypes.pycustom) {
            graph += `${id}(["${doc.name}"]);`;
        } else if (doc.type === EJobTypes.urlgetpost) {
            graph += `${id}[/"${doc.name}"/];`;
        } else {
            graph += `${id}("${doc.name}");`;
        }

        if (doc.job.status === EJobStatus.completed) {
            graph += `class ${id} mm_green;`;
        }

        if (doc.job.status === EJobStatus.failed) {
            graph += `class ${id} mm_red;`;
        }

        if (doc.job.status === EJobStatus.stopped) {
            graph += `class ${id} mm_tan;`;
        }

        const runtime: number = doc.job.runtime || 0;
        const m: Moment = moment(doc.job.jobstart);
        const starttime: string = m.format('YYYY-MM-DD HH:mm:ss');
        const jobname = doc.name.replace(':', '');

        gantt += `${jobname}  :${starttime}, ${runtime}sec\n`;
    });

    return Promise.resolve([graph, gantt, payload]);
};
