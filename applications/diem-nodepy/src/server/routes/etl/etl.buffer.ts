import { green, red, blue } from '@interfaces';
import { publisher } from '@config/nats_publisher';
import { workers } from './etl.workers';

export const addToBuffer: (id: string, buffer: Buffer) => void = (id: string, buffer: Buffer) => {
    if (!workers[id]) {
        console.warn(green, `$np ${process.pid} ${id}: no running worker found for adding buffer`);

        return;
    }

    const data: string = buffer.toString();

    if (data.endsWith('\n')) {
        workers[id].buffer = workers[id]?.buffer ? (workers[id].buffer += data) : data;

        const resp: string | undefined = workers[id].buffer;

        if (resp) {
            const json_array: string[] = resp.split('\n').filter((s: string) => s);
            const size: number = json_array.length;

            console.info(green, `$np ${process.pid} ${id}: processing data: length: ${size}`, '');
            void publisher.publish('job', resp, size);
        } else {
            console.info(green, `$np ${process.pid} ${id}: nothing to process}`, '');
        }

        workers[id].buffer = undefined;
    } else {
        console.info(blue, `$np ${process.pid} ${id}: buffering incoming stream`);
        workers[id].buffer = workers[id]?.buffer ? (workers[id].buffer += data) : data;
    }
};

export const addToErrorBuffer: (id: string, buffer: Buffer) => void = (id: string, buffer: Buffer) => {
    if (!workers[id]) {
        console.warn(green, `$np ${process.pid} ${id}: no running worker found for adding error buffer`);

        return;
    }

    // errors will be buffered and posted once the exit signal is received
    const data: string = buffer.toString();

    if (data.endsWith('\n')) {
        workers[id].errbuffer = workers[id]?.errbuffer ? (workers[id].errbuffer += data) : data;

        console.info(red, `$np ${process.pid} ${id}: returning error`);
    } else {
        console.info(blue, `$np ${process.pid} ${id}: buffering incoming error stream`);
        workers[id].errbuffer = workers[id]?.errbuffer ? (workers[id].errbuffer += data) : data;
    }
};
