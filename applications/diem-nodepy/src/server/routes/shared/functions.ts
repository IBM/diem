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

export const randstring = () => {
    const str = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

    return Array(Number(8))
        .fill(str)
        .map((x) => x[Math.floor(Math.random() * x.length)])
        .join('')
        .split('')
        .sort(() => 0.5 - Math.random())
        .join('')
        .toLowerCase();
};

export const base64decode: (file: string) => string = (file: string) => {
    const buff: Buffer = Buffer.from(file, 'base64');

    return buff.toString('utf8');
};
