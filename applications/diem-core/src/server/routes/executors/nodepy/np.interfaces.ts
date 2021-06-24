import { IETLJob, IUrlSchema, IJobConfig, IStmtSchema, ECodeLanguage } from '@models';

// basically the job that will be sent to nodepy
export interface INodePyJob extends IETLJob {
    params?: any;
    code: string;
    cert?: string;
    language: keyof typeof ECodeLanguage;
}

// extending to handle the config values
export interface IntPythonTransferJob extends IETLJob {
    config: IJobConfig;
}

// extending to handle the statement values
export interface IntPythonStmtJob extends IETLJob {
    stmt: IStmtSchema;
}

// this is the job we post to nodepy
export interface IntPythonRestJob extends IETLJob {
    url: IUrlSchema;
}
