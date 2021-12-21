import { promises as fs } from 'fs';
import path from 'path';
import { utils } from '@config/utils';
import { IError, IntJob, ECodeLanguage } from '@interfaces';
import { publisher } from '@config/nats_publisher';
import { base64decode, randstring } from '@shared/functions';
import { etlNodepy } from './etl.nodepy';

export const handler: (job: IntJob) => any = async (job: IntJob): Promise<void> => {
    if (!job.id) {
        return Promise.reject({
            ok: false,
            message: 'The is no ID in this job',
        });
    }

    job.rand = randstring();

    const sid = `${job.id}-${job.rand}`;

    utils.logInfo(`$etl.handler (handler): new request - job: ${sid}`, job.transid);

    // clean up the file and fill in the missing data
    const code: string = base64decode(job.code);

    await fs.mkdir(`${path.resolve()}/workdir/${sid}/workdir`, { recursive: true }).catch(async (err: IError) => {
        err.caller = 'rest.handler (handler): mkdir';
        err.message = `Executor: Could not create the folder for job ${sid}`;

        await utils.logError(`$etl.handler (handler): mkdir - job: ${sid}`, err);

        publisher.publish('job', job.id, {
            ...job,
            count: null,
            error: err.message,
            status: 'Failed',
            jobend: new Date(),
            runtime: null,
        });
    });

    const extention: string = job.language === ECodeLanguage.javascript ? 'js' : 'py';

    await fs.writeFile(`${path.resolve()}/workdir/${sid}/${sid}.${extention}`, code).catch(async (error: Error) => {
        const err: IError = {
            ...error,
            caller: 'rest.handler (handler): writeFile',
            message: `Executor: Could not save the file for job ${sid}`,
        };

        await utils.logError(`$etl.handler (handler): savefile - job: ${sid}`, err);

        void publisher.publish('job', job.id, {
            ...job,
            count: null,
            error: err.message,
            status: 'Failed',
            jobend: new Date(),
            runtime: null,
        });
    });

    // just start it , no need to await here
    void etlNodepy(job);

    // execute the file
};
