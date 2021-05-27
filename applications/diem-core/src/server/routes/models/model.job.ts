/* eslint-disable @typescript-eslint/indent */
import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema, IJobSchemaAnnotations, projectSchema } from './model.common';
export { Aggregate, Document, Model, Error as MongoError } from 'mongoose';

export type EJobStatusCodes = 'Completed' | 'Failed' | 'Pending' | 'Running' | 'Stopped' | 'Submitted';

export enum EJobStatus {
    completed = 'Completed',
    failed = 'Failed',
    pending = 'Pending',
    running = 'Running',
    stopped = 'Stopped',
    submitted = 'Submitted',
}

export const enum ETriggers {
    completed = 'all_Completed',
}

export const enum EJobTypes {
    pyspark = 'pyspark',
    pycustom = 'pycustom',
    none = 'none',
    pystmt = 'pystmt',
    pipeline = 'pipeline',
    params = 'params',
    urlgetpost = 'urlgetpost',
}

export const enum ExecutorTypes {
    pyspark = 'pyspark',
    nodepy = 'nodepy',
    pipeline = 'pipeline',
}

export enum ECodeLanguage {
    python = 'python',
    pyspark = 'pyspark',
    params = 'params',
    javascript = 'javascript',
}

export interface IParamsFiles {
    cos?: string;
    loadfiles?: { name: string; value: string }[];
    loadfiles_type?: 'string' | 'pandas';
    bucket?: string;
    filename?: string;
}

export interface IJobParams {
    [index: string]: any;
    connections?: string | string[];
    configmaps?: string | string[];
    spark?: {
        local?: number;
        image?: string;
        tmpfs?: boolean;
        adaptive?: boolean;
        driver?: {
            cores?: number;
            memory?: string;
        };
        executor?: {
            cores?: number;
            memory?: string;
            instances?: number;
        };
        volume?: boolean;
        type?: 'scala' | 'pyspark' | 'git';
        location?: string;
        mainclass?: string;
    };
    files?: boolean | IParamsFiles;
    slack?: {
        disabled?: boolean;
        enabled?: boolean;
        webhook?: string;
        channel?: string;
        username?: string;
    };
    pip?: string[];
}

export interface IETLJob {
    email: string;
    executor: keyof typeof ExecutorTypes;
    id: string;
    jobid: string;
    serviceid?: string;
    jobstart: Date;
    name: string;
    params?: IJobParams;
    runby: string;
    status: EJobStatusCodes;
    transid: string;
    org: string;
}
export interface IJob {
    count: number | null;
    email: string;
    error?: string | null;
    executor: keyof typeof ExecutorTypes;
    jobend: Date | null;
    jobid: string;
    jobstart: Date;
    name: string;
    params?: IJobParams;
    runby: string;
    runtime: number | null;
    status: EJobStatusCodes;
    transid: string;
    audit?: {
        [index: string]: any;
    };
}

export interface IFileUploadJob {
    id: string;
    transid: string;
    jobid?: string;
    params?: any;
    val_name: string;
}

export interface IJobDetail {
    from: string[];
    required: string;
    queue: string[];
    status: EJobStatusCodes;
}

export interface IJobDetails {
    [key: string]: IJobDetail;
}

// not realy used
export const jobsSchema: Schema = new Schema( // not really used
    {
        of: String,
        type: Map,
    },
    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

export interface IControlsBody {
    email?: string;
    report: string;

    profile: {
        email: string;
        name: string;
    };
    transid: string;
}

export interface IBody {
    email: string;
    id: string;
    query?: any;
    profile: {
        email: string;
        name: string;
    };
    transid: string;
    params?: any;
    action: string;
    jobid: string;
    jobs: boolean;
    name: string;
}

export interface IFileUploadBody {
    transid: string;
    val_name: any;
    files: any;
}

export interface ICosReturn {
    fileid: string;
    name: string;
    bucketname: string;
    type: string;
    encoding: string;
}

/** these are the meta data */
export interface IDeletedFile {
    fileid: string;
    bucket: string;
    name: string;
    id: string;
    type: string;
}

interface IJobOperator {
    driver_cores?: number;
    executor_cores?: number;
    executor_instances?: string;
}

export interface IJobConfig {
    operator?: IJobOperator;
    source: {
        connection: string;
        dropcolumns: string[];
        fetchsize: number;
        partition?: {
            lowerbound: number;
            numpartitions: number;
            partitioncolumn: string;
            upperbound: number;
            maxcpu: number;
        };
        sql: string;
    };
    target: {
        batchsize: number;
        connection: string;
        truncate: boolean;
        target: string;
    };
    type: string;
}

const configSchema: Schema = new Schema(
    {
        operator: {
            driver_cores: Number,
            executor_cores: Number,
            executor_instances: Number,
            local: Number,
        },
        source: {
            connection: String,
            dropcolumns: Array,
            fetchsize: Number,
            partition: {
                lowerbound: Number,
                numpartitions: Number,
                partitioncolumn: String,
                upperbound: Number,
                maxcpu: Number,
            },
            sql: String,
        },
        target: {
            batchsize: Number,
            connection: String,
            sql: String,
            target: String,
            truncate: Boolean,
        },
        type: String,
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

export interface IStmtSchema {
    connection: string;
    sql: string;
    type: boolean;
}

const stmtSchema: Schema = new Schema(
    {
        connection: String,
        sql: String,
        type: { type: Boolean, required: true, default: false },
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

export type ICustomSchema = {
    executor: keyof typeof ECodeLanguage;
    code?: string;
};

const customSchema: Schema = new Schema(
    {
        executor: { type: String, required: true, default: 'nodepy' },
        code: { type: String, required: true },
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

export interface IUrlSchema {
    body: any;
    headers: any;
    type: string;
    url: string;
}

const urlSchema: Schema = new Schema(
    {
        body: Object,
        headers: Object,
        type: String,
        url: String,
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

const jobSchema: Schema = new Schema(
    {
        count: Number,
        email: String,
        executor: String,
        error: String,
        jobend: Date,
        jobid: String,
        jobstart: Date,
        params: Object,
        runby: String,
        runtime: Number,
        status: String,
        transid: { type: String, required: true, default: 'noop' },
        audit: Object,
    },
    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

const outSchema: Schema = new Schema(
    {
        out: Object,
        special: String,
    },
    { _id: false } /*** don't add an _id to documents */
);

export interface IScheduleSchema {
    cronNbr: number | null;
    cronTime: string | null;
    enabled: boolean;
    lastExecution: number | null;
    lastExecutionTime: string | null;
    nextExecution: number | null;
    nextExecutionTime: string | null;
}

export interface IMailSchema {
    enabled: boolean;
    delivery: string;
    recipients: string[];
    attachment?: boolean;
    attachment_type?: string;
}

const mailSchema: Schema = new Schema(
    {
        enabled: { type: Boolean, required: true, default: true },
        delivery: { type: String, required: true, default: '0' },
        recipients: [String],
        attachment: { type: Boolean, default: false },
        attachment_type: String,
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

/*
const jobDetailSchema: Schema<IJobDetail> = new Schema(
    {
        from: [String],
        required: Boolean,
        completed: Boolean,
        queue: [String],
        status: String,
    },

    {
        _id: false,
        versionKey: false,
    } //don't add an _id to documents
);

*/

const scheduleSchema: Schema = new Schema(
    {
        cronNbr: Number,
        cronTime: String,
        enabled: Boolean,
        lastExecution: Number,
        lastExecutionTime: String,
        nextExecution: Number,
        nextExecutionTime: String,
    },

    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

export interface IJobSchema {
    _id: string;
    about: string;
    annotations: IJobSchemaAnnotations;
    config?: IJobConfig;
    custom?: ICustomSchema;
    stmt?: IStmtSchema;
    description: string;
    log: IJob[];
    job: IJob;
    jobs: IJobDetails;
    name: string;
    out: {
        out: any;
        special?: string;
    }[];
    project: {
        org: string;
        orgscope: string;
    };
    schedule: IScheduleSchema;
    mail: IMailSchema;
    tags: string[];
    type: keyof typeof EJobTypes;
    templateid?: string;
    url?: IUrlSchema;
}

const dataSchema: Schema = new Schema(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        annotations: annotationsSchema,
        about: String,
        config: configSchema,
        custom: customSchema,
        description: String,
        job: jobSchema,
        jobs: Object,
        log: [jobSchema],
        mail: mailSchema,
        name: { type: String, required: true },
        out: [outSchema],
        project: projectSchema,
        schedule: scheduleSchema,
        stmt: stmtSchema,
        tags: [String],
        templateid: String,
        type: String,
        url: urlSchema,
    },
    {
        collection: 'jobs',
        strict: true,
        versionKey: false,
    }
);

dataSchema.index({ 'project.org': 1 }, { unique: true });
dataSchema.index({ 'project.org': 1, type: 1 });

/**
 * The Main model interface
 *
 * @interface IJobModel
 * @extends {IJobSchema}
 * @extends {mongoose.Document}
 */
export interface IJobModel extends IJobSchema, mongoose.Document {
    _id: string;
}

export const DataModel = mongoose.model<IJobModel>('jobs', dataSchema);

export const newId: () => string = () => mongoose.Types.ObjectId().toString();

export interface IntPayloadValues extends IJob {
    href: string;
    id: string;
    name: string;
    startbutton: string;
    starticon: string;
    statusicon: string;
    stopbutton: string;
    stopicon: string;
    editicon: string;
    deleteicon: string;
    key?: string;
    jobid: string;
    type?: string;
    org: string;
}

export interface ImakePlPayloadValues extends IntPayloadValues {
    moveicon: string;
}

export interface IJobResponse {
    count: number | null;
    email: string;
    error?: string | null;
    executor: keyof typeof ExecutorTypes;
    id: string;
    jobend: Date | null;
    jobid: string;
    jobstart?: Date;
    jobs?: IJob[];
    log?: IJob[];
    name: string;
    out?: any;
    outl?: any;
    runby: string;
    runtime: number | null;
    status: EJobStatusCodes;
    special?: string;
    transid: string;
    org: string;
    audit?: any;
}

export interface IDetailPayloadValues extends IJob {
    graph: any;
    id: string;
    name: string;
    jobs: IntPayloadValues;
    statusicon: string;
}

export interface IJobBody extends IJobSchema {
    action: string;
    custom__code: string;
    custom__executor: keyof typeof ECodeLanguage;
    email: string;
    id?: string;
    job__params: any;
    mail__delivery: string;
    mail__enabled: boolean;
    mail__recipients: string[];
    org: string;
    orgscope: string;
    schedule__cronTime: string;
    schedule__enabled: boolean;
    sessionid?: string;
    source__sql: string;
    stmt__connection: string;
    stmt__sql: string;
    stmt__type: boolean;
    target__truncate: boolean;
    transid: string;
    url__body: string;
    url__headers: string;
    url__type: string;
    url__url: string;
    username: string;
    graph?: any;
    jobid?: string;
    records?: any[];
    completed: boolean;
    template_copy: boolean;
}
