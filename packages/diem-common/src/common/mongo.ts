/* eslint-disable @typescript-eslint/indent */
import mongoose from 'mongoose';
import { IntInternal } from '../interfaces/shared';
import { utils } from './utils';
import { Credentials } from './cfenv';

export { mongoose };

const source: string = '@leap-common/$mongo';

interface ICredentials {
    url: string;
    ca?: string;
}

class Mongo {
    public db!: mongoose.Connection;

    private uri: string;
    private retries: number = 0;
    private credentials: ICredentials;

    public constructor() {
        this.credentials = Credentials('mongo');
        this.uri = this.credentials.url;

        this.go();
    }

    private go: any = async () => {
        await this.start();
    };

    private connect = async () => {
        /** The connection, this is seperate because all others in start are listeners and they don't
         * hace to be called again, only the connection itself
         */

        let options: Partial<mongoose.ConnectionOptions> = {};

        if (this.credentials.ca) {
            options = {
                connectTimeoutMS: 300000,
                keepAlive: true,
                ssl: true,
                sslCA: [Buffer.from(this.credentials.ca, 'base64')],
                sslValidate: false,
                useCreateIndex: true,
                useNewUrlParser: true,
                useUnifiedTopology: process.env.useUnifiedTopology === undefined,
            };
            utils.logInfo(`$mongo (connect): connecting to the Mongo Service using SSL - pid: ${process.pid}`);
        } else {
            utils.logInfo(`$mongo (connect): connecting to the Mongo Service - pid: ${process.pid}`);
            options = { useNewUrlParser: true };
        }

        await mongoose.connect(this.uri, options).catch((err: Error) => {
            const internal: IntInternal = {
                err,
                fatal: true,
                message: 'Mongo Connection Error',
                pid: process.pid,
                source,
                trace: ['@at $mongo (connect'],
            };

            utils.emit('internal', internal);
        });
    };

    private start = async () => {
        if (!this.uri) {
            utils.logInfo(`$mongo (start): No Uri found - We cannot proceed - pid: ${process.pid}`);

            return;
        }

        mongoose.set('useCreateIndex', true);

        this.db = mongoose.connection;

        this.db.once('open', () => {
            /** rest counter */
            this.retries = 0;
            utils.logInfo(`$mongo (connection): Database started - pid: ${process.pid}`);
        });

        this.db.on('error', async (err) => {
            await utils.logError('$mongo (connection): error)', {
                location: '$mongo',
                message: err.message,
                name: err.name,
                retries: this.retries,
                pid: process.pid,
                caller: '$mongo',
            });
        });

        this.db.on('connected', () => {
            /** rest counter */
            this.retries = 0;
            utils.logInfo(`$mongo (connection): Connected to Mongo - pid: ${process.pid}`);
        });

        this.db.on('open', () => {
            utils.logInfo(`$mongo (connection): db open - pid: ${process.pid}`);
        });

        this.db.on('close', () => {
            utils.logInfo(`$mongo (connection): connection closed - pid: ${process.pid}`);
        });

        /** this will not be used as we don't do the build in authreconnect , but do our polling ourselves */
        this.db.on('reconnected', () => {
            this.retries = 0;
            utils.logInfo(`MongoDB reconnected ${this.retries}`);

            const internal: IntInternal = {
                fatal: false,
                message: 'Mongo Reconnected',
                pid: process.pid,
                source,
                trace: ['@at $mongo (reconnected'],
            };

            utils.emit('internal', internal);
        });

        this.db.on('disconnected', () => {
            /** We will increase the counter so it tries from 0
             * The a timeout that will try to reconnect in 30 seconds
             */

            this.retries += 1;

            utils.logInfo(`$mongo (disconnected): retry number: ${this.retries} - pid: ${process.pid}`);
            /*
            setTimeout(async () => {
                mongoose.disconnect().catch(() => utils.logInfo('$mongo (disconnected): could not disconnect'));
                await this.connect();
            }, 30000);
            */

            const internal: IntInternal = {
                err: {
                    name: 'Mongo Connection',
                    message: 'Mongo disconnected',
                },
                fatal: true,
                message: 'Mongo Disconnected',
                pid: process.pid,
                source,
                trace: ['@at $mongo (disconnected'],
            };

            utils.emit('internal', internal);
        });

        await this.connect();
    };
}

export const mongo: Mongo = new Mongo();
