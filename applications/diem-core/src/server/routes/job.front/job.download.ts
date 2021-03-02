import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { DataModel, IJobSchema } from '../models/models';
import { addTrace } from '../shared/functions';

export const jobdownload: (req: IRequest) => Promise<any> = async (req: IRequest): Promise<any> => {
    if (!req.body.id) {
        return Promise.reject({
            return: { message: 'No or incorrect Document ID Provided' },
            status: 404,
        });
    }

    const id: string = req.body.id;

    const hrstart: any = process.hrtime();

    try {
        const doc: IJobSchema | null = await DataModel.findOne({ _id: id }).lean().exec();

        if (doc === null) {
            return Promise.reject({
                message: 'doc not found',
                trace: ['@at $job.download (jobdownload)'],
            });
        }

        utils.logInfo(`$job.download (jobdetail) - job ${id}`, req.transid, process.hrtime(hrstart));

        return Promise.resolve({
            binary: 'application/json',
            data: JSON.stringify(doc),
            filename: `${doc.name.toLowerCase()}.json`,
        });
    } catch (err) {
        if (err.message && err.message.includes('Cast to ObjectI')) {
            return Promise.resolve({});
        }

        err.job = req.body.id;
        err.trace = addTrace(err.trace, '@at $job.download (jobdownload)');

        void utils.logError(err);

        return Promise.reject(err);
    }
};
