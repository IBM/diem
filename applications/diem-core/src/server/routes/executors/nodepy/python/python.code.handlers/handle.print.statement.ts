export const handlePrintStatement: (code: string) => string = (code: string): string => {
    // here we replace the temporary p_rint that would otherwise be overwritten by the previous code
    const regExp = new RegExp('p_rint', 'ig');
    code = code.replace(regExp, 'print');

    return code;
};
