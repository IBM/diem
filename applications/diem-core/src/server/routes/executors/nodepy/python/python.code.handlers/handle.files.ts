export const handleFiles: (code: string, files: { name: string; value: string }[], type?: string) => Promise<string> =
    async (code: string, files: { name: string; value: string }[], type: string = 'pandas'): Promise<string> => {
        let insert: string = '';

        for await (const [key, value] of Object.entries(files)) {
            if (type === 'string') {
                insert += `__${[key]}= cos.readString('${value}')\nmq({"out": f"File ${[value]} loaded"})`;
            } else {
                insert += `__${[key]}= cos.getFile('${value}')\nmq({"out": f"File ${[value]} loaded"})`;
            }
        }

        const file_part: string = String.raw`### handle.files (handleFiles) ###
${insert}
###__CODE__###`;

        return Promise.resolve(`${code.replace('###__CODE__###', file_part)}`);
    };

export const handleFilesParams: (code: string, files: { name: string; value: string }[]) => Promise<string> = async (
    code: string,
    files: { name: string; value: string }[]
): Promise<string> => {
    for await (const [key] of Object.entries(files)) {
        code = code.replace(`:${[key]}`, `{__${[key]}}`);
    }

    return Promise.resolve(code);
};
