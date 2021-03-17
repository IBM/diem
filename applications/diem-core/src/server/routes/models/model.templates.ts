import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema, projectSchema, IJobSchemaAnnotations } from './model.common';
import { EJobTypes } from './model.job';
export { Aggregate, Document, Model, Error as MongoError } from 'mongoose';

export interface ITemplatesBody {
    description: string;
    email: string;
    id?: string;
    name: string;
    sessionid?: string;
    template: string;
    transid: string;
    username: string;
    org?: string;
    type: keyof typeof EJobTypes;
    store: string;
}

export interface ITemplateSchema {
    _id: string;
    annotations: IJobSchemaAnnotations;
    description: string;
    name: string;
    project: {
        org: string;
        orgscope?: string;
    };
    template: string;
    type: keyof typeof EJobTypes;
}

const templatesSchema: Schema = new Schema(
    {
        annotations: annotationsSchema,
        description: String,
        name: { type: String, required: true },
        project: projectSchema,
        template: { type: String, required: true },
        type: String,
    },
    {
        collection: 'templates',
        strict: true,
        versionKey: false,
    }
);

templatesSchema.index({ 'project.org': 1, _id: 1 });

export interface ITemplatesModel extends ITemplateSchema, mongoose.Document {
    _id: string;
}

export const TemplatesModel = mongoose.model<ITemplatesModel>('templates', templatesSchema);
