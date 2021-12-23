import { utils } from '@common/utils';
import { IRequest } from '@interfaces';
import { EIdType } from '@models';

interface IMakeUrl {
    url: string;
    text: string;
}

export const noOrgMsg = 'Sorry, we could not determine any org';

export const getOrg: (req: IRequest) => string | undefined = (req: IRequest): string | undefined =>
    req.user && req.user.xorg && req.user.xorg.current && req.user.xorg.current.org
        ? req.user.xorg.current.org.toLowerCase().trim()
        : undefined;

export const getRole: (req: IRequest) => string | undefined = (req: IRequest): string | undefined =>
    req.user && req.user.xorg && req.user.xorg.current && req.user.xorg.current.role
        ? req.user.xorg.current.role
        : undefined;

export const getRoleNbr: (role: IRequest) => number = (req: IRequest): number =>
    req.user && req.user.xorg && req.user.xorg.current && req.user.xorg.current.rolenbr
        ? req.user.xorg.current.rolenbr
        : 0;

export const fmtTime: (seconds: number) => string = (seconds: number) => {
    const date: Date = new Date(0);
    date.setSeconds(seconds || 0); // specify value for SECONDS here

    return date.toISOString().substr(11, 8);
};

export const makeUrl: (params: IMakeUrl) => string = (params: IMakeUrl) => {
    const href = `${utils.Env.K8_APPURL}${utils.Env.apppath}/${params.url}`;

    return `<${href}|${params.text}>`;
};

const parseDotNotation: any = (str: string, val: any, obj: any, sep = '__') => {
    let currentObj: any = obj;
    const keys: any = str.split(sep);
    let i: any;
    const l: any = Math.max(1, keys.length - 1);
    let key: any;

    for (i = 0; i < l; ++i) {
        key = keys[i];
        currentObj[key] = currentObj[key] || {};
        currentObj = currentObj[key];
    }

    currentObj[keys[i]] = val;
    delete obj[str];
};

export const extract__: any = (obj: any, sep = '__') => {
    const env: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && key.toString().includes(sep)) {
            // time any string to avoid leading and closing
            if (typeof obj[key] === 'string') {
                obj[key] = obj[key].trim();
            }
            env[key] = obj[key];
        }
    }

    return env;
};

export const expand: any = (obj: any, sep = '__') => {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && key.toString().includes(sep)) {
            parseDotNotation(key, obj[key], obj, sep);
        }
    }

    return obj;
};

export const flatten__: any = (object: any, separator = '__') => {
    const isValidObject: any = (value: any) => {
        if (!value) {
            return false;
        }

        const isArray: any = Array.isArray(value);
        const isObject: any = Object.prototype.toString.call(value) === '[object Object]';
        const hasKeys: any = !!Object.keys(value).length;

        return !isArray && isObject && hasKeys;
    };

    const walker: any = (child: any, path: any[] = []) =>
        Object.assign(
            {},
            ...Object.keys(child).map((key) =>
                isValidObject(child[key])
                    ? walker(child[key], path.concat([key]))
                    : { [path.concat([key]).join(separator)]: child[key] }
            )
        );

    return { ...walker(object) };
};

export const prePend: (object: any, separator: any) => any = (object: any, separator: any) => {
    try {
        const nobj: any = {};

        Object.keys(object).forEach((k: any) => {
            nobj[`${separator}${k}`] = object[k];
        });

        return nobj;
    } catch (err) {
        return {};
    }
};

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

export const getLock = (body: { [index: string]: any }, row: { [index: string]: any }): string | null => {
    if (!row.idtype || (row.idtype && row.idtype !== EIdType.personal)) {
        return null;
    }

    if (body.email && body.email === row.owner) {
        return 'fas fa-lock-open';
    }

    return 'fas fa-lock';
};
