const parseDotNotation: any = (str: string, val: any, obj: any) => {
    let currentObj: any = obj;
    const keys = str.split('__');
    let i: number;
    const l: any = Math.max(1, keys.length - 1);
    let key: string;

    for (i = 0; i < l; ++i) {
        key = keys[i];
        currentObj[key] = currentObj[key] || {};
        currentObj = currentObj[key];
    }

    currentObj[keys[i]] = val;
    delete obj[str];
};

const expand: any = (obj: any) => {
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            parseDotNotation(key, obj[key], obj);
        }
    }

    return obj;
};
/**
 *
 *
 * @returns {*}
 */
const Dot2Json: any = (): any => {
    const env: any = {};
    for (const key in process.env) {
        if (key.includes('__') && !key.includes('npm_')) {
            if (key.toUpperCase() === key) {
                env[key.toLowerCase()] = process.env[key];
            } else {
                env[key] = process.env[key];
            }
        }
    }

    return expand(env);
};

export const Credentials: any = (service: string): any => {
    const gr = '\x1b[36m%s\x1b[0m';
    console.info(gr, `$cfenv (Credentials): Requesting environment Credentials for ${service} - pid: ${process.pid}`);

    const config: any = Dot2Json();

    if (config[service]) {
        return config[service];
    }

    if (process.env[service]) {
        return process.env[service];
    }

    if (process.env[service.toUpperCase()]) {
        return process.env[service.toUpperCase()];
    }
};
