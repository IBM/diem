import { spawn } from 'child_process';
import path from 'path';
import { publisher } from '@config/nats_publisher';
import { IntJob, green, red, ECodeLanguage, IError } from '@interfaces';
import { workers, deleteWorker } from './etl.workers';
import { addToBuffer, addToErrorBuffer } from './etl.buffer';

export const etlNodepy: (job: IntJob) => any = (job: IntJob) => {
    const id: string = job.id;

    if (workers[id]) {
        console.warn(green, `$np ${process.pid} ${id}: worker already running`);

        publisher.publish('job', id, {
            ...job,
            count: null,
            error: `job ${id} is already running, please stop it and try again`,
            status: 'Failed',
            jobend: new Date(),
            runtime: null,
        });

        return;
    }

    if (job.language === ECodeLanguage.javascript) {
        workers[id] = spawn('node', [`${path.resolve()}/workdir/${id}/${id}.js`, job.params || {}], {
            env: {
                PATH: `/home/app/.local/bin:${process.env.PATH}`,
            },
            cwd: `${path.resolve()}/workdir/${id}/workdir`,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
    } else {
        workers[id] = spawn('python3', ['-u', `${path.resolve()}/workdir/${id}/${id}.py`, job.params], {
            env: {
                PATH: `/home/app/.local/bin:${process.env.PATH}`,
                PYTHONPATH: `${path.resolve()}/workdir/${id}/workdir/`,
                APPPATH: `${process.env.PATH}/workdir`,
                CLASSPATH: '/opt/spark/jars/*',
            },
            cwd: `${path.resolve()}/workdir/${id}`,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    }

    workers[id].meta = {
        cycle: 0,
        acc_size: 0,
        acc_ts: 0,
        size: 0,
        ts: new Date().getTime(),
        s_ts: 0,
    };
    // collect data from script

    workers[id].stdout.setEncoding('utf8');
    workers[id].stdout.on('data', (buffer: Buffer) => {
        void addToBuffer(job.id, buffer);
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

        publisher.publish('job', id, {
            ...job,
            count: null,
            error: response,
            status: 'Failed',
            jobend: new Date(),
            runtime: null,
        });
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

    workers[id].on('error', async (err: IError) => {
        console.error(red, `$np ${process.pid} ${id}: error creating process`, err);
        void publisher.publish('job', id, {
            ...job,
            count: null,
            error: err.message,
            status: 'Failed',
            jobend: new Date(),
            runtime: null,
        });
    });

    workers[id].on('message', (data: any) => {
        void publisher.publish('job', id, data);
    });
};
