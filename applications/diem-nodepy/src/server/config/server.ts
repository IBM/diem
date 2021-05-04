/* eslint-disable @typescript-eslint/no-unused-vars */
import { setTimeout } from 'timers/promises';
import { IntInternal, IntEnv } from '@interfaces';
import { utils } from '@config/utils';
import { publisher } from './nats_publisher';
import { NC } from './nats_connect';
import { stats } from './stats';

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
            .on('exit', async (code: any) => {
                utils.logInfo(`$server.ts (exit): fatal error, system shutting down : ${code}`);
                await setTimeout(1000);
                process.exit(1);
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

    public start = async (): Promise<void> => {
        try {
            await NC.connect();
        } catch (err) {
            return console.error(err);
        }

        const msg: string =
            `👽 $server (start): ${this.pack.packname}@${this.pack.version}` +
            ` started up on ${this.pack.K8_SYSTEM_NAME} - pid: ${process.pid} (node ${process.version})`;
        utils.logInfo(msg);

        void publisher.publish_global(
            'info',
            `${this.pack.packname}@${this.pack.version} connected - env: ${this.pack.K8_SYSTEM_NAME} - pid: ${process.pid}`
        );

        void stats();
    };

    // private ensureAuthenticated = (_req: IRequest, _res: IResponse, next: () => any): any => next();
}

const server: Server = new Server();

void server.start();
