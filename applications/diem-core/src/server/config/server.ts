/* eslint-disable complexity */
/* eslint-disable sonarjs/cognitive-complexity */
import fs from 'fs';
import path from 'path';
import * as http from 'http';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import pug from 'pug';
import { Express } from '@common/express';
import { IntInternal, IntEnv, IError, IProfile, IRequest, IResponse } from '@interfaces';
import { utils } from '@common/utils';
import { slackMsg } from '@common/slack/slack';
import { slackMsgInt } from '@common/slack/error-int';
import { multipart } from '@common/busboy';
import express from 'express';
import { jwtCheck } from '../routes/webapikeys/webapikeys.jwtcheck';
import * as routes from '../routes/routes';
import { getOrg, getRole, getRoleNbr, addTrace } from '../routes/shared/functions';
import { toMQ } from '../routes/logger/logger';
import { css, expressConfig } from './config';
import { login } from './authorization';
import assets from './assets.json';
import { WSS } from './socket';
import { cron } from './cron';

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

        const app: any = new Express(passport, assets, expressConfig).app;

        /*** variables that are moved to the index.html */
        const env: any = {
            appurl: this.pack.appurl,
            css,
            description: this.pack.description,
            script: [],
        };

        const ass: { [index: string]: any } = assets;

        if (ass['app.css']) {
            env.css.push(`${env.appurl}/${ass['app.css'].src}`);
        }

        env.script = [];

        if (ass['app.js']) {
            env.script.push({
                name: `${env.appurl}/${ass['app.js'].src}`,
                sri: ass['app.js'].integrity,
            });
        }

        if (ass['styles.js']) {
            env.script.push({
                name: `${env.appurl}/${ass['styles.js'].src}`,
                sri: ass['styles.js'].integrity,
            });
        }

        const va: string = 'vendors-app.js';

        if (ass[va]) {
            env.script.push({
                name: `${env.appurl}/${ass[va].src}`,
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
            .use(`${this.pack.apppath}/ace-builds`, express.static('node_modules/ace-builds'))
            .use(`${this.pack.apppath}/tinymce`, express.static('node_modules/tinymce'))
            .get(`${this.pack.apppath}/service-worker.js`, (_req: IRequest, res: IResponse) => {
                res.sendFile('/public/js/service-worker.js', { root: path.resolve() });
            })
            .get(`${this.pack.apppath}/workbox-*`, (req: IRequest, res: IResponse) => {
                res.sendFile(`/public/js/workbox-${req.params['0']}`, { root: path.resolve() });
            })
            .get(`${this.pack.apppath}/robots.txt`, (_req: IRequest, res: IResponse) => {
                res.sendFile('/public/robots.txt', { root: path.resolve() });
            })
            .all(`${this.pack.apppath}/api/:function`, jwtCheck, this.api)
            .all(`${this.pack.apppath}/user/:function/:pyfile`, this.secAuth, this.api)
            .all(`${this.pack.apppath}/user/:function`, this.secAuth, this.api)
            .all('/internal/:function', this.api)
            .all('/internal/:function/:pyfile', this.api)
            .get('*', this.secAuth, (req: IRequest, res: IResponse) => {
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
                    `$server (*) : authenticated request from ${req.user.email}`,
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
                    `$server (*) : authenticated but invalid request from ${req.user.email}`,
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
            await slackMsg(msg);
        });

        await WSS.start(httpServer);
        cron.start();
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
                await utils.logMQError(
                    '$server (api) Busboy Error',
                    req,
                    401,
                    '$server (api error)',
                    err,
                    hrstart,
                    this.pack
                );

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

        if (req.cookies && req.cookies.access_token) {
            const t: any = jwt.decode(req.cookies.access_token);

            if (t.sub) {
                /*  Here we add the basic data of the user profile */
                t.email = t.sub.toLowerCase() || 'anonymous';
                req.user = t;

                if (!req.user.name && req.user.firstName && req.user.lastName) {
                    req.user.name = `${req.user.firstName} ${req.user.lastName}`;
                }
            } else {
                await utils.logMQError(
                    `$server (secAuth): ev: 'no valid profile' - ti: ${req.transid}`,
                    req,
                    401,
                    '$server : failed login',
                    { name: 'error', message: 'no name found', caller: '$server' },
                    hrstart,
                    this.pack
                );

                next();
            }
        } else {
            return res.status(400).send('This website requires authentication');
        }

        /* req.cookies['access_token'] */

        let method: string = '';

        if (req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
            method = 'authorization token';
        } else if (req.cookies && req.cookies[utils.Env.appcookie]) {
            token = req.cookies[utils.Env.appcookie];
            method = 'application token';
        }

        /* return next();

        /* Continue with verification */

        const Login: any = () => {
            login(req, res)
                .then(async () => {
                    utils.logInfo(`$server (secAuth): aquired profile - email: ${req.user.email} - ti: ${req.transid}`);

                    next();
                })
                .catch(async (err: any) => {
                    err.caller = '$server';
                    err.trace = addTrace(err.trace, '@at $server (login)');
                    await utils.logMQError(
                        `$server (secAuth): requiring profile error - email: ${req.user.email} - ti: ${req.transid}`,
                        req,
                        401,
                        `$server : failed login by ${req.user.email}`,
                        err,
                        hrstart,
                        this.pack
                    );

                    next();
                });
        };

        if (token) {
            try {
                const z: any = jwt.verify(token, utils.jwtTokenKey);

                if (!z || typeof z === 'string') {
                    return res.status(403).json({ error: 'Forbidden, no id on this token' });
                }

                const profile: IProfile = z;

                /*  Here we add the additional details of the token to the user profile */
                req.user = { ...req.user, ...profile };

                const org: string | undefined = getOrg(req);

                if (!org) {
                    // return res.status(403).json({ error: 'Forbidden, no org has been identified' });
                    utils.logInfo(
                        `$server (secAuth): rederecting user without org - email: ${req.user.email} - ti: ${req.transid}`
                    );

                    return next();
                }

                // ! important setting, this value will be used to ensure the user is allowed
                req.user.org = org;

                const role: string | undefined = getRole(req);

                if (!role) {
                    // return res.status(403).json({ error: 'Forbidden, no role has been identified' });
                    utils.logInfo(
                        `$server (secAuth): rederecting user without role - email: ${req.user.email} - ti: ${req.transid}`
                    );

                    return next();
                }

                req.user.role = role;
                req.user.rolenbr = getRoleNbr(req);

                req.token = profile; /** For easy access */

                utils.logCyan(
                    // eslint-disable-next-line max-len
                    `$server (secAuth): verified - email: ${req.token.email} - org: ${req.user.org} - role: ${req.user.role} - rolenbr: ${req.user.rolenbr} - method: ${method} - ti: ${req.transid}`
                );

                return next();
            } catch (err) {
                utils.logInfo(
                    `$server (secAuth): verification error - email: ${req.user.email} - method: ${method} - ti: ${req.transid}`
                );

                this.removeToken(req);

                return Login();
            }
        } else {
            utils.logInfo(`$server (secAuth): logging in as no token found - ti: ${req.transid}`);

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

        await slackMsgInt(err);
        await utils.logMQError(errMsg, req, 401, errMsg, err, undefined, this.pack);

        res.status(500).end(`An internal error happened. It has been logged - transid: ${req.transid || 'none'}`);
    };
}

const server: Server = new Server();
void server.start();
