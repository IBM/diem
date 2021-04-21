import { green, red, blue, IMeta, IChildProcess } from '@interfaces';
import { publisher } from '@config/nats_publisher';
import { workers } from './etl.workers';

export const addToBuffer: (id: string, buffer: Buffer) => Promise<void> = async (id: string, buffer: Buffer) => {
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

            const worker: IChildProcess = workers[id];

            if (worker && worker.meta) {
                const ts: number = new Date().getTime();

                const meta: IMeta = worker.meta;

                // info
                const cycle = meta.cycle || 0;
                const size: number = json_array.length;
                const p_acc_size: number = meta.acc_size;
                const acc_size: number = p_acc_size + size;

                // fields used in the calculation of the delay
                const p_ts = meta.ts || 0;
                const p_acc_ts: number = meta.acc_ts;
                const diff: number = ts - p_ts;
                const acc_ts: number = p_acc_ts + diff;
                const p_s_ts: number = meta.s_ts;
                let s_ts: number;

                let delay: number = 0;

                if (p_s_ts > acc_ts) {
                    delay = p_s_ts - acc_ts;
                    s_ts = p_s_ts + size * 10 + 50;
                } else {
                    s_ts = acc_ts + size * 10 + 50;
                }

                workers[id].meta = {
                    cycle: cycle + 1,
                    size,
                    ts,
                    acc_size,
                    acc_ts,
                    s_ts,
                };

                console.info(
                    green,
                    `$np ${process.pid} ${id}: processing data: size: ${size} - cycle: ${
                        cycle + 1
                    } - runtime: ${diff} - acc_size: ${acc_size} - acc_ts: ${acc_ts} - s_ts: ${s_ts} - delay: ${delay} `,
                    ''
                );

                setTimeout(() => {
                    void publisher.publish('job', resp, worker.meta);
                }, delay);
            } else {
                void publisher.publish('job', resp);
            }

            //await new Promise((resolve) => setTimeout(resolve, wait));
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
