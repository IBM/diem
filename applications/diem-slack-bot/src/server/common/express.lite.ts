import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import nocache from 'nocache';
import { IRequest, IResponse } from '@interfaces';
import { utils } from './utils';

export const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: 'You have exceeded the 100 requests per minute limit!',
    headers: true,
});

export interface IExpressConfig {
    BODYPARSER_JSON_LIMIT: string;
    BODYPARSER_URLENCODED_LIMIT: string;
    cspApiIncluded: string[];
    cspExcluded: string[];
    featurePolicyApiIncluded: string[];
}

const hasSome: any = (req: IRequest, urls: string[]): boolean => urls.some((url: string) => req.path.includes(url));

const rawBodyBuffer = (req: IRequest, _res: IResponse, buf: Buffer, encoding: BufferEncoding) => {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
};

const requestid = (req: IRequest, res: IResponse, next: () => any): any => {
    const x = 'X-Request-Id';

    req.transid = req.header(x) ? req.header(x) : utils.guid();

    res.setHeader(x, req.transid ? req.transid : utils.guid());

    next();
};

export class Express {
    public app: express.Application = express();

    private fatal = false;

    // eslint-disable-next-line @typescript-eslint/quotes, max-len
    private policy = `geolocation 'self';midi 'none';sync-xhr 'none';microphone 'self';camera 'self';magnetometer 'none';gyroscope 'none';fullscreen 'self';payment 'none';`;

    // eslint-disable-next-line @typescript-eslint/quotes, max-len
    private policyApi = `geolocation 'none';midi 'none';sync-xhr 'none';microphone 'none';camera 'none';magnetometer 'none';gyroscope 'none';fullscreen 'none';payment 'none';`;

    private helmetSecurityPolicyApi: any = {
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

    public constructor(config?: IExpressConfig) {
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
        let cspApi: express.RequestHandler<any>;

        if (this.helmetSecurityPolicyApi) {
            cspApi = helmet.contentSecurityPolicy(this.helmetSecurityPolicyApi);
        }

        this.app
            .use(helmet())
            .use(`${utils.Env.apppath}/public`, express.static('./public'))
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
            .use(requestid)
            .use(express.urlencoded({ verify: rawBodyBuffer, extended: true }))
            .use(express.json({ verify: rawBodyBuffer }))
            .set('case sensitive routing', false)
            .set('host', process.env.HOST || 'localhost')
            .set('port', process.env.PORT || 8192)
            .set('view cache', true)
            .set('view engine', 'html')
            .set('trust proxy', 1);
    };

    private featurePolicy = (_req: IRequest, res: IResponse, next: () => any): any => {
        res.setHeader('Feature-Policy', this.policy);
        next();
    };

    private featurePolicyApi = (_req: IRequest, res: IResponse, next: () => any): any => {
        res.setHeader('Feature-Policy', this.policyApi);
        next();
    };
}
