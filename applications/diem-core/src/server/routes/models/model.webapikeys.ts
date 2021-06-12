import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema, IJobSchemaAnnotations, projectSchema } from './model.common';
export { Aggregate, Document, Model, Error as MongoError } from 'mongoose';

type IIdtype = 'personal' | 'functional';

export interface IWebApiKey {
    [index: string]: string | string[];
    name: string;
    email: string;
    org: string;
    id: string;
    uid: string;
}

export interface IWebApikeyPayload {
    createdby: string;
    createddate: string;
    deleteicon?: string;
    description: string;
    editicon?: string;
    id: string;
    idtype: IIdtype;
    lock?: string;
    name: string;
    org: string;
    owner?: string;
    params: string;
    selector: string;
    viewicon: string;
    webapikey: string;
}

export interface IWebApikeysBody {
    description: string;
    email: string;
    id?: string;
    idtype: IIdtype;
    name: string;
    org: string;
    selector: string;
    sessionid?: string;
    store: string;
    transid: string;
    username: string;
    params: string;
    webapikey: string;
    owner?: string;
}

export interface IWebApikeysSchema {
    _id: string;
    name: string;
    description: string;
    annotations: IJobSchemaAnnotations;
    idtype: IIdtype;
    owner?: string;
    params: IWebApiKey;
    project: {
        org: string;
        orgscope?: string;
    };
    selector: string;
    webapikey: string;
}

const webapikeysSchema: Schema = new Schema(
    {
        _id: { type: String },
        annotations: annotationsSchema,
        description: String,
        idtype: { type: String },
        name: { type: String, required: true },
        owner: String,
        project: projectSchema,
        selector: { type: String, required: true },
        webapikey: { type: String, required: true },
        params: { type: Object, required: true },
    },
    {
        collection: 'webapikeys',
        strict: true,
        versionKey: false,
    }
);

webapikeysSchema.index({ 'project.org': 1, _id: 1 });

export interface IWebApikeysModel extends IWebApikeysSchema, mongoose.Document {
    _id: string;
}

export const WebApikeysModel = mongoose.model<IWebApikeysModel>('webapikeys', webapikeysSchema);
