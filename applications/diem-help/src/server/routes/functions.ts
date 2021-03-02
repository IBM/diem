export const base64decode: (file: string) => string = (file: string) => {
    const buff: Buffer = Buffer.from(file, 'base64');

    return buff.toString('utf8');
};

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

export const base64encode: (file: string) => string = (file: string) => Buffer.from(file, 'utf8').toString('base64');
