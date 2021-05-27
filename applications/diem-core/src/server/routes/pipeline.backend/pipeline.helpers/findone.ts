import { DataModel, IJobModel } from '@models';

export const findOne: (id: string) => Promise<IJobModel | null> = async (id: string): Promise<IJobModel | null> => {
    const doc: IJobModel | null = await DataModel.findOne({ _id: id }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $findOne (findOne)'],
        });
    }

    return Promise.resolve(doc);
};

export const findOneAndUpdate: (id: string, update: any) => Promise<IJobModel | null> = async (
    id: string,
    update: any
): Promise<IJobModel | null> => {
    const doc: IJobModel | null = await DataModel.findByIdAndUpdate({ _id: id }, update, {
        new: true,
        useFindAndModify: false,
    }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $findOne (findOne)'],
        });
    }

    return Promise.resolve(doc);
};
