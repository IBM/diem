import path from 'path';
import * as rimraf from 'rimraf';
import { publisher } from '@config/nats_publisher';
import { IntJob, green, red } from '@interfaces';
import { IWorker } from 'interfaces/interfaces';

export const workers: IWorker = Object.create(null);

const getCount: () => number = () => Object.keys(workers).length;

export const stopWorker: (job: IntJob) => Promise<void> = async (job: IntJob): Promise<void> => {
    const id: string = job.id;

    if (!workers[id]) {
        console.warn(green, `$np (stopWorker): no running worker found - id: ${id} - pid (${process.pid}`);

        return;
    }
    workers[id].kill();

    await deleteWorker(job, 0, 'stopped');
};

export const deleteWorker: (job: IntJob, code: number | null, action: string) => Promise<void> = async (
    job: IntJob,
    code: number | null,
    action: string
): Promise<void> => {
    const id: string = job.id;
    if (!workers[id]) {
        console.warn(green, `$np ${process.pid} ${id}: no running worker found - action: ${action}`);

        return;
    }

    if (code === 1 && workers[id].errbuffer) {
        // there is an error reported that has not yet been traced back to the etl manager

        try {
            void publisher.publish('job', {
                ...job,
                count: null,
                error: workers[id].errbuffer,
                status: 'Failed',
                jobend: new Date(),
                runtime: null,
            });
        } catch (err) {
            console.error(red, `$np ${process.pid} ${id}: error posting file (deleteWorker)`, err);
        }
    }

    delete workers[id];

    // const file: string = `${path.resolve()}/workdir/${folder}/${id}.py`;

    try {
        rimraf.sync(`${path.resolve()}/workdir/${id}`);

        console.info(green, `$np ${process.pid} ${id}: removed folder ${id}`);
    } catch (err) {
        console.error(
            red,
            `$np ${process.pid} ${id}: folder ${id} not deelted - folder might already have been removed`
        );
    }

    console.info(
        green,
        `$np ${process.pid} ${id}: finished action: ${action} - status: ${code} - active: ${getCount()}`
    );
};
