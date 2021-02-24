/* eslint-disable no-underscore-dangle */
/* jshint esversion: 6 */
/*  eslint-disable @typescript-eslint/no-var-requires */

export {};
const path: any = require('path');
const TerserPlugin: any = require('terser-webpack-plugin');
const nodeModules: any = {};

console.info(`$webpack.server: environment: ${process.env.webpackenv}`);

module.exports = {
    cache: false,

    devtool: false,

    entry: './node_modules/@mydiem/diem-common/lib/server/app.js',

    target: 'node',

    output: {
        filename: 'server/app.js',
        path: `${(global as any).__basedir}/`,
        sourceMapFilename: 'server/app.map',
    },

    externals: nodeModules,

    optimization: {
        moduleIds: 'deterministic',
    },

    module: {
        rules: [
            {
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: './src/server/tsconfig.json',
                        },
                    },
                ],
                test: /\.ts$/,
            },
        ],
    },

    plugins: [
        new TerserPlugin({
            parallel: true,
        }),
    ],

    resolve: {
        extensions: ['.ts', '.js'],
        modules: [path.join(__dirname, 'src/server'), 'node_modules'],
    },

    performance: {
        hints: false,
    },
};
