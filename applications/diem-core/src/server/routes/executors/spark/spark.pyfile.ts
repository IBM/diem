import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { DataModel, EJobTypes, IJobSchema, ECodeLanguage } from '@models';
import { addTrace } from '@functions';
import { handleWithConfig } from './spark.job.handlers/handle.spark.config';
import { handleWithCustom } from './spark.job.handlers/handle.spark.custom';
import { py_start } from './spark.pycode/py';

export const pyfile: (req: IRequest) => Promise<any> = async (req: IRequest): Promise<any> => {
    if (req.query.id === null) {
        return Promise.resolve('');
    }

    const id: string = req.params.pyfile.split('.')[0];

    const doc: IJobSchema | null = await DataModel.findOne({ _id: id }).lean().exec();

    if (doc === null) {
        return Promise.reject({
            message: 'doc not found',
            trace: ['@at $spark.pyfile (pyfile)'],
        });
    }

    let code: string = py_start();

    /* a regular spark job */
    if (doc.type === EJobTypes.pyspark) {
        code = await handleWithConfig(doc, code).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $spark.pyfiles (pyfile) - handleWithConfig');

            return Promise.reject(err);
        });

        utils.logInfo(`$pyfile (pyfile): config spark requested - job: ${id}`, req.transid);

        return Promise.resolve(code);
    }

    /* a custom job using spark */
    if (doc.type === EJobTypes.pycustom && doc.custom && doc.custom.executor === ECodeLanguage.pyspark) {
        code = await handleWithCustom(doc, code).catch(async (err: any) => {
            err.trace = addTrace(err.trace, '@at $spark.pyfiles (pyfile) - handleWithCustom ');

            return Promise.reject(err);
        });

        utils.logInfo(`$pyfile (pyfile): custom spark requested - job: ${id}`, req.transid);

        return Promise.resolve(code);
    }

    return Promise.resolve('This is not a valid spark file');
};
