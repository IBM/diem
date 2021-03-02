import { IJobSchemaAnnotations } from './model.common';
export { Aggregate, Document, Model, Error as MongoError } from 'mongoose';

export interface IFilesBody {
    description: string;
    email: string;
    id?: string;
    name: string;
    sessionid?: string;
    file: any;
    transid: string;
    username: string;
    org?: string;
    selector: string;
    store: string;
    files: any[];
}

export interface IFile {
    _id: string;
    annotations: IJobSchemaAnnotations;
    description: string;
    name: string;
    project: {
        org: string;
        orgscope?: string;
    };
    file: any;
    selector: string;
}
