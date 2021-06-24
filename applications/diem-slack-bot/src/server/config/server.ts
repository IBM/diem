/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import path from 'path';
import * as http from 'http';
import { Express, limiter } from '@common/express.lite';
import { IntInternal, IntEnv, IError, IRequest, IResponse } from '@interfaces';
import { utils } from '@common/utils';
import { slackMsg } from '@common/slack/slack';
import { slackMsgInt } from '@common/slack/error-int';
import { eventHandler, interactionsHander, api } from '../routes/routes';
import { addTrace } from '../routes/functions';
import { loadServiceDoc } from '../routes/service.doc';

export class Server {
    public pack: IntEnv;

    private fatal: boolean = false;

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

        const app: any = new Express().app;

        /*** here we start actually handling the requests */

        app.use(this.logErrors)
            .get(`${this.pack.apppath}`, limiter, (req: IRequest, res: IResponse) => {
                utils.logInfo(`$server.ts (start): homepage request ${req.url}`);

                return res.sendFile('/public/index.html', { root: path.resolve() });
            })
            .post(`${this.pack.apppath}`, limiter, (req: IRequest, res: IResponse) => {
                if (req.body.type) {
                    return eventHandler(req, res);
                }

                utils.logInfo('$server.ts (start): unknown event');

                return res.status(400).send();
            })
            .post(`${this.pack.apppath}/interactions`, limiter, (req: IRequest, res: IResponse) => {
                if (req.body.payload) {
                    return interactionsHander(req, res);
                }

                utils.logInfo('$server.ts (start): unknown interaction');

                return res.status(400).send();
            })
            .all('*', limiter, (req: IRequest, res: IResponse) => {
                utils.logInfo(`@server.ts (*) - other request - url - ${req.url} - method: ${req.method}`);
                res.status(404).json({ message: 'This page cannot be found' });
            });

        const httpServer: http.Server = http.createServer(app);

        httpServer.listen(app.get('port'), async () => {
            const msg: string =
                `👽 $server (start): ${this.pack.packname}@${this.pack.version}` +
                ` started up on ${this.pack.K8_SYSTEM_NAME} - port:${app.get('port')} - pid: ${process.pid} (node ${
                    process.version
                })`;
            utils.logInfo(msg);
            await slackMsg(msg);
            void api.whoAmI();
        });

        void loadServiceDoc();
    };

    private logErrors = async (
        err: IError,
        req: IRequest,
        res: IResponse,
        next: (err: IError) => any
    ): Promise<void> => {
        err.trace = addTrace(err.trace, '@at $server (logErrors)');
        err.email = 'anonymous';
        err.endpoint = req.params ? req.params.function : 'n/a';
        err.time = utils.time();
        err.transid = req.transid;
        err.url = req.originalUrl;

        if (res.headersSent) {
            return next(err);
        }

        const errMsg: string = '$server (logErrors)';

        await slackMsgInt(err);
        await utils.logMQError(errMsg, req, err);

        res.status(500).end(`An internal error happened. It has been logged - transid: ${req.transid || 'none'}`);
    };
}

const server: Server = new Server();
void server.start();
