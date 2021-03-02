/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { mongoose } from '@mydiem/diem-common/lib/common/mongo';
import { format } from 'sql-formatter';
import { stringify } from 'yaml';
import { StatusConfig } from '../job.backend/job.functions';
import {
    DataModel,
    IJobDetail,
    IJobDetails,
    IModel,
    IJobSchemaAnnotations,
    ITemplatesModel,
    EJobTypes,
    IntPayloadValues,
    IJobSchema,
    ExecutorTypes,
} from '../models/models';
import { flatten__, fmtTime, prePend, addTrace } from '../shared/functions';
import { getGraphLinks } from './job.grapht';
import { lookupTemplate } from './job.template';

interface IModelPayload extends IModel {
    source__dropcolumns: string[];
    source__connection: string;
    source__fetchsize: number;
    createdbyemail: string;
    createdbyname: string;
    createddate: string;
    description: string;
    modifiedbyemail: string;
    modifiedbyname: string;
    modifieddate: string;
    jobend: Date;
    jobstart: string;
    job__params?: string;
    schedule: any;
    status: string;
    transid: string;
    graph?: string;
    gantt: string;
    id: string;
    name: string;
    statusicon: string;
    tags: string[];
}

export const getNodes: (jobs: IJobDetails) => string[] = (jobs: IJobDetails): string[] => {
    const nodes: string[] = Object.keys(jobs); // all keys are nodes

    /* loop over the jobs and find from elements that don't have a key*/
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Object.entries(jobs).forEach(([_key, value]: [string, IJobDetail]) => {
        if (value && value.from) {
            const t: string[] = value.from;

            t.forEach((ref: string) => {
                if (!nodes.includes(ref)) {
                    nodes.push(ref);
                }
            });
        }
    });

    return nodes;
};

// eslint-disable-next-line sonarjs/cognitive-complexity
export const makePayload: (doc: IJobSchema) => Promise<IModelPayload> = async (
    doc: IJobSchema
): Promise<IModelPayload> => {
    /**
     * if there are nodes then parse them to generate a chart
     * if there are no nodesm then just create one single node with the name of the job
     * the return is an array [node and links , table data]
     */

    let DBJob: [string?, string?, IntPayloadValues[]?] = [undefined, undefined, undefined];

    if (doc.jobs && Object.keys(doc.jobs).length > 0) {
        DBJob = await getGraphLinks(doc).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.detail (makePayload)');

            return Promise.reject(err);
        });
    }

    const annotations: IJobSchemaAnnotations = doc.annotations;

    let config: any = {};
    const stmt: any = {};
    let custom: any;
    let template: any;

    /** here we need to check if there is a shared template or not, if not then find the statement */
    if (!doc.templateid) {
        // data trasfer
        if (doc.config) {
            config = flatten__(doc.config);

            if (config.source__sql) {
                config.source__sql = format(config.source__sql, { language: 'db2' });
            }
        }

        // statement
        if (doc.stmt) {
            stmt.stmt__connection = doc.stmt.connection;
            stmt.stmt__type = doc.stmt.type;

            if (doc.stmt.sql) {
                stmt.stmt__sql = format(doc.stmt.sql, { language: 'db2' });
            }
        }

        if (doc.custom) {
            custom = {
                custom__code: doc.custom.code,
                custom__executor: doc.custom.executor,
            };
        }
    } else {
        // so there is a template and look it up
        const templ: ITemplatesModel | null = await lookupTemplate(doc.templateid);

        if (templ) {
            let templatename: string = '';
            if (doc.type === EJobTypes.pystmt) {
                stmt.stmt__sql = format(templ.template, { language: 'db2' });
                templatename = 'stmt__templatename';
            } else if (doc.type === EJobTypes.pyspark) {
                config.source__sql = format(templ.template, { language: 'db2' });
                templatename = 'source__templatename';
            } else if (doc.type === EJobTypes.pycustom) {
                custom = {
                    custom__code: templ.template,
                    custom__executor: doc.custom ? doc.custom.executor : ExecutorTypes.nodepy,
                };
                templatename = 'custom__templatename';
            }
            template = {
                templateid: templ._id,
                [templatename]: templ.name, // need to make template name depending on type
            };
        }
    }

    let url: any;
    if (doc.url) {
        url = {};
        const parser: (json: string) => string = (json: string): string => {
            try {
                return JSON.stringify(JSON.parse(json), undefined, 2);
            } catch {
                return json;
            }
        };

        url.url__url = doc.url.url;
        url.url__type = doc.url.type;
        url.url__headers = parser(doc.url.headers);
        url.url__body = parser(doc.url.body);
    }

    // following are standard settings for the document

    const mail: any = doc.mail ? flatten__(prePend(doc.mail, 'mail__')) : { enabled: true, delivery: '0' };

    let job__params: any;
    if (doc.job.params) {
        job__params = {};
        job__params = stringify(doc.job.params);
        doc.job.params = undefined;
    }

    let schedule: any;
    if (doc.schedule) {
        schedule = {};
        schedule.schedule__cronNbr = doc.schedule.cronNbr;
        schedule.schedule__cronTime = doc.schedule.cronTime;
        schedule.schedule__lastExecution = doc.schedule.lastExecution;
        schedule.schedule__lastExecutionTime = doc.schedule.lastExecutionTime;
        schedule.schedule__nextExecution = doc.schedule.nextExecution;
        schedule.schedule__nextExecutionTime = doc.schedule.nextExecutionTime;
        schedule.schedule__enabled = doc.schedule.enabled;
    }

    delete doc.job.audit;

    return {
        ...annotations,
        ...config,
        ...doc.annotations,
        ...doc.job,
        ...stmt,
        ...url,
        ...schedule,
        ...mail,
        ...doc.project,
        ...custom,
        about: doc.about,
        job__params,
        graph: DBJob[0],
        gantt: DBJob[1],
        description: doc.description,
        id: doc._id.toString(),
        jobs: DBJob[2],
        log: doc.log,
        name: doc.name,
        out: doc.out,
        runtime: doc.job.runtime ? fmtTime(doc.job.runtime) : null,
        statusicon: StatusConfig[doc.job.status] ? StatusConfig[doc.job.status].statusicon : 'fa fa-question',
        tags: doc.tags,
        type: doc.type,
        ...template,
    };
};

export const jobdetail: (req: IRequest) => Promise<IModelPayload | any> = async (
    req: IRequest
): Promise<IModelPayload | any> => {
    const id: string = req.body.id;
    if (!id || (id && !mongoose.Types.ObjectId.isValid(id))) {
        return Promise.reject({
            return: { message: 'No or incorrect Document ID Provided' },
            status: 404,
        });
    }

    const hrstart: any = process.hrtime();

    const doc: IJobSchema | null = await DataModel.findOne({ _id: id })
        .lean()
        .exec()
        .catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $job.detail (jobdetail)');

            return Promise.reject(err);
        });

    if (doc === null) {
        return Promise.reject({
            return: { message: `document ${id} not found` },
            status: 404,
        });
    }

    if (req.user.org !== doc.project.org) {
        return {};
    }

    try {
        utils.logInfo(
            `$job.detail (jobdetail): job detail requested - job: ${id}`,
            req.transid,
            process.hrtime(hrstart)
        );

        return Promise.resolve(makePayload(doc));
    } catch (err) {
        if (err.message && err.message.includes('Cast to ObjectI')) {
            return Promise.resolve({});
        }
        err.trace = addTrace(err.trace, '@at $job.detail (jobdetail)');
        err.job = id;

        return Promise.reject(err);
    }
};
