import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';
import { annotationsSchema } from './model.common';
export { Aggregate, Document, Model, Error as MongoError } from 'mongoose';

export interface ITagsBody {
    [key: string]: any;
    email: string;
    id?: string;
    sessionid?: string;
    tags: string[];
    transid: string;
    username: string;
}

export interface ITags {
    _id: string;
    org: string;
    annotations: {
        modifiedbyemail: string;
        modifiedbyname: string;
        modifieddate: Date;
        transid: string;
    };
    tags: string[];
}

const tagsSchema: Schema = new Schema(
    {
        annotations: annotationsSchema,
        org: { type: String, index: true, required: true },
        tags: [String],
    },
    {
        collection: 'tags',
        strict: true,
        versionKey: false,
    }
);

tagsSchema.index({ org: 1 }, { unique: true });

export interface ITagsModel extends ITags, mongoose.Document {
    _id: string;
}

export const TagsModel = mongoose.model<ITagsModel>('tags', tagsSchema);
