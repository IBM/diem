/* eslint-disable no-underscore-dangle */
/* jshint esversion: 6 */
/*  eslint-disable @typescript-eslint/no-var-requires */

export {};

import path from 'path';
import * as webpack from 'webpack';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import nodeExternals from 'webpack-node-externals';
import { resolve } from './webpack.node';
import NodeMonPlugin from 'nodemon-webpack-plugin';

const Json2Dot: any = () => {
    const json: any = require(`${(global as any).__basedir}/local/env.json`);

    // get a handle to all environmental variables
    const allEnv: any = { ...json.LOCAL, ...json.CONFIG, ...json.SECRETS };

    // convert to dot
    const out: { [index: string]: any } = {};

    const recurse: any = (obj: any, current?: any) => {
        for (const key in obj) {
            // eslint-disable-next-line no-prototype-builtins
            if (obj.hasOwnProperty(key)) {
                const value: any = obj[key];
                const newKey: any = current ? `${current}__${key}` : key; // joined key with dot
                if (value && typeof value === 'object') {
                    recurse(value, newKey); // it's a nested object, so do it again
                } else {
                    out[newKey] = value; // it's not an object, so set the property
                }
            }
        }
    };
    recurse(allEnv);

    return out;
};

process.env = { ...process.env, ...Json2Dot() };

const pack: any = require(`${(global as any).__basedir}/package.json`);

const env: any = {
    APPNAME: pack.config.appname,
    DESCRIPTION: pack.description,
    NAME: pack.name,
    VERSION: pack.version,
};

const debugport: number = Number(process.env.DEBUGPORT) || 9194;

console.info(`$webpack.node-test: environment: ${process.env.webpackenv} - debug port: ${debugport}`);

module.exports = {
    context: `${(global as any).__basedir}/src/server`,

    cache: false,

    devtool: 'inline-source-map',

    entry: './config/server.ts',

    target: 'node',

    output: {
        filename: 'server/server.js',
        path: `${(global as any).__basedir}/`,
    },

    externals: [nodeExternals()],

    optimization: {
        moduleIds: 'deterministic',
    },

    module: {
        rules: [
            {
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
                test: /\.ts$/,
            },
            {
                loader: 'pug-loader',
                test: /\.pug$/,
            },
        ],
    },

    plugins: [
        new ForkTsCheckerWebpackPlugin(),

        new NodeMonPlugin({
            nodeArgs: [`--inspect=0.0.0.0:${debugport}`],
            watch: [path.resolve('./server')],
        }),

        new webpack.EnvironmentPlugin(env),
    ],

    resolve,

    performance: {
        hints: false,
    },
};
