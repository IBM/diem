import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema, IJobSchemaAnnotations, projectSchema } from './model.common';
export { Aggregate, Document, Model, Error as MongoServerError } from 'mongoose';

type IIdtype = 'personal' | 'functional';

export interface ISnippetPayload {
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
    snippet: string;
    snippetid: string;
    viewicon: string;
    lock?: string;
}

export interface ISnippetsBody {
    description: string;
    email: string;
    id?: string;
    idtype: IIdtype;
    name: string;
    sessionid?: string;
    snippet: string;
    transid: string;
    username: string;
    org?: string;
    selector: string;
    store: string;
    owner?: string;
}

export interface ISnippetSchema {
    _id: string;
    annotations: IJobSchemaAnnotations;
    description: string;
    name: string;
    project: {
        org: string;
        orgscope?: string;
    };
    idtype: IIdtype;
    snippet: string;
    selector: string;
    owner?: string;
}

const snippetsSchema: Schema = new Schema(
    {
        annotations: annotationsSchema,
        description: String,
        name: { type: String, required: true },
        project: projectSchema,
        selector: { type: String, required: true },
        idtype: { type: String },
        snippet: { type: String, required: true },
        owner: String,
    },
    {
        collection: 'snippets',
        strict: true,
        versionKey: false,
    }
);

snippetsSchema.index({ 'project.org': 1, selector: 1 });
snippetsSchema.index({ 'project.org': 1, _id: 1 });

export interface ISnippetsModel extends ISnippetSchema, mongoose.Document {
    _id: string;
}

export const SnippetsModel = mongoose.model<ISnippetsModel>('snippets', snippetsSchema);
