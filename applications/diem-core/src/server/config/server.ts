/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import fs from 'fs';
import path from 'path';
import * as http from 'http';
import jwt from 'jsonwebtoken';
import pug from 'pug';
import { Express, limiter } from '@common/express';
import { IntInternal, IntEnv, IError, IProfile, IRequest, IResponse } from '@interfaces';
import { utils } from '@common/utils';
import { slackMsg } from '@common/slack/slack';
import { slackMsgInt } from '@common/slack/error-int';
import { multipart } from '@common/busboy';
import { getOrg, getRole, getRoleNbr, addTrace } from '@functions';
import { jwtCheck } from '../routes/webapikeys/webapikeys.jwtcheck';
import * as routes from '../routes/routes';
import { toMQ } from '../routes/logger/logger';
import { publisher } from './nats_publisher';
import { NC } from './nats_connect';
import { css, expressConfig } from './config';
import { login } from './authorization';
import assets from './assets.json';
import { WSS } from './socket';
import { subscriber } from './nats_subscriber';

export class Server {
    public pack: IntEnv;

    private fatal: boolean = false;

    public constructor() {
        this.pack = utils.Env;

        process
            .on('uncaughtException', async (err: IError) => {
                await utils.logError('$server.ts (uncaught): uncaughtException', {
                    message: err.message,
                    name: 'uncaught exception',
                    stack: err.stack,
                    code: err.code || 'n/a',
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

        utils.ev.on('error', async (err: IError) => {
            void utils.logError('$server.ts (error)', err);
        });
    }

    public start = async (): Promise<void> => {
        // we suppress console error
        // eslint-disable-next-line no-console
        // console.error = () => {
        // no console.log
        // };

        /*** The require packages */

        const app: any = new Express(assets, expressConfig).app;

        /*** variables that are moved to the index.html */
        const env: { path: string; css: any; description: string; script: any[] } = {
            path: this.pack.apppath,
            css,
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

        const va: string = 'vendors-app.js';

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

        app.use(this.logErrors)
            .all(`${this.pack.apppath}/api/:function`, jwtCheck, this.api)
            .all(`${this.pack.apppath}/user/:function/:pyfile`, this.secAuth, this.api)
            .all(`${this.pack.apppath}/user/:function`, this.secAuth, this.api)
            .all('/internal/:function', this.api)
            .all('/internal/:function/:pyfile', this.api)
            .get('*', this.secAuth, limiter, (req: IRequest, res: IResponse) => {
                const hrstart: [number, number] = process.hrtime();
                res.setHeader('Last-Modified', new Date().toUTCString());
                req.headers['if-none-match'] = 'no-match-for-this';
                if (req.session) {
                    req.session.redirectUrl = '/';
                }

                res.sendFile('/public/index.html', { root: path.resolve() });
                void toMQ(
                    req,
                    201,
                    `$server (*) : authenticated request from ${req.user?.email}`,
                    undefined,
                    hrstart,
                    this.pack
                );
            })
            .all('*', this.secAuth, (req: IRequest, res: IResponse) => {
                const hrstart: [number, number] = process.hrtime();
                void toMQ(
                    req,
                    400,
                    `$server (*) : authenticated but invalid request from ${req.user?.email}`,
                    undefined,
                    hrstart,
                    this.pack
                );

                return res.status(400).json({ message: 'Not allowed Path' });
            });

        const httpServer: http.Server = http.createServer(app);

        httpServer.listen(app.get('port'), async () => {
            const msg: string =
                `👽 $server (start): ${this.pack.packname}@${this.pack.version}` +
                ` started up on ${this.pack.K8_SYSTEM_NAME} - port:${app.get('port')} - pid: ${process.pid} (node ${
                    process.version
                })`;
            utils.logInfo(msg);
            void slackMsg(msg);
        });

        await WSS.start(httpServer);

        try {
            await NC.connect();
        } catch (err) {
            return console.error(err);
        }
        await subscriber.connect();
        await publisher.connect();
        // spark.startWatcher().catch((err: Error) => console.error(err));
    };

    private api = async (req: IRequest, res: IResponse): Promise<any> => {
        const hrstart: [number, number] = process.hrtime();

        // if there's no req user then it's an internal call, otherwise there's always a req user

        if (req.user && !req.user.org) {
            utils.logInfo(`$server (sapi): unauthorized user - email: ${req.user.email} - ti: ${req.transid}`);

            return res.redirect('/');
        }

        if (!req.headers['content-type'] && req.method !== 'GET') {
            return res.status(404).send('Incorrect Content-Type');
        }

        if (
            /** if body */
            req.method !== 'GET' &&
            /** body has data */
            Object.keys(req.body).length === 0 &&
            /** body is NOT json */
            !req.is('*/json')
        ) {
            // and is NOT json
            try {
                await multipart.parseMulti(req);
            } catch (err) {
                err.transid = req.transid;
                err.pid = process.pid;
                await toMQ(req, 401, '$server (api error)', err, hrstart, this.pack);

                return res.status(404).send('Your request could not be completed, incorrect parsing');
            }
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
                void toMQ(
                    req,
                    200,
                    `$server : api request from ${req.user ? req.user.email : 'anonymous'}`,
                    undefined,
                    hrstart,
                    this.pack
                );
            } catch (err) {
                const msg: IError = {
                    ...err,
                    email: req.token ? req.token.email : '',
                    endpoint: req.params ? req.params.function : 'n/a',
                    name: err.name || '$server (api) function error',
                    time: utils.time(),
                    transid: req.transid || 'n/a',
                    url: req.originalUrl,
                    message: err.message,
                    stack: err.stack,
                };

                if (err && err.return) {
                    res.status(err.status || 200).send(err.return);
                } else if (err && err.displayerr) {
                    res.status(err.status || 401).send({ displayerr: err.displayerr });
                } else {
                    /**
                     * we will only slack the error here as the 2 above are errors custom
                     * returned to the user so not real functional errors
                     */

                    err.trace = addTrace(err.trace, '@at $server (api)');

                    await slackMsgInt(msg);
                    void toMQ(
                        req,
                        500,
                        `$server : api request error from ${req.user ? req.user.email : 'internal'}`,
                        msg,
                        hrstart,
                        this.pack
                    );

                    res.status(err && err.status && typeof err.status === 'number' ? err.status : 500).json({
                        message: `An internal error happened. It has been logged with reference: ${req.transid}`,
                    });
                }
            }
        } else {
            void toMQ(req, 404, `$server (api): not found - ${req.params.function}`, undefined, hrstart, this.pack);

            return res.status(404).send({ message: 'resouce cannot be found' });
        }
    };

    private removeToken = (req: IRequest): void => {
        if (req.session && req.session.applications && req.session.applications[utils.Env.app]) {
            delete req.session.applications[utils.Env.app].token;
        }
    };

    private secAuth = async (req: IRequest, res: IResponse, next: () => any): Promise<any> => {
        const hrstart: [number, number] = process.hrtime();
        let token: string | undefined;

        if (!req.isAuthenticated()) {
            req.session.originalUrl = req.originalUrl;

            return res.redirect('/login');
        }

        let method: string = '';

        if (req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
            method = 'JWT';
        } else if (req.cookies && req.cookies[utils.Env.appcookie]) {
            token = req.cookies[utils.Env.appcookie];
            method = 'OIC';
        }

        /* Continue with verification */

        req.user.email = (req.user?._json?.email || req.user.id).toLowerCase();
        req.user.name = req.user.displayName || req.user?._json?.name;

        const email: string = req.user.email;
        const name: string = req.user.name;

        const Login: any = () => {
            login(req, res)
                .then(async () => {
                    utils.logInfo(
                        `$server (secAuth): aquired profile - email: ${email} - name: ${name} - ti: ${req.transid}`
                    );

                    next();
                })
                .catch(async (err: any) => {
                    err.caller = '$server';
                    err.trace = addTrace(err.trace, '@at $server (login)');
                    void utils.logError(
                        `$server (secAuth): requiring profile error - email: ${email} - name: ${name} - ti: ${req.transid}`,
                        err
                    );
                    await toMQ(req, 401, `$server : failed login by ${email}`, err, hrstart, this.pack);

                    return res.sendFile('/public/501.html', { root: path.resolve() });
                });
        };

        if (!token) {
            utils.logInfo(
                `$server (secAuth): no token - logging in - email: ${email} - name: ${name} - ti: ${req.transid}`
            );

            return Login();
        }

        try {
            const z: any = jwt.verify(token, utils.jwtTokenKey);

            if (!z || typeof z === 'string') {
                return res.status(403).json({ error: `Forbidden, no id on this token - email: ${email}` });
            }

            const profile: IProfile = z;

            /*  Here we add the additional details of the token to the user profile */
            req.user = { ...req.user, ...profile };

            const org: string | undefined = getOrg(req);

            if (!org) {
                // return res.status(403).json({ error: 'Forbidden, no org has been identified' });
                utils.logInfo(`$server (secAuth): rederecting user without org - email: ${email} - ti: ${req.transid}`);

                return next();
            }

            // ! important setting, this value will be used to ensure the user is allowed
            req.user.org = org;

            const role: string | undefined = getRole(req);

            if (!role) {
                // return res.status(403).json({ error: 'Forbidden, no role has been identified' });
                utils.logInfo(
                    `$server (secAuth): rederecting user without role - email: ${email} - ti: ${req.transid}`
                );

                return next();
            }

            req.user.role = role;
            req.user.rolenbr = getRoleNbr(req);

            req.token = profile; /** For easy access */

            utils.logCyan(
                // eslint-disable-next-line max-len
                `$server (secAuth): ok - email: ${email} (${name}) - org: ${req.user.org} - role: ${req.user.role} (${req.user.rolenbr}) - method: ${method} - ti: ${req.transid}`
            );

            return next();
        } catch (err) {
            utils.logInfo(
                `$server (secAuth): verification error - email: ${email} - name: ${name} - method: ${method} - ti: ${req.transid}`
            );

            this.removeToken(req);

            return Login();
        }
    };

    private logErrors = async (
        err: IError,
        req: IRequest,
        res: IResponse,
        next: (err: IError) => any
    ): Promise<void> => {
        err.trace = addTrace(err.trace, '@at $server (logErrors)');
        err.email = req.token ? req.token.email : '';
        err.endpoint = req.params ? req.params.function : 'n/a';
        err.time = utils.time();
        err.transid = req.transid;
        err.url = req.originalUrl;

        if (res.headersSent) {
            return next(err);
        }

        const errMsg: string = '$server (logErrors)';

        void utils.logError(errMsg, err);
        void toMQ(req, 401, errMsg, err, undefined, this.pack);

        res.status(500).end(`An internal error happened. It has been logged - transid: ${req.transid || 'none'}`);
    };
}

const server: Server = new Server();
void server.start();
