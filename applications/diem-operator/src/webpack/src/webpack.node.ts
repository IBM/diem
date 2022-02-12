/* eslint-disable no-underscore-dangle */
/* jshint esversion: 6 */
/*  eslint-disable @typescript-eslint/no-var-requires */

export {};

import path from 'path';
import * as webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import nodeExternals from 'webpack-node-externals';

const pack: any = require(`${(global as any).__basedir}/package.json`);

const env: any = {
    APPNAME: pack.config.appname,
    DESCRIPTION: pack.description,
    NAME: pack.name,
    VERSION: pack.version,
};

export const resolve = {
    alias: {
        '@common': `${(global as any).__basedir}/src/server/common`,
        '@interfaces': `${(global as any).__basedir}/src/server/interfaces`,
        '@config': `${(global as any).__basedir}/src/server/config`,
    },
    extensions: ['.ts', '.js'],
    modules: [path.join(__dirname, 'src/server'), 'node_modules'],
};

console.info(`$webpack.node: environment: ${process.env.webpackenv}`);

module.exports = {
    context: `${(global as any).__basedir}/src/server`,

    cache: false,

    devtool: false,

    entry: './config/server.ts',

    target: 'node',

    output: {
        filename: 'server/server.js',
        path: `${(global as any).__basedir}/`,
        sourceMapFilename: 'server/server.map',
    },

    externals: [nodeExternals()],

    optimization: {
        moduleIds: 'deterministic',
        minimizer: [
            new TerserPlugin({
                parallel: true,
            }),
        ],
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
                use: [
                    {
                        loader: 'pug-loader',
                    },
                ],
                test: /\.pug$/,
            },
        ],
    },

    plugins: [
        new ForkTsCheckerWebpackPlugin(),

        new webpack.EnvironmentPlugin(env),

        new TerserPlugin({
            parallel: true,
        }),
    ],

    resolve,

    performance: {
        hints: false,
    },
};
