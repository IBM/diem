import { IntMQLog, IRequest } from '@interfaces';
import { utils } from '@common/utils';
import { ILoggerModel, loggerModel } from '@models';
import { addTrace } from '@functions';

const logger: (log: IntMQLog, transid: string) => Promise<void> = async (
    log: IntMQLog,
    transid: string
): Promise<void> => {
    const doc: ILoggerModel = new loggerModel(log);
    doc._id = transid || utils.guid();
    await doc.save().catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $logger (logger) - save');
        void utils.logError('$logger (logger): save error', err);
    });
};

export const toMQ = async (
    req: IRequest,
    status: number,
    event: string,
    err?: Error,
    hrstart: [number, number] = [0, 0],
    pack: any = {}
): Promise<void> => {
    const log: IntMQLog = {
        annotations: {
            execution: utils.hrTime(hrstart),
            profile: req.token,
            time: new Date(),
            transid: req.transid || utils.guid(),
        },
        browser: utils.browser(req),
        err,
        event,
        module: pack,
        request: {
            body: req.body,
            params: req.params,
            query: typeof req.query === 'string' ? req.query : '',
            url: `${req.hostname}${req.path}`,
        },
        status,
    };

    await logger(log, req.transid);
};
