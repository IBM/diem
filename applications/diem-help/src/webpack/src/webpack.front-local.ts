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

const URL_LOADER: string = 'url-loader';
const URL_LOADER_PATH: string = 'public/fonts/[name].[ext]';

console.info(`$webpack.front-local: environment: ${process.env.webpackenv}`);

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
    context: `${(global as any).__basedir}/src/client`,
    cache: false,

    devtool: 'inline-source-map',

    entry: {
        app: [`${(global as any).__basedir}/src/config/vendor.ts`, `${(global as any).__basedir}/src/client/main.ts`],
    },

    optimization: {
        moduleIds: 'deterministic',
        minimizer: [new OptimizeCSSAssetsPlugin({})],
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
                use: [
                    { loader: MiniCssExtractPlugin.loader },
                    { loader: 'css-loader' },
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: require('sass'),
                        },
                    },
                ],
            },
            {
                loader: 'file-loader',
                options: {
                    name: assets,
                },
                test: /\.(png|jpe?g|gif|ico)$/,
            },
            {
                loader: URL_LOADER,
                options: {
                    limit: 10000,
                    mimetype: 'application/font-woff',
                    name: URL_LOADER_PATH,
                },
                test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                loader: URL_LOADER,
                options: {
                    limit: 10000,
                    mimetype: 'application/font-woff',
                    name: URL_LOADER_PATH,
                },
                test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                loader: URL_LOADER,
                options: {
                    limit: 10000,
                    mimetype: 'application/octet-stream',
                    name: URL_LOADER_PATH,
                },
                test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                loader: 'file-loader',
                options: {
                    name: assets,
                },
                test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                loader: URL_LOADER,
                options: {
                    limit: 10000,
                    mimetype: 'image/svg+xml',
                    name: assets,
                },
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                parser: { system: true },
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

        new WebpackAssetsManifest({
            integrity: true,
            integrityHashes: ['sha256'],
            output: `${(global as any).__basedir}/src/server/config/assets.json`,
        }),

        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],

    performance: {
        hints: false,
    },
};
