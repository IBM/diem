/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-extraneous-dependencies */
import path from 'path';
import { promises as fs } from 'fs';
import { IRequest } from '@interfaces';
import hljs from 'highlight.js';
import MarkdownIt from 'markdown-it';
import index from '../../../docs/index.json';

const markdownItAttrs = require('markdown-it-attrs');

interface Iitem {
    location?: string;
    name?: string;
    title?: string;
    section?: { title: string; items: Iitem[] };
}

const config: any = index;

const items: Iitem[] = config.items;

class MarkDown {
    public md: any;

    public constructor() {
        this.md = new MarkdownIt({
            html: true,
            highlight: (str: string, lang: string) => {
                if (lang && lang === 'mermaid') {
                    try {
                        return `<pre class="mermaid"><code>${this.md.utils.escapeHtml(str)}</code></pre>`;
                        // eslint-disable-next-line no-empty
                    } catch (__) {}
                } else if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(lang, str).value;
                        // eslint-disable-next-line no-empty
                    } catch (__) {}
                }

                return ''; // use external default escaping
            },
        });

        this.md.use(markdownItAttrs, {
            // optional, these are default options
            leftDelimiter: '{',
            rightDelimiter: '}',
            allowedAttributes: [], // empty array = all attributes are allowed
        });

        this.md.use(require('markdown-it-imsize'));
    }

    public findDeep = (obj: Iitem[], name: string): string | undefined => {
        let location;
        for (const key in obj) {
            if (obj[key]) {
                const item: Iitem = obj[key];
                if (item && item.location && item.name === name) {
                    location = item.location;

                    break;
                } else if (item.section) {
                    location = this.findDeep(item.section.items, name);
                    if (location) {
                        break;
                    }

                    //
                }
            }
        }

        return location;
    };
}

const markdown: MarkDown = new MarkDown();

export const convert: (req: IRequest) => Promise<string> = async (req: IRequest): Promise<string> => {
    const item: string = req.params['0'] || '404';

    let itempath: string | undefined = markdown.findDeep(items, item);

    if (!itempath) {
        itempath = '404.md';
    }

    const location: string = `${path.resolve()}/docs/${itempath}`;

    const content_buffer: string | Buffer = await fs.readFile(location).catch(async (err: Error) => {
        console.error('this is and error', err);

        return Promise.resolve(err.message);
    });

    const content: string = content_buffer.toString();

    const ext: string = item.substr(item.lastIndexOf('.') + 1);

    if (ext === 'html') {
        return Promise.resolve(content);
    }

    const rendered: string = markdown.md.render(content);

    return Promise.resolve(rendered);
};
