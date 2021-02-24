import Cloudant from '@cloudant/cloudant';
import { IntInternal } from '../interfaces/shared';
import { Credentials } from './cfenv';
import { utils } from './utils';

class CloudantLib {
    public cloudant: any;

    public constructor() {
        const cfg: any = Credentials('cloudant');

        if (!cfg || !cfg.url) {
            utils.logInfo('$cloudant (constructor): No Url found - We cannot proceed');

            const internal: IntInternal = {
                err: {
                    name: 'cloudant Connection',
                    message: 'Cloudant: No Url found - We cannot proceed',
                },
                fatal: true,
                message: 'cloudant Connection Error',
                pid: process.pid,
                source: '$cloudant',
                trace: ['@at $cloudant (constructor'],
            };

            utils.emit('internal', internal);

            return;
        }

        this.cloudant = Cloudant({ url: cfg.url });

        this.cloudant
            .ping()
            .then((b: any) => {
                utils.logInfo('$cloudant (constructor): Initialisation done', JSON.stringify(b));
            })
            .catch(async (err: any) => {
                err.caller = '$cloudant';

                await utils.logError('$cloudant (constructor): Initialisation failed', err);

                const internal: IntInternal = {
                    err,
                    fatal: true,
                    message: 'cloudant Connection Error',
                    pid: process.pid,
                    source: '$cloudant',
                    trace: ['@at $cloudant (connect'],
                };

                utils.emit('internal', internal);
            });
    }
}

export const cloudant: Cloudant.ServerScope = new CloudantLib().cloudant;
