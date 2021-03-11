import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import nocache from 'nocache';
import { IResponse } from '../interfaces/shared';
import { utils } from './utils';

export const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: 'You have exceeded the 100 requests per minute limit!',
    headers: true,
});

interface IRequest extends express.Request {
    transid?: string;
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
}

const hasSome: any = (req: IRequest, urls: string[]): boolean => urls.some((url: string) => req.path.includes(url));

export class Express {
    public app: express.Application = express();

    private fatal: boolean = false;

    // eslint-disable-next-line @typescript-eslint/quotes, max-len
    private policy: string = `geolocation 'self';midi 'none';sync-xhr 'none';microphone 'self';camera 'self';magnetometer 'none';gyroscope 'none';fullscreen 'self';payment 'none';`;

    // eslint-disable-next-line @typescript-eslint/quotes, max-len
    private policyApi: string = `geolocation 'none';midi 'none';sync-xhr 'none';microphone 'none';camera 'none';magnetometer 'none';gyroscope 'none';fullscreen 'none';payment 'none';`;

    private helmetSecurityPolicyApi: any = {
        directives: {
            defaultSrc: ["'none'"],
        },
    };

    private assets!: any;
    private config: IExpressConfig = {
        BODYPARSER_JSON_LIMIT: '15mb',
        BODYPARSER_URLENCODED_LIMIT: '15mb',
        cspApiIncluded: ['/user/', '/api'],
        cspExcluded: ['/user/', '/api'],
        featurePolicyApiIncluded: ['/api'],
    };

    public constructor(assets: IAsserts, config?: IExpressConfig) {
        this.assets = assets;
        this.config = { ...this.config, ...config };

        utils.ev.on('fatalError', async (status: boolean) => {
            this.fatal = status;
            if (this.fatal) {
                await utils.logError('$app.ts (fatalError)', {
                    application: utils.Env.app,
                    message: `Fatal flag set to ${status}`,
                    name: 'fatalError',
                    caller: '$express.lite',
                });
            } else {
                utils.logInfo('$app.ts (fatalError): fatal removed');
            }
        });

        this.start();
    }

    private start = (): void => {
        const csp: any = helmet.contentSecurityPolicy(this.CSP(this.assets));

        let cspApi: express.RequestHandler<any>;

        if (this.helmetSecurityPolicyApi) {
            cspApi = helmet.contentSecurityPolicy(this.helmetSecurityPolicyApi);
        }

        this.app
            .use(helmet())
            .use(`${utils.Env.apppath}/public`, express.static('public'))
            .use(`${utils.Env.apppath}/docs/images`, express.static('docs/images'))
            .use(
                `${utils.Env.apppath}/ace-builds/src-min-noconflict`,
                express.static('./node_modules/ace-builds/src-min-noconflict')
            )
            .get(`${utils.Env.apppath}/service-worker.js`, limiter, (_req: IRequest, res: IResponse) => {
                res.sendFile('/public/js/service-worker.js', { root: path.resolve() });
            })
            .get(`${utils.Env.apppath}/workbox-*`, limiter, (req: IRequest, res: IResponse) => {
                res.sendFile(`/public/js/workbox-${req.params['0']}`, { root: path.resolve() });
            })
            .get(`${utils.Env.apppath}/robots.txt`, limiter, (_req: IRequest, res: IResponse) => {
                res.sendFile('/public/robots.txt', { root: path.resolve() });
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
            .use(helmet.referrerPolicy({ policy: 'same-origin' }))
            .use(cookieParser())
            .use(nocache())
            .use(this.requestid)
            .set('case sensitive routing', false)
            .set('host', process.env.HOST || 'localhost')
            .set('port', process.env.PORT || 8192)
            .set('view cache', true)
            .set('view engine', 'pug')
            .set('trust proxy', 1);
    };

    private requestid = (req: IRequest, res: IResponse, next: () => any): any => {
        const x: string = 'X-Request-Id';

        req.transid = req.header(x) ? req.header(x) : utils.guid();

        res.setHeader(x, req.transid ? req.transid : utils.guid());

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

    private CSP: any = (assets: IAsserts) => {
        const t: any[] = [];
        const unsafe: string = "'unsafe-eval'";

        Object.keys(assets).forEach((v: string) => {
            t.push(assets[v].integrity);
        });

        return {
            directives: {
                connectSrc: ["'self'", 'wss:', 'data: https', 'blob: https', '*.com'],
                defaultSrc: ["'self'"],
                frameSrc: ["'self'", 'https://*'],
                fontSrc: ["'self'", '*.com'],
                imgSrc: ["'self'", 'data: https', 'blob: https', '*.com'],
                scriptSrc: ["'self'", unsafe, `'${t.join("' '")}'`],
                styleSrc: ["'self'", '*.com', "'unsafe-inline'", unsafe],
            },
        };
    };
}
