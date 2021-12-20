/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import fs from 'fs';
import path from 'path';
import * as http from 'http';
import pug from 'pug';
import { Express, limiter } from '@common/express.lite';
import { IntInternal, IntEnv, IError, IRequest, IResponse } from '@interfaces';
import { utils } from '@common/utils';
import { slackMsg } from '@common/slack/slack';
import { slackMsgInt } from '@common/slack/error-int';
import * as routes from '../routes/routes';
import { addTrace } from '../routes/functions';
import assets from './assets.json';

const api = async (req: IRequest, res: IResponse): Promise<any> => {
    if (!req.headers['content-type'] && req.method !== 'GET') {
        return res.status(404).send('Incorrect Content-Type');
    }

    const t: { [index: string]: any } = routes;

    if (t[req.params.function] !== undefined) {
        const f: any = t[req.params.function];

        try {
            const data: any = await f(req, res);

            if (!data) {
                res.status(400).send({});
            } else if (data && data.binary) {
                res.setHeader('Access-Control-Expose-Headers', 'Content-disposition');
                res.setHeader('Content-Type', data.binary);
                if (data.filename) {
                    res.setHeader('Content-disposition', `attachment;filename=${data.filename}`);
                }
                res.end(data.data, 'binary');
            } else {
                res.status(200).send(data);
            }
        } catch (err) {
            if (err && err.return) {
                res.status(200).send(err.return);
            } else if (err && err.displayerr) {
                res.status(err.status || 401).send({ displayerr: err.displayerr });
            } else {
                /**
                 * we will only slack the error here as the 2 above are errors custom
                 * returned to the user so not real functional errors
                 */

                const msg: IError = {
                    ...err,
                    email: 'anonymous',
                    endpoint: req.params ? req.params.function : 'n/a',
                    name: err.name || '$server (api) function error',
                    time: utils.time(),
                    transid: req.transid || 'n/a',
                    url: req.originalUrl,
                    message: err.message,
                    stack: err.stack,
                };

                err.trace = addTrace(err.trace, '@at $server (api)');

                await slackMsgInt(msg);
                res.status(err && err.status ? err.status : 500).json({
                    message: `An internal error happened. It has been logged with reference: ${req.transid}`,
                });
            }
        }
    } else {
        return res.status(404).send({ message: 'resouce cannot be found' });
    }
};

const logErrors = async (err: IError, req: IRequest, res: IResponse, next: (err: IError) => any): Promise<void> => {
    err.trace = addTrace(err.trace, '@at $server (logErrors)');
    err.email = 'anonymous';
    err.endpoint = req.params ? req.params.function : 'n/a';
    err.time = utils.time();
    err.transid = req.transid;
    err.url = req.originalUrl;

    if (res.headersSent) {
        return next(err);
    }

    const errMsg = '$server (logErrors)';

    await slackMsgInt(err);
    await utils.logMQError(errMsg, req, err);

    res.status(500).end(`An internal error happened. It has been logged - transid: ${req.transid || 'none'}`);
};

export class Server {
    public pack: IntEnv;

    private fatal = false;

    public constructor() {
        this.pack = utils.Env;

        process
            .on('uncaughtException', async (err: IError) => {
                await utils.logError('$server.ts (uncaught): uncaughtException', {
                    message: err.message,
                    name: 'uncaught excemption',
                    stack: err.stack,
                    trace: addTrace(err.trace, '@at $server (uncaughtException)'),
                    caller: '$server',
                });
            })
            .on('unhandledRejection', async (reason: any, p: any) => {
                await utils.logError('$server.ts (unhandledRejection):', {
                    location: 'server',
                    message: p,
                    name: 'unhandledrejection',
                    reason,
                    trace: ['@at $server (unhandledRejection)'],
                    caller: '$server',
                });
            })
            .on('exit', async (code: any) => {
                utils.logInfo(`$server.ts (exit): fatal error, system shutting down : ${code}`);
                await slackMsgInt(code);
                setTimeout(() => {
                    process.exit(1);
                }, 1000);
            })
            .on('message', (msg: any) => {
                if (!msg.workernumber || msg.workernumber === 0) {
                    utils.logInfo(`$server.ts (message): worker message - ${msg.workernumber || 'local'}`);
                }
            });

        utils.ev.on('internal', async (internal: IntInternal) => {
            if (internal.err) {
                this.fatal = internal.fatal;
                await utils.logError('$server.ts (internal): Notification of Error', {
                    application: utils.Env.app,
                    error: JSON.stringify(internal.err, undefined, 2),
                    message: internal.message,
                    fatal: this.fatal,
                    name: '$server (internal)',
                    source: internal.source,
                    pid: internal.pid || process.pid,
                    trace: internal.trace,
                    caller: '$server',
                });
            } else if (this.fatal) {
                this.fatal = internal.fatal;
                utils.logInfo(`$server.ts (internal): fatal removed by ${internal.source}`);
            }
        });
    }

    public start = async (): Promise<void> => {
        /*** The require packages */

        const app: any = new Express(assets).app;

        /*** variables that are moved to the index.html */
        const env: { path: string; css: any; description: string; script: any[] } = {
            path: this.pack.apppath,
            css: [],
            description: this.pack.description,
            script: [],
        };

        const ass: { [index: string]: any } = assets;

        if (ass['app.css']) {
            env.css.push(`${env.path}/${ass['app.css'].src}`);
        }

        env.script = [];

        if (ass['app.js']) {
            env.script.push({
                name: `${env.path}/${ass['app.js'].src}`,
                sri: ass['app.js'].integrity,
            });
        }

        if (ass['styles.js']) {
            env.script.push({
                name: `${env.path}/${ass['styles.js'].src}`,
                sri: ass['styles.js'].integrity,
            });
        }

        const va = 'vendors-app.js';

        if (ass[va]) {
            env.script.push({
                name: `${env.path}/${ass[va].src}`,
                sri: ass[va].integrity,
            });
        }

        fs.writeFile('public/index.html', pug.renderFile(`${path.resolve()}/server/index.pug`, env), (err) => {
            if (err) {
                return utils.logInfo('$server (writeFile): ', err.toString());
            }
        });

        /*** here we start actually handling the requests */

        app.use(logErrors)
            .all(`${this.pack.apppath}/user/:function/*`, api)
            .all(`${this.pack.apppath}/user/:function`, api)
            .all('/internal/:function', api)
            .get('*', limiter, (_req: IRequest, res: IResponse) => {
                res.sendFile('/public/index.html', { root: path.resolve() });
            })
            .all('*', limiter, (_req: IRequest, res: IResponse) =>
                res.status(400).json({ message: 'Not allowed Path' })
            );

        const httpServer: http.Server = http.createServer(app);

        httpServer.listen(app.get('port'), async () => {
            const msg: string =
                `👽 $server (start): ${this.pack.packname}@${this.pack.version}` +
                ` started up on ${this.pack.K8_SYSTEM_NAME} - port:${app.get('port')} - pid: ${process.pid} (node ${
                    process.version
                })`;
            utils.logInfo(msg);
            await slackMsg(msg);
        });
    };
}

const server: Server = new Server();
void server.start();
