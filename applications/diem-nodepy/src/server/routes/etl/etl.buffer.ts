import { green, red, blue, IMeta } from '@interfaces';
import { publisher } from '@config/nats_publisher';
import { workers } from './etl.workers';

export const addToBuffer: (sid: string, id: string, buffer: Buffer) => Promise<void> = async (
    sid: string,
    id: string,
    buffer: Buffer
    // eslint-disable-next-line sonarjs/cognitive-complexity
) => {
    if (!workers[sid]) {
        console.warn(green, `$np ${process.pid} ${sid}: no running worker found for adding buffer`);

        return;
    }

    const data: string = buffer.toString();

    if (data.endsWith('\n')) {
        if (workers[sid]?.buffer) {
            workers[sid].buffer = workers[sid].buffer += data;
        } else {
            workers[sid].buffer = data;
        }

        const resp: string | undefined = workers[sid].buffer;

        if (resp) {
            const json_array: string[] = resp.split('\n').filter((s: string) => s);

            const meta: IMeta | undefined = workers[sid].meta;

            if (meta) {
                const ts: number = new Date().getTime();

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

                let delay = 0;

                if (p_s_ts > acc_ts) {
                    delay = p_s_ts - acc_ts;
                    s_ts = p_s_ts + 75;
                } else {
                    s_ts = acc_ts + 75;
                }

                workers[sid].meta = {
                    cycle: cycle + 1,
                    size,
                    ts,
                    acc_size,
                    acc_ts,
                    s_ts,
                };

                console.info(
                    green,
                    `$np ${process.pid} ${sid}: processing data: size: ${size} - cycle: ${
                        cycle + 1
                    } - runtime: ${diff} - acc_size: ${acc_size} - acc_ts: ${acc_ts} - s_ts: ${s_ts} - delay: ${delay} `,
                    ''
                );

                setTimeout(() => {
                    void publisher.publish('job', id, resp, meta);
                }, delay);
            } else {
                void publisher.publish('job', id, resp);
            }
        } else {
            console.info(green, `$np ${process.pid} ${sid}: nothing to process}`, '');
        }

        workers[sid].buffer = undefined;
    } else {
        console.info(blue, `$np ${process.pid} ${sid}: buffering incoming stream`);
        if (workers[sid]?.buffer) {
            workers[sid].buffer = workers[sid].buffer += data;
        } else {
            workers[sid].buffer = data;
        }
    }
};

export const addToErrorBuffer: (sid: string, buffer: Buffer) => void = (sid: string, buffer: Buffer) => {
    if (!workers[sid]) {
        console.warn(green, `$np ${process.pid} ${sid}: no running worker found for adding error buffer`);

        return;
    }

    // errors will be buffered and posted once the exit signal is received
    const data: string = buffer.toString();

    if (data.endsWith('\n')) {
        if (workers[sid]?.errbuffer) {
            workers[sid].errbuffer = workers[sid].errbuffer += data;
        } else {
            workers[sid].errbuffer = data;
        }

        console.info(red, `$np ${process.pid} ${sid}: returning error`);
    } else {
        console.info(blue, `$np ${process.pid} ${sid}: buffering incoming error stream`);
        workers[sid].errbuffer = workers[sid]?.errbuffer ? (workers[sid].errbuffer += data) : data;
    }
};
