export const assets = 'public/assets/[name].[hash].[ext]';

export const patterns = [
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
];

export const splitChunks = {
    chunks: 'all',
    maxInitialRequests: Infinity,
    minSize: 0,
    cacheGroups: {
        carbon_angular: {
            test: /[\\/]node_modules[\\/](carbon-components-angular)[\\/]/,
            name: 'carbon_angular',
            reuseExistingChunk: true,
        },
        carbon: {
            test: /[\\/]node_modules[\\/](@carbon)[\\/]/,
            name: 'carbon',
            reuseExistingChunk: true,
        },
        vendor: {
            test: /[\\/]node_modules[\\/](!carbon-components-angular)(!@carbon)[\\/]/,
            name: 'vendor',
            reuseExistingChunk: true,
        },
        default: {
            reuseExistingChunk: true,
            minChunks: 2,
            priority: -20,
        },
    },
};
