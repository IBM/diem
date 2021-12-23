import { IntMQLog, IRequest, ELogEvent } from '@interfaces';
import { utils } from '@common/utils';
import { ILoggerModel, loggerModel } from '@models';
import { addTrace } from '@functions';

const logger: (log: IntMQLog) => Promise<void> = async (log: IntMQLog): Promise<void> => {
    const doc: ILoggerModel = new loggerModel(log);
    await doc.save().catch(async (err) => {
        err.trace = addTrace(err.trace, '@at $logger (logger) - save');
        void utils.logError('$logger (logger): save error', err);
    });
};

export const toMQ = async (
    req: IRequest,
    status: number,
    event: string,
    type: ELogEvent,
    err?: Error,
    hrstart: [number, number] = [0, 0],
    pack: any = {}
): Promise<void> => {
    const transid: string = req.transid || utils.guid();

    const log: IntMQLog = {
        logid: transid,
        created: new Date(),
        annotations: {
            execution: utils.hrTime(hrstart),
            profile: req.token || req.user || undefined,
            org: req.user?.org || 'anonymous',
            transid: req.transid,
        },
        browser: err ? req.headers : utils.browser(req),
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
        type,
    };

    await logger(log);
};
