/* eslint-disable @typescript-eslint/indent */
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

const source: string = '@leap-common/$mongo';

interface ICredentials {
    url: string;
    ca?: string;
}

class Mongo {
    public db!: mongoose.Connection;

    private tm: any;

    private uri: string;
    private retries: number = 0;
    private credentials: ICredentials;

    public constructor() {
        this.credentials = Credentials('mongo');
        this.uri = this.credentials.url;

        this.db = mongoose.connection;

        this.go();
    }

    private go: any = async () => {
        await this.start();
    };

    private connect = async () => {
        /** The connection, this is seperate because all others in start are listeners and they don't
         * hace to be called again, only the connection itself
         */

        if (mongoose.connection.readyState === 1) {
            utils.logInfo(
                `$mongo (connection): already connected to mongo - state: ${mongoose.connection.readyState} - pid: ${process.pid}`
            );

            return;
        }

        let options: Partial<mongoose.ConnectionOptions> = {};

        if (this.credentials.ca) {
            options = {
                connectTimeoutMS: 300000,
                keepAlive: true,
                ssl: true,
                sslCA: [Buffer.from(this.credentials.ca, 'base64')],
                sslValidate: false,
                useCreateIndex: true,
                poolSize: 10,
                useNewUrlParser: true,
                useUnifiedTopology: true,
                connectWithNoPrimary: true,
            };
            utils.logInfo(`$mongo (connect): connecting to the Mongo Service using SSL - pid: ${process.pid}`);
        } else {
            utils.logInfo(`$mongo (connect): connecting to the Mongo Service - pid: ${process.pid}`);
            options = { useNewUrlParser: true, useUnifiedTopology: true };
        }

        await mongoose.connect(this.uri, options).catch(async () => {
            //
        });
    };

    private start = async () => {
        if (!this.uri) {
            utils.logInfo(`$mongo (start): No Uri found - We cannot proceed - pid: ${process.pid}`);

            return;
        }

        mongoose.set('useCreateIndex', true);

        this.db.on('connected', () => {
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
        });

        this.db.on('error', async (err) => {
            void utils.logError('$mongo (error): error', {
                location: '$mongo',
                message: err.message,
                name: err.name,
                reason: JSON.stringify(err.reason),
                retries: this.retries,
                pid: process.pid,
                caller: '$mongo',
                trace: ['@at $mongo (connect)'],
            });
        });

        this.db.on('connected', () => {
            /** rest counter */
            this.retries = 0;
        });

        this.db.on('fullsetup', () => {
            utils.logInfo(`$mongo (fullsetup): full connected to replica set - pid: ${process.pid}`);
        });

        this.db.on('all', () => {
            utils.logInfo(`$mongo (all): full connected to replica set - pid: ${process.pid}`);
        });

        this.db.on('close', () => {
            utils.logInfo(`$mongo (close): connection closed - pid: ${process.pid}`);
        });

        /** this will not be used as we don't do the build in authreconnect , but do our polling ourselves */
        this.db.on('reconnected', () => {
            this.retries = 0;
            utils.logInfo(`$mongo (reconnected): reconnected to mongo after ${this.retries} retries`);

            const internal: IntInternal = {
                fatal: false,
                message: 'Mongo Reconnected',
                pid: process.pid,
                source,
                trace: ['@at $mongo (reconnected'],
            };

            utils.emit('internal', internal);
        });

        this.db.on('disconnected', async () => {
            /** We will increase the counter so it tries from 0
             * The a timeout that will try to reconnect in 30 seconds
             */

            this.retries += 1;

            if (this.retries > 0) {
                utils.logInfo(
                    `$mongo (disconnected): trying to reconnect in 30 seconds - try: ${this.retries} - pid: ${process.pid}`
                );
                this.tm = setTimeout(async () => {
                    utils.logInfo(`$mongo (disconnected): trying to reconnect - pid: ${process.pid}`);
                    // mongoose.disconnect().catch(() => utils.logInfo('$mongo (disconnected): could not disconnect'));
                    await this.connect();
                }, 31000);
            } else {
                await this.connect();
            }
        });

        this.db.on('reconnectFailed', () => {
            /** We will increase the counter so it tries from 0
             * The a timeout that will try to reconnect in 30 seconds
             */

            utils.logInfo(`$mongo (reconnectFailed): reconnectFailed - pid: ${process.pid}`);
        });

        await this.connect();
    };
}

export const mongo: Mongo = new Mongo();
