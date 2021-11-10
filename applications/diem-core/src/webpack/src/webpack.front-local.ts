/* eslint-disable no-underscore-dangle */
/* jshint esversion: 6 */
/*  eslint-disable @typescript-eslint/no-var-requires */

export {};
import webpack from 'webpack';
import { AngularWebpackPlugin } from '@ngtools/webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import WebpackAssetsManifest from 'webpack-assets-manifest';
import { InjectManifest } from 'workbox-webpack-plugin';
/** const Ba = require('webpack-bundle-analyzer'); */

console.info(`$webpack.front: environment: ${process.env.webpackenv}`);

const assets: string = 'public/assets/[name].[hash].[ext]';

interface IntEnv {
    APPCOOKIE?: string;
    APPPATH?: string;
    APPNAME?: string;
    ENVIRONMENT?: string;
    NAME?: string;
    SITENAME?: string;
    VERSION?: string;
}

const env: IntEnv = {
    APPCOOKIE: process.env.npm_package_config_appcookie,
    APPNAME: process.env.npm_package_config_appname,
    APPPATH: process.env.npm_package_config_apppath,
    ENVIRONMENT: process.env.webpackenv,
    NAME: process.env.npm_package_name,
    SITENAME: process.env.npm_package_config_sitename,
    VERSION: process.env.npm_package_version,
};

module.exports = {
    mode: 'development',

    cache: false,

    entry: {
        app: [`${(global as any).__basedir}/src/client/vendor.ts`, `${(global as any).__basedir}/src/client/main.ts`],
    },

    output: {
        chunkFilename: 'public/js/[name][chunkhash].js',
        filename: 'public/js/bundle[chunkhash].js',
        path: `${(global as any).__basedir}/`,
        publicPath: `${env.APPPATH}/`,
        assetModuleFilename: assets,
    },

    devtool: 'eval-cheap-module-source-map',

    optimization: {
        moduleIds: 'deterministic',
        minimize: false,
    },

    module: {
        rules: [
            {
                loader: '@ngtools/webpack',
                test: /\.ts$/,
            },
            {
                test: /\.m?js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                        compact: false,
                        plugins: ['@angular/compiler-cli/linker/babel'],
                    },
                },
            },
            {
                test: /\.css/,
                use: [{ loader: MiniCssExtractPlugin.loader }, { loader: 'css-loader' }],
            },
            {
                test: /\.scss/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    [
                                        'autoprefixer',
                                        {
                                            // Options
                                        },
                                    ],
                                ],
                            },
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: require('sass'),
                        },
                    },
                ],
            },
            {
                type: 'asset/resource',
                test: /\.(png|jpe?g|gif|ico)$/,
            },
            {
                type: 'asset/resource',
                test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                type: 'asset/resource',
                test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                type: 'asset/resource',
                test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                type: 'asset/resource',
                test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                type: 'asset/inline',
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                parser: { system: true },
                test: /[/\\]@angular[/\\]core[/\\].+\.js$/,
            },
        ],
    },

    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                // {output}/file.txt
                {
                    from: 'src/server/index.pug',
                    to: 'server/index.pug',
                },
                {
                    from: `${(global as any).__basedir}/public/images/*.jpg`,
                },
                {
                    from: `${(global as any).__basedir}/public/images/*.gif`,
                },
                {
                    from: `${(global as any).__basedir}/public/images/favicon*.*`,
                },
                {
                    from: `${(global as any).__basedir}/public/images/diem_logo.*`,
                },
                {
                    from: `${(global as any).__basedir}/public/images/diem_s.*`,
                },
            ],
        }),

        new AngularWebpackPlugin({
            /** alias for skipCodeGeneration: false */
            tsconfig: `${(global as any).__basedir}/src/client/tsconfig.json`,
        }),

        new webpack.ContextReplacementPlugin(/angular(\\|\/)core(\\|\/)/, `${(global as any).__basedir}/src`),

        new webpack.EnvironmentPlugin(env),

        new MiniCssExtractPlugin({
            filename: 'public/css/[name].css',
        }),

        /** new Ba.BundleAnalyzerPlugin(), */

        new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/ }),

        new WebpackAssetsManifest({
            integrity: true,
            integrityHashes: ['sha256'],
            output: `${(global as any).__basedir}/src/server/config/assets.json`,
        }),

        new webpack.ProvidePlugin({
            process: require.resolve('process/browser'),
        }),

        new InjectManifest({
            swSrc: `${(global as any).__basedir}/src/webpack/src/service-worker.js`,
            swDest: `${(global as any).__basedir}/public/js/service-worker.js`,
            exclude: [/\.pug$/, /\.ttf$/, /\.eot$/],
        }),
    ],

    resolve: {
        alias: {
            '@util': `${(global as any).__basedir}/src/webpack`,
        },
        extensions: ['.ts', '.js'],
    },

    performance: {
        hints: false,
    },
};
