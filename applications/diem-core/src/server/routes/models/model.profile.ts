import { mongoose } from '@common/mongo';
import { Schema } from 'mongoose';

export interface IProfileSchema {
    _id: string;
    email: string;
    modifieddate: Date;
    org: string;
    role: string;
}

const profileSchema: Schema = new Schema(
    {
        _id: { type: Schema.Types.ObjectId, auto: true },
        email: { type: String, index: true, required: true, unique: true },
        modifieddate: Date,
        org: { type: String, index: true, required: true },
        role: { type: String, required: true },
    },
    {
        _id: false,
        versionKey: false,
    } /*** don't add an _id to documents */
);

profileSchema.index({ email: 1 });

export interface IProfileModel extends IProfileSchema, mongoose.Document {
    _id: string;
}

export const ProfileModel = mongoose.model<IProfileModel>('profile', profileSchema);
