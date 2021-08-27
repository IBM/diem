import { regEx } from './handle.params.util';

export const handleValues: (code: string, values: { [index: string]: string }) => Promise<string> = async (
    code: string,
    values: { [index: string]: string }
): Promise<string> => {
    for (const [key, value] of Object.entries(values)) {
        code = regEx(code, key, value);
    }

    return Promise.resolve(code);
};

export const setValues: (code: string, values: { [index: string]: string }) => Promise<string> = async (
    code: string,
    values: { [index: string]: string }
): Promise<string> => {
    const values_part: string = String.raw`
### handle.values (setValues) ###
values = ${JSON.stringify(values)}
###__CODE__###
     `;

    return Promise.resolve(`${code.replace('###__CODE__###', values_part)}`);
};
