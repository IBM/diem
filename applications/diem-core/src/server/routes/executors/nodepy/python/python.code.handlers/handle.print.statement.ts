export const handlePrintStatement: (code: string) => string = (code: string): string => {
    let regExp: string | RegExp = new RegExp('print', 'ig');
    // code = code.replace(regExp, 'printl');

    // here we replace the temporary p_rint that would otherwise be overwritten by the previous code
    regExp = new RegExp('p_rint', 'ig');
    code = code.replace(regExp, 'print');

    return code;
};
