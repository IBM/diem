import { writeFileSync } from 'fs';
import mongoose from 'mongoose';
import { IntInternal } from '../interfaces/shared';
import { utils } from './utils';
import { Credentials } from './cfenv';

/* mongo states
0: disconnected
1: connected
2: connecting
3: disconnecting
*/

export { mongoose };

interface ICredentials {
    url: string;
    ca?: string;
}

const setFatal: any = async (err: any): Promise<void> => {
    const internal: IntInternal = {
        ...err,
        fatal: true,
        message: err.message || 'Mongo Connection Error',
        pid: process.pid,
        source: err.source,
        trace: utils.addTrace(err.trace, '@at $mongo (setFatal)'),
    };

    utils.emit('internal', internal);

    return Promise.resolve();
};

class Mongo {
    private tm: any;

    private uri: string;
    private retries: number = 0;
    private credentials: ICredentials;

    public constructor() {
        this.credentials = Credentials('mongo');
        this.uri = this.credentials.url;

        void this.go();
    }

    private go: any = async () => {
        await this.start().catch(async (err) => {
            err.trace = utils.addTrace(err.trace, '@at $mongo (go)');
            err.source = '$mongo (go)';
            await setFatal(err);
        });

        return Promise.resolve();
    };

    private connect: () => Promise<any> = async (): Promise<any> => {
        /** The connection, this is seperate because all others in start are listeners and they don't
         * hace to be called again, only the connection itself
         */

        if (mongoose.connection.readyState === 1) {
            utils.logInfo(
                `$mongo (connection): already connected to mongo - state: ${mongoose.connection.readyState} - pid: ${process.pid}`
            );

            return Promise.resolve();
        }

        let options: Partial<mongoose.ConnectOptions> = {};

        if (this.credentials.ca) {
            const sslCA: string = Buffer.from(this.credentials.ca, 'base64').toString();
            const fn: string = 'ssl.pem';
            writeFileSync(fn, sslCA);
            options = {
                connectTimeoutMS: 10000,
                keepAlive: true,
                ssl: true,
                sslCA: fn,
                sslValidate: false,
            };
            utils.logInfo(`$mongo (connect): connecting to the Mongo Service using SSL - pid: ${process.pid}`);
        } else {
            options = {
                connectTimeoutMS: 10000,
                serverSelectionTimeoutMS: 10000,
                keepAlive: true,
            };
            utils.logInfo(`$mongo (connect): connecting to the Mongo Service - pid: ${process.pid}`);
        }

        await mongoose.connect(this.uri, options).catch(async (_err) => {
            //
        });

        return Promise.resolve();
    };

    private start: () => Promise<any> = async (): Promise<any> => {
        if (!this.uri) {
            utils.logInfo(`$mongo (start): No Uri found - We cannot proceed - pid: ${process.pid}`);

            return Promise.reject();
        }

        if (!mongoose.connection) {
            return Promise.reject({ message: 'no connection' });
        }

        mongoose.connection.on('connected', () => {
            /** rest counter */
            this.retries = 0;
            utils.logInfo(
                `$mongo (connected): connected to mongo - state: ${mongoose.connection.readyState} - pid: ${process.pid}`
            );

            if (this.tm) {
                clearTimeout(this.tm);
                utils.logInfo(
                    `$mongo (connected): clearing timeout - state: ${mongoose.connection.readyState} - pid: ${process.pid}`
                );
            }

            const internal: IntInternal = {
                fatal: false,
                message: 'Mongo Reconnected',
                pid: process.pid,
                source: '$mongo (connected)',
                trace: ['@at $mongo (start) - reconnected'],
            };

            utils.emit('internal', internal);
        });

        mongoose.connection.on('error', async (err) => {
            err.message = err.message;
            err.trace = utils.addTrace(err.trace, '@at $mongo (connection) - on error');
            err.reason = JSON.stringify(err.reason);
            await setFatal(err);
        });

        mongoose.connection.on('connected', () => {
            /** rest counter */
            this.retries = 0;
        });

        mongoose.connection.on('fullsetup', () => {
            utils.logInfo(`$mongo (fullsetup): full connected to replica set - pid: ${process.pid}`);
        });

        mongoose.connection.on('all', () => {
            utils.logInfo(`$mongo (all): full connected to replica set - pid: ${process.pid}`);
        });

        mongoose.connection.on('close', () => {
            utils.logInfo(`$mongo (close): connection closed - pid: ${process.pid}`);
        });

        /** this will not be used as we don't do the build in authreconnect , but do our polling ourselves */
        mongoose.connection.on('reconnected', () => {
            this.retries = 0;
            utils.logInfo(`$mongo (reconnected): reconnected to mongo after ${this.retries} retries`);

            const internal: IntInternal = {
                fatal: false,
                message: 'Mongo Reconnected',
                pid: process.pid,
                source: '$mongo (reconnected)',
                trace: ['@at $mongo (start) - reconnected'],
            };

            utils.emit('internal', internal);
        });

        mongoose.connection.on('disconnected', async () => {
            /** We will increase the counter so it tries from 0
             * The a timeout that will try to reconnect in 30 seconds
             */

            await setFatal({
                message: 'mongo disconnected',
                trace: ['@at $mongo (connection) - on disconnect'],
            });

            this.retries += 1;

            if (this.retries > 0) {
                utils.logInfo(
                    `$mongo (disconnected): trying to reconnect in 11 seconds - try: ${this.retries} - pid: ${process.pid}`
                );
                this.tm = setTimeout(async () => {
                    utils.logInfo(`$mongo (disconnected): trying to reconnect - pid: ${process.pid}`);
                    // mongoose.disconnect().catch(() => utils.logInfo('$mongo (disconnected): could not disconnect'));
                    await this.connect();
                }, 11000);
            } else {
                await this.connect();
            }
        });

        mongoose.connection.on('reconnectFailed', () => {
            /** We will increase the counter so it tries from 0
             * The a timeout that will try to reconnect in 30 seconds
             */

            utils.logInfo(`$mongo (reconnectFailed): reconnectFailed - pid: ${process.pid}`);
        });

        await this.connect().catch(async (err) => {
            err.trace = utils.addTrace(err.trace, '@at $mongo (go) - on error');

            return Promise.reject(err);
        });

        return Promise.resolve();
    };
}

export const mongo: Mongo = new Mongo();
