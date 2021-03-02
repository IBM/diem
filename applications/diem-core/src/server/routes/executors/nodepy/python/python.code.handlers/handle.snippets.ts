import { ISnippetsModel, SnippetsModel } from '../../../../models/models';

export const lookupSnippet: (id: string, org: string) => Promise<ISnippetsModel | null> = async (
    id: string,
    org: string
): Promise<ISnippetsModel | null> => {
    if (id.includes('sysadmin_')) {
        org = 'sysadmin';
    }

    if (id.includes('sysutil_')) {
        org = 'sysutil';
    }

    return SnippetsModel.findOne({ selector: id, 'project.org': org }).exec();
};

export const handleSnippets: (code: string, org: string) => Promise<string> = async (
    code: string,
    org: string
): Promise<string> => {
    // const snippets: any = code.match(/(\b#INCLUDE__\S+\b)/gi);

    const snippets: string[] | null = code.match(/(\b__INCLUDE__.*\b)/gi);

    if (snippets && snippets.length > 0) {
        // eslint-disable-next-line guard-for-in
        for (const snippetFound of snippets) {
            const snippetKeyword: string = snippetFound.replace('__INCLUDE__', '');

            const snippetCode = await lookupSnippet(snippetKeyword, org);

            if (snippetCode && snippetCode.snippet) {
                code = code.replace(snippetFound, snippetCode.snippet);
            } else {
                /** @info Generate and error */
                code = code.replace(snippetFound, `invalid syntax ${snippetFound}`);
            }
        }

        return Promise.resolve(code);
    } else {
        return Promise.resolve(code);
    }
};
