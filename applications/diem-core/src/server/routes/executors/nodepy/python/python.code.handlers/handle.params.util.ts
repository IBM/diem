const handtleType: (value: string | string[] | number | [number] | boolean | any) => string = (
    value: string | string[] | number | [number] | boolean | any
): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (value instanceof Array) {
        const s: string = value.join(',');

        return String.raw`[${s}]`;
    }

    return value;
};

export const regEx: (code: string, key: string, value: string | string[]) => string = (
    code: string,
    key: string,
    value: string | string[]
): string => {
    const regExp: string | RegExp = new RegExp(`:${key}`, 'ig');

    return code.replace(regExp, handtleType(value));
};

export const json: (obj: any) => string = (obj: any) => JSON.stringify(obj, undefined, 2);
