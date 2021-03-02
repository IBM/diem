import { DataModel, IModel } from '../../models/models';

export const findOne: (id: string) => Promise<IModel | null> = async (id: string): Promise<IModel | null> => {
    const doc: IModel | null = await DataModel.findOne({ _id: id }).exec();

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $findOne (findOne)'],
        });
    }

    return Promise.resolve(doc);
};

export const findOneAndUpdate: (id: string, update: any) => Promise<IModel | null> = async (
    id: string,
    update: any
): Promise<IModel | null> => {
    const doc: IModel | null = await DataModel.findOneAndUpdate({ _id: id }, update, {
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
