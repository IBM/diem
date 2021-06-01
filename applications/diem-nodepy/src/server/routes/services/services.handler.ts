import { promises as fs } from 'fs';
import path from 'path';
import { utils } from '@config/utils';
import { IError, ServicesJob, IHandler, ECodeLanguage } from '@interfaces';
import { addTrace } from '../shared/functions';
import { servicesNodepy } from './services.nodepy';

const base64decode: (file: string) => string = (file: string) => {
    const buff: Buffer = Buffer.from(file, 'base64');

    return buff.toString('utf8');
};

export const servicesHandler: (req: any, res: any) => any = async (req: any, res: any) => {
    if (req.method === 'GET') {
        return res.status(200).json({
            message: 'Only Post is allowed',
        });
    }

    const job: ServicesJob = { ...req.body };

    try {
        const resp: any = await handler(job);

        return res.status(200).json(resp);
    } catch (err) {
        return res.status(500).json(err);
    }
};

export const handler: (job: ServicesJob) => any = async (job: ServicesJob): Promise<IHandler> => {
    if (!job.id) {
        return Promise.reject({
            ok: false,
            message: 'The is no ID in this job',
        });
    }

    const id: string = job.id;

    utils.logInfo(`$services.handler (handler): new request - job: ${id}`, job.transid);

    // clean up the file and fill in the missing data
    const code: string = base64decode(job.code);

    await fs.mkdir(`${path.resolve()}/workdir/${id}/workdir`, { recursive: true }).catch(async (error: Error) => {
        const err: IError = {
            ...error,
            caller: 'NodePy services.handler (handler): mkdir',
            message: `Executor: Could not create the folder for job ${id}`,
        };

        void utils.logError(`$services.handler (handler): mkdir - job: ${id}`, err);

        return Promise.reject(err);
    });

    const extention: string = job.language === ECodeLanguage.javascript ? 'js' : 'py';

    await fs.writeFile(`${path.resolve()}/workdir/${id}/${id}.${extention}`, code).catch(async (err: IError) => {
        err.caller = 'NodePy services.handler (handler): writeFile';
        err.message = `Executor: Could not save the file for job ${id}`;
        err.trace = addTrace(err.trace, '@at $services.handler (handler): writeFile');

        void utils.logError(`$services.handler (handler): savefile - job: ${id}`, err);

        return Promise.reject(err);
    });

    // just start it , no need to await here
    const response: any = servicesNodepy(job).catch(async (err: IError) => {
        err.trace = addTrace(err.trace, '@at $services.handler (handler): response');

        // services will not return any error when executing the code. We just return to DIEM
        // void utils.logError(`$services.handler (handler): savefile - job: ${id}`, err);

        return Promise.reject(err);
    });

    return Promise.resolve(response);

    // execute the file
};
