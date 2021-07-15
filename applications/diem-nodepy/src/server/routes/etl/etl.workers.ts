import path from 'path';
import * as rimraf from 'rimraf';
import { publisher } from '@config/nats_publisher';
import { IntJob, green, red } from '@interfaces';
import { IWorker } from 'interfaces/interfaces';

export const workers: IWorker = Object.create(null);

const getCount: () => number = () => Object.keys(workers).length;

export const stopWorker: (job: IntJob) => Promise<void> = async (job: IntJob): Promise<void> => {
    const sid = `${job.id}-${job.rand}`;

    if (!workers[sid]) {
        console.warn(green, `$np (stopWorker): no running worker found - id: ${sid} - pid (${process.pid}`);

        return;
    }
    workers[sid].kill();

    await deleteWorker(job, 0, 'stopped');
};

export const deleteWorker: (job: IntJob, code: number | null, action: string) => Promise<void> = async (
    job: IntJob,
    code: number | null,
    action: string
): Promise<void> => {
    const sid = `${job.id}-${job.rand}`;

    if (!workers[sid]) {
        console.warn(green, `$np ${process.pid} ${sid}: no running worker found - action: ${action}`);

        return;
    }

    if (code === 1 && workers[sid].errbuffer) {
        // there is an error reported that has not yet been traced back to the etl manager

        try {
            void publisher.publish('job', job.id, {
                ...job,
                count: null,
                error: workers[sid].errbuffer,
                status: 'Failed',
                jobend: new Date(),
                runtime: null,
            });
        } catch (err) {
            console.error(red, `$np ${process.pid} ${sid}: error posting file (deleteWorker)`, err);
        }
    }

    delete workers[sid];

    try {
        rimraf.sync(`${path.resolve()}/workdir/${sid}`);

        console.info(green, `$np ${process.pid} ${sid}: removed folder ${sid}`);
    } catch (err) {
        console.error(
            red,
            `$np ${process.pid} ${sid}: folder ${sid} not deelted - folder might already have been removed`
        );
    }

    console.info(
        green,
        `$np ${process.pid} ${sid}: finished action: ${action} - status: ${code} - active: ${getCount()}`
    );
};
