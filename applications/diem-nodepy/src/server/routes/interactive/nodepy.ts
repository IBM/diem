import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import { IntStmt } from '../../config/interfaces';
import { pubSub } from '../../config/pubsub';

const green: string = '\x1b[92m%s\x1b[0m';
const channel: string = 'np_interactive';

interface IChildProcess extends ChildProcessWithoutNullStreams {
    buffer?: string;
}

interface IWorker {
    [index: string]: IChildProcess;
}

const workers: IWorker = {};

const getCount: () => number = () => Object.keys(workers).length;

export const stopWorker: (stmt: IntStmt) => void = (stmt: IntStmt): void => {
    const id: string = stmt.id;

    if (!workers[id]) {
        console.warn(green, `$nodepy (nodepy): no running child process found - id: ${id} - pid (${process.pid}`);

        return;
    }
    workers[id].kill();

    delete workers[id];
    console.info(green, `$nodepy (nodepy): cleaning up - id: ${id} - active: ${getCount()} - pid (${process.pid})`);
};

export const deleteWorker: (jid: string, code: string) => void = (id: string, code: string): void => {
    if (workers[id]) {
        delete workers[id];
        console.info(
            green,
            `$nodepy (nodepy): cleaning up worker - id: ${id} - status: ${code} - active: ${getCount()} - pid (${
                process.pid
            })`
        );
    }
};

export const nodepy: (stmt: IntStmt) => any = (stmt: IntStmt) => {
    const id: string = stmt.id;

    if (workers[id]) {
        console.warn(green, `$nodepy (nodepy): already running - id: ${id} - pid (${process.pid}`);

        return;
    }

    workers[id] = spawn('python3', ['-u', `${path.resolve()}/pyfiles/${id}.py`]);
    // collect data from script

    workers[id].stdout.setEncoding('utf8');
    workers[id].stdout.on('data', (buffer: Buffer) => {
        const data: string = buffer.toString();

        if (data.endsWith('\n')) {
            workers[id].buffer = workers[id].buffer ? (workers[id].buffer += data) : data;

            console.info(green, `$nodepy (nodepy): forwarding incoming stream - id: ${id} - pid (${process.pid})`);

            pubSub.publish(channel, {
                email: stmt.email,
                id: stmt.id,
                transid: stmt.transid,
                data: workers[id].buffer || '',
            });

            workers[id].buffer = undefined;
        } else {
            console.info(green, `$nodepy (nodepy): buffering incoming stream - id: ${id} - pid (${process.pid})`);
            workers[id].buffer = workers[id].buffer ? (workers[id].buffer += data) : data;
        }
    });

    // Error handling

    workers[id].stderr.setEncoding('utf8');
    workers[id].stderr.on('data', (data: Buffer) => {
        const response: string = data.toString();

        pubSub.publish(channel, {
            email: stmt.email,
            id: stmt.id,
            transid: stmt.transid,
            data: response,
        });

        console.warn(green, `$nodepy (nodepy): incoming error - id: ${id} - pid (${process.pid})`, '\n', response);
    });

    workers[id].stderr.on('error', (err: Error) => {
        console.info('child process errored', err);
        console.error(
            '\x1b[35m%s\x1b[0m',
            `$nodepy (nodepy): incoming response - id: ${id} - pid (${process.pid})`,
            '\n',
            err
        );

        const response: string = err.toString();

        pubSub.publish(channel, {
            email: stmt.email,
            id: stmt.id,
            transid: stmt.transid,
            data: response,
        });

        deleteWorker(id, '1');
    });

    workers[id].on('exit', (code: string, signal: string) => {
        console.info(
            green,
            `$nodepy (nodepy): clean exit signal received - id: ${id} - status: ${code || signal} - pid (${
                process.pid
            })`
        );

        deleteWorker(id, code || signal);
    });

    workers[id].on('close', (code: string) => {
        deleteWorker(id, code);
    });
};
