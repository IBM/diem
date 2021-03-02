/* eslint-disable @typescript-eslint/no-unused-vars */
import { utils } from '@common/utils';
import { IRequest, EStoreActions, IntPayload, IntSharedAction } from '@interfaces';
import axios from 'axios';
import { base64encode, addTrace } from '../shared/functions';

export interface IntInteractivePayload {
    actions?: IntSharedAction[];
    email: string;
    ok?: boolean;
    payload: IntPayload[];
    success?: boolean;
}

interface IBody {
    stmt: any;
}

export const interactive: (req: IRequest) => Promise<any> = async (_req: IRequest) => Promise.resolve({ out: [] });

export const makeInteractivePayload: (body: any) => any = (body: any): IntInteractivePayload => {
    const payload: IntPayload[] = [
        {
            loaded: true,
            store: 'interactive.store' /** not used as forcestore is enabled */,
            type: EStoreActions.ADD_STORE_TABLE_RCD,
            sessionid: body.id,
            values: {
                out: body.data,
            },
            options: { field: 'out' },
        },
    ];

    return {
        email: body.email,
        payload,
    };
};

export const interactiverun: (req: IRequest) => Promise<any> = async (req: IRequest) => {
    const body: IBody = req.body;

    if (!body.stmt) {
        return Promise.resolve({});
    }

    const code: string = base64encode(body.stmt);

    const url: string | undefined = process.env.NODEPY_URL;

    if (!url) {
        return Promise.reject({
            message: 'No NodePy Url',
            trace: addTrace([], '@at $interactive (interactiverun)'),
        });
    }

    try {
        await axios.post(`${url}`, {
            email: req.user.email,
            id: req.sessionid,
            transid: req.transid,
            code,
        });

        const pl: IntInteractivePayload = makeInteractivePayload(body);
        pl.payload[0].values.out = [];
        pl.payload[0].type = EStoreActions.UPD_STORE_FORM_RCD;

        return Promise.resolve(pl);
    } catch (err) {
        if (err.response || err.request) {
            const message: string =
                err.response && err.response.data && err.response.data.message
                    ? err.response.data.message
                    : 'Request made but could not establish connection';
            void utils.logError(`$jobs (jobs): email: ${req.user.email} `, {
                name: '$interactive (interactiverun',
                message,
                caller: '$interactive',
            });
        }

        err.trace = addTrace(err.trace, '@at $interactive (interactiverun)');

        return Promise.reject(err);
    }
};
