import { spawn } from 'child_process';
import path from 'path';
import { publisher } from '@config/nats_publisher';
import { IntJob, green, red, ECodeLanguage, IError } from '@interfaces';
import { workers, deleteWorker } from './etl.workers';
import { addToBuffer, addToErrorBuffer } from './etl.buffer';

export const etlNodepy: (job: IntJob) => any = (job: IntJob) => {
    const sid = `${job.id}-${job.rand}`;

    if (workers[sid]) {
        console.warn(green, `$np ${process.pid} ${sid}: worker already running`);

        publisher.publish('job', job.id, {
            ...job,
            count: null,
            error: `job ${sid} is already running, please stop it and try again`,
            status: 'Failed',
            jobend: new Date(),
            runtime: null,
        });

        return;
    }

    if (job.language === ECodeLanguage.javascript) {
        workers[sid] = spawn('node', [`${path.resolve()}/workdir/${sid}/${sid}.js`, job.params || {}], {
            env: {
                PATH: `/home/app/.local/bin:${process.env.PATH}`,
            },
            cwd: `${path.resolve()}/workdir/${sid}/workdir`,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        });
    } else {
        workers[sid] = spawn('python3', ['-u', `${path.resolve()}/workdir/${sid}/${sid}.py`, job.params], {
            env: {
                PATH: `/home/app/.local/bin:${process.env.PATH}`,
                PYTHONPATH: `${path.resolve()}/workdir/${sid}/workdir/`,
                APPPATH: `${process.env.PATH}/workdir`,
                CLASSPATH: '/opt/spark/jars/*',
            },
            cwd: `${path.resolve()}/workdir/${sid}`,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    }

    workers[sid].meta = {
        cycle: 0,
        acc_size: 0,
        acc_ts: 0,
        size: 0,
        ts: new Date().getTime(),
        s_ts: 0,
    };
    // collect data from script

    workers[sid].stdout.setEncoding('utf8');
    workers[sid].stdout.on('data', (buffer: Buffer) => {
        void addToBuffer(sid, job.id, buffer);
    });

    // here comes the error part

    workers[sid].stderr.setEncoding('utf8');
    workers[sid].stderr.on('data', (buffer: Buffer) => {
        addToErrorBuffer(sid, buffer);
    });

    /**
     * here an error comes in
     * We should not delete the job here
     * When listening to both the 'exit' and 'error' events, guard against accidentally invoking handler functions multiple times.
     */

    workers[sid].stderr.on('error', async (buffer: Buffer) => {
        const response: string = buffer.toString();
        // console.error(red, `$np ${process.pid} ${sid}: incoming error)`, '\n', response);
        console.error(red, `$np ${process.pid} ${sid}: incoming error`);

        publisher.publish('job', job.id, {
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

    workers[sid].on('exit', async (code: number | null, signal: string) => {
        console.info(green, `$np ${process.pid} ${sid}: clean exit signal - status: ${code || signal || 0}`);

        await deleteWorker(job, code, 'exit');
    });

    workers[sid].on('close', async (code: number | null) => {
        await deleteWorker(job, code, 'close');
    });

    workers[sid].on('error', async (err: IError) => {
        console.error(red, `$np ${process.pid} ${sid}: error creating process`, err);
        void publisher.publish('job', job.id, {
            ...job,
            count: null,
            error: err.message,
            status: 'Failed',
            jobend: new Date(),
            runtime: null,
        });
    });

    workers[sid].on('message', (data: any) => {
        void publisher.publish('job', job.id, data);
    });
};
