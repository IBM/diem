/* eslint-disable no-underscore-dangle */
/* jshint esversion: 6 */
/*  eslint-disable @typescript-eslint/no-var-requires */

export {};
const webpack: any = require('webpack');
const TerserPlugin: any = require('terser-webpack-plugin');
const ngToolsWebpack: any = require('@ngtools/webpack');
const CopyWebpackPlugin: any = require('copy-webpack-plugin');
const MiniCssExtractPlugin: any = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin: any = require('optimize-css-assets-webpack-plugin');
const cssnano: any = require('cssnano');
const WebpackAssetsManifest: any = require('webpack-assets-manifest');
const { InjectManifest }: any = require('workbox-webpack-plugin');
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

const URL_LOADER: string = 'url-loader';
const URL_LOADER_PATH: string = 'public/fonts/[name].[ext]';

module.exports = {
    mode: 'production',

    cache: false,

    entry: {
        app: [
            `${(global as any).__basedir}/src/config/vendor.prod.ts`,
            `${(global as any).__basedir}/src/client/main.ts`,
        ],
    },

    optimization: {
        moduleIds: 'deterministic',
        minimize: true,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    compress: {
                        dead_code: true,
                        pure_funcs: ['console.log', 'console.info'],
                    },
                    mangle: true,
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
    },

    module: {
        rules: [
            {
                loader: '@ngtools/webpack',
                test: /\.ts$/,
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
                    name: 'public/assets/[name].[hash].[ext]',
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

        new WebpackAssetsManifest({
            integrity: true,
            integrityHashes: ['sha256'],
            output: `${(global as any).__basedir}/src/server/config/assets.json`,
        }),

        new webpack.ProvidePlugin({
            process: 'process/browser',
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
