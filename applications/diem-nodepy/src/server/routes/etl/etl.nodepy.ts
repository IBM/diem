import { spawn } from 'child_process';
import path from 'path';
import { publisher } from '../../config/nats_publisher';
import { IntJob, green, red, ECodeLanguage } from '../../config/interfaces';
import { workers, deleteWorker } from './etl.workers';
import { addToBuffer, addToErrorBuffer } from './etl.buffer';

export const etlNodepy: (job: IntJob) => any = (job: IntJob) => {
    const id: string = job.id;

    if (workers[id]) {
        console.warn(green, `$np ${process.pid} ${id}: worker already running`);

        return;
    }

    if (job.language === ECodeLanguage.javascript) {
        workers[id] = spawn('node', [`${path.resolve()}/workdir/${id}/${id}.js`, job.params], {
            env: {
                PATH: `/home/app/.local/bin:${process.env.PATH}`,
                APPPATH: process.env.APPPATH,
            },
            cwd: `${path.resolve()}/workdir/${id}/workdir`,
        });
    } else {
        workers[id] = spawn('python3', ['-u', `${path.resolve()}/workdir/${id}/${id}.py`, job.params], {
            env: {
                PATH: `/home/app/.local/bin:${process.env.PATH}`,
                APPPATH: process.env.APPPATH,
                CLASSPATH: '/opt/spark/jars/*',
            },
            cwd: `${path.resolve()}/workdir/${id}/workdir`,
        });
    }

    // collect data from script

    workers[id].stdout.setEncoding('utf8');
    workers[id].stdout.on('data', (buffer: Buffer) => {
        addToBuffer(job.id, buffer);
    });

    // here comes the error part

    workers[id].stderr.setEncoding('utf8');
    workers[id].stderr.on('data', (buffer: Buffer) => {
        addToErrorBuffer(job.id, buffer);
    });

    /**
     * here an error comes in
     * We should not delete the job here
     * When listening to both the 'exit' and 'error' events, guard against accidentally invoking handler functions multiple times.
     */

    workers[id].stderr.on('error', async (buffer: Buffer) => {
        const response: string = buffer.toString();
        // console.error(red, `$np ${process.pid} ${id}: incoming error)`, '\n', response);
        console.error(red, `$np ${process.pid} ${id}: incoming error`);

        try {
            void publisher.publish('job',{
                ...job,
                count: null,
                error: response,
                status: 'Failed',
                jobend: new Date(),
                runtime: null,
            });
        } catch (err) {
            console.error(red, `$np ${process.pid} ${id}: error posting file (stderr)`, err);
        }
    });

    /**
     * The 'exit' event may or may not fire after an error has occurred.
     * When listening to both the 'exit' and 'error' events, guard against accidentally invoking handler functions multiple times.
     */

    workers[id].on('exit', async (code: number | null, signal: string) => {
        console.info(green, `$np ${process.pid} ${id}: clean exit signal - status: ${code || signal || 0}`);

        await deleteWorker(job, code, 'exit');
    });

    workers[id].on('close', async (code: number | null) => {
        await deleteWorker(job, code, 'close');
    });
};
