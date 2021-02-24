/* eslint-disable no-underscore-dangle */
/* jshint esversion: 6 */
/*  eslint-disable @typescript-eslint/no-var-requires */

export {};

const fs: any = require('fs');
const path: any = require('path');
const webpack: any = require('webpack');
const TerserPlugin: any = require('terser-webpack-plugin');
const ForkTsCheckerWebpackPlugin: any = require('fork-ts-checker-webpack-plugin');

const nodeModules: { [index: string]: any } = {};

const pack: any = require(`${(global as any).__basedir}/package.json`);

const env: any = {
    APPCOOKIE: pack.config.appcookie,
    APPNAME: pack.config.appname,
    DESCRIPTION: pack.description,
    NAME: pack.name,
    VERSION: pack.version,
};

console.info(`$webpack.node: environment: ${process.env.webpackenv}`);

fs.readdirSync('node_modules')
    .filter((x: any) => ['.bin'].indexOf(x) === -1)
    .forEach((mod: any) => {
        nodeModules[mod] = `commonjs ${mod}`;
    });

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

    externals: nodeModules,

    optimization: {
        minimizer: [
            new TerserPlugin({
                parallel: true,
                sourceMap: false,
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
                loader: ['pug-loader'],
                test: /\.pug$/,
            },
        ],
    },

    plugins: [
        new ForkTsCheckerWebpackPlugin(),

        new webpack.EnvironmentPlugin(env),

        new TerserPlugin({
            parallel: true,
            sourceMap: false,
        }),

        new webpack.HashedModuleIdsPlugin({
            hashDigest: 'hex',
            hashDigestLength: 20,
            hashFunction: 'sha256',
        }),
    ],

    resolve: {
        alias: {
            '@common': `${(global as any).__basedir}/node_modules/@mydiem/diem-common/lib/common`,
            '@interfaces': `${(global as any).__basedir}/node_modules/@mydiem/diem-common/lib/interfaces/index`,
            '@util': `${(global as any).__basedir}/node_modules/@mydiem/diem-util/lib`,
        },
        extensions: ['.ts', '.js'],
        modules: [path.join(__dirname, 'src/server'), 'node_modules'],
    },

    performance: {
        hints: false,
    },
};
