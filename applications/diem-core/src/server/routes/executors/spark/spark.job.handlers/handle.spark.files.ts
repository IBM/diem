export const handleSparkFiles: (code: string, files: string[]) => Promise<string> = async (
    code: string,
    files: string[]
): Promise<string> => {
    let insert = '';

    files.forEach((file: string) => {
        insert += `cos.download('${file}','/opt/spark/jars/${file}')\nmq({"out": f"File ${[file]} loaded"})`;
    });

    const file_part: string = String.raw`### handle.files (handleFiles) ###
${insert}
###__CODE__###`;

    return Promise.resolve(`${code.replace('###__CODE__###', file_part)}`);
};
