/* eslint-disable no-underscore-dangle */
/* jshint esversion: 6 */
/*  eslint-disable @typescript-eslint/no-var-requires */

export {};
const webpack: any = require('webpack');
const { GenerateSW }: any = require('workbox-webpack-plugin');
const TerserPlugin: any = require('terser-webpack-plugin');
const ngToolsWebpack: any = require('@ngtools/webpack');
const CopyWebpackPlugin: any = require('copy-webpack-plugin');
const MiniCssExtractPlugin: any = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin: any = require('optimize-css-assets-webpack-plugin');
const cssnano: any = require('cssnano');
const WebpackAssetsManifest: any = require('webpack-assets-manifest');
/** const Ba = require('webpack-bundle-analyzer'); */

console.info(`$webpack.front: environment: ${process.env.webpackenv}`);

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

const URL_LOADER: string = 'url-loader';
const URL_LOADER_PATH: string = 'public/fonts/[name].[ext]';

module.exports = {
    mode: 'production',

    cache: false,

    devtool: '',

    entry: {
        app: [
            `${(global as any).__basedir}/src/config/vendor.prod.ts`,
            `${(global as any).__basedir}/src/client/main.ts`,
        ],
    },

    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                sourceMap: false,
                terserOptions: {
                    compress: {
                        /*  eslint-disable camelcase */
                        pure_funcs: ['console.log', 'console.info'],
                    },
                },
            }),
            new OptimizeCSSAssetsPlugin({
                canPrint: false,
                cssProcessor: cssnano,
                cssProcessorOptions: {
                    discardComments: {
                        removeAll: true,
                    },
                    // Run cssnano in safe mode to avoid
                    // potentially unsafe transformations.
                    safe: true,
                },
            }),
        ],
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
                loader: ['@ngtools/webpack'],
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
                    name: 'public/assets/[name].[hash].[ext]',
                },
                test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                loader: URL_LOADER,
                options: {
                    limit: 10000,
                    mimetype: 'image/svg+xml',
                    name: 'public/assets/[name].[hash].[ext]',
                },
                test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
            },
            {
                parser: { system: true } /** enable SystemJS */,
                test: /[/\\]@angular[/\\]core[/\\].+\.js$/,
            },
        ],
    },

    output: {
        chunkFilename: 'public/js/[name][chunkhash].js',
        filename: 'public/js/bundle[chunkhash].js',
        path: `${(global as any).__basedir}/`,
        publicPath: `${env.APPPATH}/`,
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
                    from: 'node_modules/tinymce/skins/',
                    to: 'public/skins/',
                },
            ],
        }),

        new ngToolsWebpack.AngularCompilerPlugin({
            /** alias for skipCodeGeneration: false */
            tsConfigPath: `${(global as any).__basedir}/src/client/tsconfig-aot.json`,
        }),

        new webpack.ContextReplacementPlugin(/angular(\\|\/)core(\\|\/)/, `${(global as any).__basedir}/src`),

        new webpack.EnvironmentPlugin(env),

        new MiniCssExtractPlugin({
            filename: 'public/css/[name].css',
        }),

        /** new Ba.BundleAnalyzerPlugin(), */

        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),

        new GenerateSW({
            swDest: `${(global as any).__basedir}/public/js/service-worker.js`,
            sourcemap: false,
            mode: 'production',
            offlineGoogleAnalytics: false,
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
    },

    performance: {
        hints: false,
    },
};
