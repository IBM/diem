import { randomInt } from 'crypto';
export const addTrace: (trace: string | string[], msg: string) => string[] = (
    trace: string | string[],
    msg: string
): string[] => {
    if (trace && Array.isArray(trace)) {
        trace.unshift(msg);

        return trace;
    }

    return [msg];
};

const random = () => {
    const i = 10000000000;

    return randomInt(0, i) / i;
};

export const randstring = () => {
    const str = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    return Array(Number(8))
        .fill(str)
        .map((x) => x[Math.floor(random() * x.length)])
        .join('')
        .split('')
        .sort(() => 0.5 - random())
        .join('')
        .toLowerCase();
};

export const base64decode: (file: string) => string = (file: string) => {
    const buff: Buffer = Buffer.from(file, 'base64');

    return buff.toString('utf8');
};
