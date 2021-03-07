import path from 'path';
import express from 'express';
import session from 'express-session';
import redisStore from 'connect-redis';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import nocache from 'nocache';
import rateLimit from 'express-rate-limit';
import { IXorg } from '../interfaces/env';
import { IResponse } from '../interfaces/shared';
import { Credentials } from './cfenv';
import { utils } from './utils';
import { redisc } from './redis';

export const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: 'You have exceeded the 100 requests per minute limit!',
    headers: true,
});

interface IRequest extends express.Request {
    sessionid?: string;
    transid?: string;
    xorg?: IXorg;
}

interface IAsserts {
    [index: string]: any;
}

export interface IExpressConfig {
    BODYPARSER_JSON_LIMIT: string;
    BODYPARSER_URLENCODED_LIMIT: string;
    cspApiIncluded: string[];
    cspExcluded: string[];
    featurePolicyApiIncluded: string[];
    unsafeinline?: boolean;
    unsafecss?: boolean;
}

const hasSome: any = (req: IRequest, urls: string[]): boolean => urls.some((url: string) => req.path.includes(url));

export class Express {
    public app: express.Application = express();

    private session: any;
    private fatal: boolean = false;
    private assets!: any;

    // eslint-disable-next-line @typescript-eslint/quotes, max-len
    private policy: string = `geolocation 'self';midi 'none';sync-xhr 'none';microphone 'self';camera 'self';magnetometer 'none';gyroscope 'none';fullscreen 'self';payment 'none';`;

    // eslint-disable-next-line @typescript-eslint/quotes, max-len
    private policyApi: string = `geolocation 'none';midi 'none';sync-xhr 'none';microphone 'none';camera 'none';magnetometer 'none';gyroscope 'none';fullscreen 'none';payment 'none';`;

    private contentSecurityPolicy: any = {
        directives: {
            defaultSrc: ["'none'"],
        },
    };

    private passport!: any;
    private config: IExpressConfig = {
        BODYPARSER_JSON_LIMIT: '15mb',
        BODYPARSER_URLENCODED_LIMIT: '15mb',
        cspApiIncluded: ['/user/', '/api'],
        cspExcluded: ['/user/', '/api'],
        featurePolicyApiIncluded: ['/api'],
    };

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public constructor(passport: any, assets: IAsserts, config?: IExpressConfig) {
        this.assets = assets;
        this.passport = passport;
        this.config = { ...this.config, ...config };

        utils.ev.on('fatalError', async (status: boolean) => {
            this.fatal = status;
            if (this.fatal) {
                await utils.logError('$app.ts (fatalError)', {
                    application: utils.Env.app,
                    message: `Fatal flag set to ${status}`,
                    name: 'fatalError',
                    caller: '$express',
                });
            } else {
                utils.logInfo('$app.ts (fatalError): fatal removed');
            }
        });

        this.session = Credentials('session');

        this.start();
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity
    private start = (): void => {
        try {
            const csp: any = helmet.contentSecurityPolicy(this.CSP(this.assets));

            let cspApi: express.RequestHandler<any>;

            if (this.contentSecurityPolicy) {
                cspApi = helmet.contentSecurityPolicy(this.contentSecurityPolicy);
            }
            const sess: any = this.getSession();

            this.app
                .use(this.checkSession())
                .use(session(sess))
                .use(this.passport.initialize())
                .use(this.passport.session())
                .use(helmet())
                .use(`${utils.Env.apppath}/public`, express.static('./public'))
                .use(`${utils.Env.apppath}/ace-builds`, express.static('./node_modules/ace-builds'))
                .use(`${utils.Env.apppath}/tinymce`, express.static('./node_modules/tinymce'))
                .get(`${utils.Env.apppath}/service-worker.js`, limiter, (_req: IRequest, res: IResponse) => {
                    res.sendFile('/public/js/service-worker.js', { root: path.resolve() });
                })
                .get(`${utils.Env.apppath}/workbox-*`, limiter, (req: IRequest, res: IResponse) => {
                    res.sendFile(`/public/js/workbox-${req.params['0']}`, { root: path.resolve() });
                })
                .get(`${utils.Env.apppath}/robots.txt`, limiter, (_req: IRequest, res: IResponse) => {
                    res.sendFile('/public/robots.txt', { root: path.resolve() });
                })
                .use(limiter)
                .use((req, res, next) =>
                    !hasSome(req, this.config ? this.config.cspExcluded : []) ? csp(req, res, next) : next()
                )
                .use((req, res, next) =>
                    hasSome(req, this.config ? this.config.cspApiIncluded : []) ? cspApi(req, res, next) : next()
                )
                .use((req, res, next) =>
                    hasSome(req, this.config ? this.config.featurePolicyApiIncluded : [])
                        ? this.featurePolicyApi(req, res, next)
                        : this.featurePolicy(req, res, next)
                )
                .use(helmet.referrerPolicy({ policy: 'same-origin' }))
                .use(cookieParser())
                .use(
                    express.urlencoded({
                        limit: this.config ? this.config.BODYPARSER_URLENCODED_LIMIT : '15mb',
                        extended: false,
                    })
                )
                .use(
                    express.json({
                        limit:
                            this.config && this.config.BODYPARSER_JSON_LIMIT
                                ? this.config.BODYPARSER_JSON_LIMIT
                                : '15mb',
                    })
                )
                .use(nocache())
                .use(this.requestid)
                .use(this.sessionid)
                .use(this.xorg)
                .set('case sensitive routing', false)
                .set('host', process.env.HOST || 'localhost')
                .set('port', process.env.PORT || 8192)
                .set('view cache', true)
                .set('view engine', 'pug')
                .set('trust proxy', 1);
        } catch (err) {
            console.error('$express (start)', err);
        }

        this.passport.serializeUser((user: any, done: any) => {
            done(undefined, user);
        });

        this.passport.deserializeUser((obj: any, done: any) => {
            done(undefined, obj);
        });
    };

    private requestid = (req: IRequest, res: IResponse, next: () => any): any => {
        const x: string = 'X-Request-Id';

        req.transid = req.header(x) ? req.header(x) : utils.guid();

        res.setHeader(x, req.transid ? req.transid : utils.guid());

        next();
    };

    private sessionid = (req: IRequest, res: IResponse, next: () => any): any => {
        const x: string = 'X-Correlation-ID';

        req.sessionid = req.header(x) ? req.header(x) : utils.guid();

        res.setHeader(x, req.sessionid ? req.sessionid : utils.guid());

        next();
    };

    private xorg = (req: IRequest, res: IResponse, next: () => any): any => {
        const x: string = 'X-Org-Protection';
        const t: string | undefined = req.header(x);
        if (t) {
            try {
                req.xorg = JSON.parse(Buffer.from(t, 'base64').toString());
            } catch (e) {
                req.xorg = undefined;
            }

            res.setHeader(x, t);
        }

        next();
    };

    private featurePolicy = (_req: IRequest, res: IResponse, next: () => any): any => {
        res.setHeader('Feature-Policy', this.policy);
        next();
    };

    private featurePolicyApi = (_req: IRequest, res: IResponse, next: () => any): any => {
        res.setHeader('Feature-Policy', this.policyApi);
        next();
    };

    private getSession = (): any => {
        const redisstore: any = redisStore(session);

        const redisClient: any = redisc;

        return {
            cookie: {
                httpOnly: true,
                maxAge: 86400000,
                path: '/',
                secure: true,
            },
            genid: (): string => utils.guid(),
            name: this.session ? this.session.name : undefined,
            proxy: true,
            resave: false,
            saveUninitialized: false,
            secret: this.session ? this.session.secret : undefined,
            store: new redisstore({
                client: redisClient,
            }),
        };
    };

    private checkSession = () => (_req: IRequest, res: IResponse, next: () => any): any => {
        const lookupSession: any = (error: Error) => {
            if (error) {
                return res.sendFile('/public/503.html', { root: path.resolve() });
            }

            if (this.fatal) {
                return res.sendFile('/public/503.html', { root: path.resolve() });
            }

            next();
        };

        lookupSession();
    };

    private CSP: any = () => {
        const t: any[] = [];
        const unsafe: string = "'unsafe-eval'";

        Object.keys(this.assets).forEach((v: string) => {
            t.push(this.assets[v].integrity);
        });

        return {
            directives: {
                connectSrc: ["'self'", 'wss:', 'data: https', 'blob: https', '*.com'],
                defaultSrc: ["'self'"],
                fontSrc: ["'self'", '*.com'],
                frameSrc: ["'self'", 'https://*'],
                imgSrc: ["'self'", 'data: https', 'blob: https', '*.com'],
                scriptSrc: ["'self'", unsafe, `'${t.join("' '")}'`],
                styleSrc: ["'self'", '*.com', "'unsafe-inline'", unsafe],
            },
        };
    };
}
