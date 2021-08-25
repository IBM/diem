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

export const findOneAndUpdate: (id: string, update: any) => Promise<IJobModel> = async (
    id: string,
    update: any
): Promise<IJobModel> => {
    const doc: IJobModel | null = await DataModel.findByIdAndUpdate(id, update, {
        new: true,
    }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $findOne (findOne)'],
        });
    }

    return Promise.resolve(doc);
};
