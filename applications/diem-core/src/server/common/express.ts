import path from 'path';
import express, { Request } from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import nocache from 'nocache';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import MongoStore from 'connect-mongo';
import { IntInternal, IResponse } from '@interfaces';
import { IXorg } from '../interfaces/env';
import { mongoose } from './mongo';
import { Credentials } from './cfenv';
import { utils } from './utils';
import { Strategy } from './authentication';

export const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: 'You have exceeded the 100 requests per minute limit!',
    headers: true,
});

export const limiterl = rateLimit({
    windowMs: 1 * 60 * 250, // 1 minute
    max: 250,
    message: 'You have exceeded the 1000 requests per minute limit!',
    headers: true,
});

interface ISession extends session.Session {
    originalUrl?: string;
}

export interface IRequest extends Request {
    sessionid?: string;
    transid?: string;
    xorg?: IXorg;
    session: ISession & Partial<session.SessionData>;
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

const requestid = (req: IRequest, res: IResponse, next: () => any): any => {
    const x = 'X-Request-Id';

    req.transid = req.header(x) ? req.header(x) : utils.guid();

    res.setHeader(x, req.transid ? req.transid : utils.guid());

    next();
};

const sessionid = (req: IRequest, res: IResponse, next: () => any): any => {
    const x = 'X-Correlation-ID';

    req.sessionid = req.header(x) ? req.header(x) : utils.guid();

    res.setHeader(x, req.sessionid ? req.sessionid : utils.guid());

    next();
};

const xorg = (req: IRequest, res: IResponse, next: () => any): any => {
    const x = 'X-Org-Protection';
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

export class Express {
    public app: express.Application = express();

    private session: any;
    private fatal = false;
    private assets!: any;

    private policy = `geolocation 'self';midi 'none';sync-xhr 'none';microphone 'self';camera 'self';magnetometer 'none';gyroscope 'none';fullscreen 'self';payment 'none';`;

    private policyApi = `geolocation 'none';midi 'none';sync-xhr 'none';microphone 'none';camera 'none';magnetometer 'none';gyroscope 'none';fullscreen 'none';payment 'none';`;

    private contentSecurityPolicy: any = {
        directives: {
            defaultSrc: ["'none'"],
        },
    };

    private config: IExpressConfig = {
        BODYPARSER_JSON_LIMIT: '15mb',
        BODYPARSER_URLENCODED_LIMIT: '15mb',
        cspApiIncluded: ['/user/', '/api'],
        cspExcluded: ['/user/', '/api'],
        featurePolicyApiIncluded: ['/api'],
    };

    public constructor(assets: IAsserts, config?: IExpressConfig) {
        this.assets = assets;
        passport.use(Strategy);
        this.config = { ...this.config, ...config };

        utils.ev.on('internal', async (internal: IntInternal) => {
            this.fatal = internal.fatal;
        });

        this.session = Credentials('session');

        this.start();
    }

    private start = (): void => {
        try {
            const csp: any = helmet.contentSecurityPolicy(this.CSP(this.assets));

            let cspApi: express.RequestHandler<any>;

            if (this.contentSecurityPolicy) {
                cspApi = helmet.contentSecurityPolicy(this.contentSecurityPolicy);
            }
            const sess: any = this.getSession();

            this.app
                .use(helmet())
                .use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }))
                .use(`${utils.Env.apppath}/public`, express.static('./public'))
                .use(
                    `${utils.Env.apppath}/ace-builds/src-min-noconflict`,
                    express.static('./node_modules/ace-builds/src-min-noconflict')
                )
                .use(`${utils.Env.apppath}/501`, express.static('./public/501.html'))
                .use(`${utils.Env.apppath}/tinymce/skins`, express.static('./node_modules/tinymce/skins'))
                .use(`${utils.Env.apppath}/tinymce/icons`, express.static('./node_modules/tinymce/icons'))
                .use(`${utils.Env.apppath}/tinymce/skins`, express.static('./node_modules/tinymce/skins'))
                .use(`${utils.Env.apppath}/tinymce/themes`, express.static('./node_modules/tinymce/themes'))
                .get('/favicon.png', limiter, (_req: IRequest, res: IResponse) => {
                    res.sendFile('/public/images/favicon.png', { root: path.resolve() });
                })
                .use(this.checkSession())
                .use(session(sess))
                .use(passport.initialize())
                .use(passport.session())
                .get('/login', limiter, passport.authenticate('openidconnect', {}))
                .get(
                    '/sso/callback',
                    limiter,
                    passport.authenticate('openidconnect'),
                    (req: IRequest, res: IResponse) => {
                        if (req.session) {
                            return res.redirect(req.session.originalUrl || '/');
                        }
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (err: Error, _req: IRequest, res: IResponse, _next: any) => {
                        if (err) {
                            // maybe an old sso callback, let's return to the login
                            return res.redirect('/login');
                            // return res.sendFile('/public/501.html', { root: path.resolve() });
                        }
                    }
                )
                .get(`${utils.Env.apppath}/service-worker.js`, limiter, (_req: IRequest, res: IResponse) => {
                    res.sendFile('/public/js/service-worker.js', { root: path.resolve() });
                })
                .get(`${utils.Env.apppath}/robots.txt`, limiter, (_req: IRequest, res: IResponse) => {
                    res.sendFile('/public/robots.txt', { root: path.resolve() });
                })
                .get(`/DomainVerification.html`, limiter, (_req: IRequest, res: IResponse) => {
                    res.sendFile('/public/DomainVerification.html', { root: path.resolve() });
                })
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
                .use(requestid)
                .use(sessionid)
                .use(xorg)
                .set('case sensitive routing', false)
                .set('host', process.env.HOST || 'localhost')
                .set('port', process.env.PORT || 8192)
                .set('view cache', true)
                .set('view engine', 'pug')
                .set('trust proxy', 1);
        } catch (err) {
            console.error('$express (start)', err);
        }

        passport.serializeUser((user: any, done: any) => {
            done(undefined, user);
        });

        passport.deserializeUser((obj: any, done: any) => {
            done(undefined, obj);
        });
    };

    private featurePolicy = (_req: IRequest, res: IResponse, next: () => any): any => {
        res.setHeader('Feature-Policy', this.policy);
        next();
    };

    private featurePolicyApi = (_req: IRequest, res: IResponse, next: () => any): any => {
        res.setHeader('Feature-Policy', this.policyApi);
        next();
    };

    private getSession = (): any => ({
        cookie: {
            httpOnly: true,
            maxAge: 86400000,
            path: '/',
            secure: true,
            sameSite: 'Lax',
        },
        genid: (): string => utils.guid(),
        name: this.session ? this.session.name : undefined,
        proxy: true,
        resave: false,
        saveUninitialized: false,
        secret: this.session ? this.session.secret : undefined,
        store: MongoStore.create({
            client: mongoose.connection.getClient(),
            stringify: false,
        }),
    });

    private readonly checkSession =
        () =>
        (_req: IRequest, res: IResponse, next: () => any): any => {
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
        const unsafe = "'unsafe-eval'";

        Object.keys(this.assets).forEach((v: string) => {
            t.push(this.assets[v].integrity);
        });

        return {
            directives: {
                connectSrc: ["'self'", 'wss:', 'data: https', 'blob: https', '*.com'],
                defaultSrc: ["'self'"],
                fontSrc: ["'self'", '*.com', '* data:'],
                frameSrc: ["'self'", 'https://*'],
                imgSrc: ["'self'", '* data:', 'blob: https', '*.com'],
                scriptSrc: ["'self'", unsafe, `'${t.join("' '")}'`],
                styleSrc: ["'self'", '*.com', "'unsafe-inline'", unsafe],
            },
        };
    };
}
