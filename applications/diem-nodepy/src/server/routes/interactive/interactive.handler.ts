import { promises as fs } from 'fs';
import path from 'path';
import { utils } from '@common/utils';
import { nodepy } from '../interactive/nodepy';
import { IntStmt } from '../../config/interfaces';

interface IHandler {
    ok: true;
    id: string;
    message?: string;
    error?: Error;
}

const base64decode: (file: string) => string = (file: string) => {
    const buff: Buffer = Buffer.from(file, 'base64');

    return buff.toString('utf8');
};

export const interactiveHandler: (req: any, res: any) => any = async (req: any, res: any) => {
    if (req.method === 'GET') {
        return res.status(200).json({
            message: 'Only Post is allowed',
        });
    }

    const stmt: IntStmt = { ...req.body };

    try {
        return res.status(200).json(await handler(stmt));
    } catch (err) {
        return res.status(200).json(err);
    }
};

export const handler: (stmt: IntStmt) => any = async (stmt: IntStmt): Promise<IHandler> => {
    if (!stmt.id) {
        return Promise.reject({
            ok: false,
            message: 'The is no ID in this stmt',
        });
    }

    const id: string = stmt.id;

    utils.logInfo(`$start.handler (handler): new request - stmt: ${id}`, stmt.transid);

    // clean up the file and fill in the missing data
    const py: string = base64decode(stmt.py);

    await fs.writeFile(`${path.resolve()}/pyfiles/${id}.py`, py);

    // just start it , no need to await here
    nodepy(stmt);

    return Promise.resolve({ ok: true, id });

    // execute the file
};
