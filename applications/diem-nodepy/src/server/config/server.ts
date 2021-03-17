/* eslint-disable @typescript-eslint/no-unused-vars */
import * as http from 'http';
import express from 'express';
import { slackMsg } from '@common/slack/slack';
import { slackMsgInt } from '@common/slack/error-int';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { IntInternal, IntEnv, IResponse } from '@interfaces';
import { utils } from '@common/utils';
import { etlHandler } from '../routes/etl/etl.handler';
import { servicesHandler } from '../routes/services/services.handler';
import { interactiveHandler } from '../routes/interactive/interactive.handler';

export class Server {
    public pack: IntEnv;

    private fatal: boolean = false;

    public constructor() {
        this.pack = utils.Env;

        process
            .on('uncaughtException', (err: any) => {
                err.name = 'uncaught excemption';
                err.trace = err.stack;
                void utils.logError('$server.ts (uncaught): uncaughtException', err);
            })
            .on('unhandledRejection', (reason: any, p: any) => {
                const msg: any = {
                    location: 'server',
                    message: p,
                    name: 'unhandledrejection',
                    reason,
                };
                void utils.logError('$server.ts (unhandledRejection):', msg);
            })
            .on('exit', (code: any) => {
                utils.logInfo(`$server.ts (exit): fatal error, system shutting down : ${code}`);
                void slackMsgInt(code);
                setTimeout(() => {
                    process.exit(1);
                }, 1000);
            });

        utils.ev.on('internal', (internal: IntInternal) => {
            if (internal.err) {
                this.fatal = internal.fatal;

                const err: any = {
                    application: utils.Env.app,
                    error: JSON.stringify(internal.err, undefined, 2),
                    message: internal.message,
                    fatal: this.fatal,
                    name: '$server (internal)',
                    source: internal.source,
                    pid: internal.pid || process.pid,
                    trace: internal.trace,
                };

                void utils.logError('$server.ts (internal): Notification of Error', err);
            } else if (this.fatal) {
                this.fatal = internal.fatal;
                utils.logInfo(`$server.ts (internal): fatal removed by ${internal.source}`);
            }
        });
    }

    public start = (): void => {
        const app: any = express()
            .set('port', process.env.PORT || 8192)
            .set('trust proxy', 1)
            .use(helmet())
            .use(
                bodyParser.urlencoded({
                    limit: '15mb',
                    extended: false,
                })
            )
            .use(
                bodyParser.json({
                    limit: '15mb',
                })
            )
            .all('/api/', etlHandler)
            .all('/services/', servicesHandler)
            .all('/interactive', interactiveHandler)
            .all('/nodepy/interactive', interactiveHandler)
            .all('*', (_req: any, res: IResponse) => res.status(400).json({ message: 'Not allowed' }));

        const httpServer: http.Server = http.createServer(app);

        httpServer.listen(app.get('port'), () => {
            const msg: string =
                `👽 $server (start): ${this.pack.packname}@${this.pack.version}` +
                ` started up on ${this.pack.K8_SYSTEM_NAME} - port:${app.get('port')} - pid: ${process.pid} (node ${
                    process.version
                })`;
            utils.logInfo(msg);
            void slackMsg(msg);
        });
    };

    // private ensureAuthenticated = (_req: IRequest, _res: IResponse, next: () => any): any => next();
}

const server: Server = new Server();
server.start();
