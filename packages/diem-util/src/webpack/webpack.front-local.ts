/* eslint-disable no-underscore-dangle */
/* jshint esversion: 6 */
/*  eslint-disable @typescript-eslint/no-var-requires */

export {};
const path: any = require('path');
const webpack: any = require('webpack');
const { GenerateSW }: any = require('workbox-webpack-plugin');
const autoprefixer: any = require('autoprefixer');
const DuplicatePackageCheckerPlugin: any = require('duplicate-package-checker-webpack-plugin');
const CopyWebpackPlugin: any = require('copy-webpack-plugin');
const MiniCssExtractPlugin: any = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin: any = require('optimize-css-assets-webpack-plugin');
const WebpackAssetsManifest: any = require('webpack-assets-manifest');
const ForkTsCheckerWebpackPlugin: any = require('fork-ts-checker-webpack-plugin');

const urlloader: string = 'url-loader';
const fontname: string = 'public/fonts/[name].[ext]';

console.info(`$webpack.front-local: environment: ${process.env.webpackenv}`);

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
    context: `${(global as any).__basedir}/src/client`,
    cache: false,

    devtool: 'inline-source-map',

    entry: {
        app: [`${(global as any).__basedir}/src/config/vendor.ts`, `${(global as any).__basedir}/src/client/main.ts`],
    },

    optimization: {
        minimizer: [new OptimizeCSSAssetsPlugin({})],
        splitChunks: {
            automaticNameDelimiter: '-',
            cacheGroups: {
                default: {
                    minChunks: 2,
                    priority: -20,
                    reuseExistingChunk: true,
                },
                styles: {
                    chunks: 'all',
                    enforce: true,
                    name: 'styles',
                    test: /\.css$/,
                },
            },
            chunks: 'all',
            maxAsyncRequests: 5,
            maxInitialRequests: 3,
            maxSize: 0,
            minChunks: 1,
            minSize: 30000,
            name: true,
        },
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
                test: /\.css/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
            {
                test: /\.scss/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
                loader: 'file-loader?name=public/assets/[name].[hash].[ext]',
                test: /\.(png|jpe?g|gif|ico)$/,
            },
            {
                loader: 'file-loader?name=public/assets/[name].[hash].[ext]',
                test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: urlloader,
                        options: {
                            limit: 10000,
                            mimetype: 'image/svg+xml',
                            name: fontname,
                        },
                    },
                ],
            },
            {
                test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: urlloader,
                        options: {
                            limit: 10000,
                            mimetype: 'application/font-woff',
                            name: fontname,
                        },
                    },
                ],
            },
            {
                test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: urlloader,
                        options: {
                            limit: 10000,
                            mimetype: 'application/font-woff',
                            name: fontname,
                        },
                    },
                ],
            },
            {
                test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: urlloader,
                        options: {
                            limit: 10000,
                            mimetype: 'application/font-ttf',
                            name: fontname,
                        },
                    },
                ],
            },

            {
                // Mark files inside `@angular/core` as using SystemJS style dynamic imports.
                // Removing this will cause deprecation warnings to appear.
                parser: { system: true }, // enable SystemJS,
                test: /[/\\]@angular[/\\]core[/\\].+\.js$/,
            },
        ],
    },

    output: {
        chunkFilename: 'public/js/[name][chunkhash].js',
        filename: 'public/js/bundle[chunkhash].js',
        path: `${(global as any).__basedir}/`,
        publicPath: `${env.APPPATH ? env.APPPATH : undefined}/`,
    },

    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                // {output}/file.txt
                {
                    from: `${(global as any).__basedir}/src/server/index.pug`,
                    to: `${(global as any).__basedir}/server/index.pug`,
                },
                {
                    from: `${(global as any).__basedir}/node_modules/tinymce/skins/`,
                    to: `${(global as any).__basedir}/public/skins/`,
                },
            ],
        }),

        new webpack.ContextReplacementPlugin(/angular(\\|\/)core(\\|\/)/, path.resolve(__dirname, './src')),

        new ForkTsCheckerWebpackPlugin(),

        new MiniCssExtractPlugin({
            filename: 'public/css/[name].css',
        }),

        new webpack.LoaderOptionsPlugin({
            // test: /\.xxx$/, // may apply this only for some modules
            options: {
                postcss: (): any => [autoprefixer],
                ts: {
                    configFileName: './src/client/tsconfig.json',
                },
            },
        }),

        new webpack.EnvironmentPlugin(env),

        new GenerateSW({
            swDest: `${(global as any).__basedir}/public/js/service-worker.js`,
            sourcemap: true,
            mode: 'development',
            offlineGoogleAnalytics: false,
        }),

        new DuplicatePackageCheckerPlugin({
            // Also show module that is requiring each duplicate package
            verbose: true,
        }),

        new webpack.HashedModuleIdsPlugin({
            hashDigest: 'hex',
            hashDigestLength: 20,
            hashFunction: 'sha256',
        }),

        new WebpackAssetsManifest({
            integrity: true,
            integrityHashes: ['sha256'],
            output: `${(global as any).__basedir}/src/server/config/assets.json`,
        }),
    ],

    resolve: {
        alias: {
            '@util': `${(global as any).__basedir}/node_modules/@sets/diem-util/lib`,
        },
        extensions: ['.ts', '.js'],
        modules: ['node_modules'],
    },

    performance: {
        hints: false,
    },
};
