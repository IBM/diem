import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema, projectSchema, IJobSchemaAnnotations } from './model.common';
export { Aggregate, Schema, Document, Model, Error as MongoError } from 'mongoose';

type IIdtype = 'personal' | 'functional';

export interface IConfigmapPayload {
    configmap: string;
    createdby: string;
    createddate: string;
    deleteicon?: string;
    description: string;
    editicon?: string;
    id: string;
    idtype: IIdtype;
    name: string;
    org: string;
    owner?: string;
    selector: string;
    viewicon: string;
    lock?: string;
}

export interface IConfigmapsBody {
    configmap: any;
    description: string;
    email: string;
    id?: string;
    idtype: IIdtype;
    name: string;
    org?: string;
    selector: string;
    sessionid?: string;
    store: string;
    transid: string;
    username: string;
}

export interface IConfigmapSchema {
    _id: string;
    annotations: IJobSchemaAnnotations;
    description: string;
    name: string;
    project: {
        org: string;
        orgscope?: string;
    };
    configmap: { [index: string]: any };
    idtype: IIdtype;
    selector: string;
    owner?: string;
}

const configmapSchema: Schema = new Schema(
    {
        annotations: annotationsSchema,
        configmap: { type: Object, required: true },
        description: String,
        idtype: { type: String },
        name: { type: String, required: true },
        owner: String,
        project: projectSchema,
        selector: { type: String, required: true, index: true },
    },
    {
        collection: 'configmap',
        strict: true,
        versionKey: false,
    }
);

configmapSchema.index({ 'project.org': 1, _id: 1 });
configmapSchema.index({ 'project.org': 1, selector: 1 });

export interface IConfigmapsModel extends IConfigmapSchema, mongoose.Document {
    _id: string;
}

export const ConfigmapsModel = mongoose.model<IConfigmapsModel>('configmap', configmapSchema);
