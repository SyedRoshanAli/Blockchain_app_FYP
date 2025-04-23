const { override, addWebpackPlugin, addWebpackAlias } = require('customize-cra');
const webpack = require('webpack');

module.exports = function override(config, env) {
    // Disable source-map-loader warnings
    config.module.rules = config.module.rules.filter(
        (rule) => !(rule.loader && rule.loader.includes('source-map-loader'))
    );
    
    // Add process and buffer polyfills
    config = addWebpackPlugin(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        })
    )(config);
    
    // Add polyfill aliases
    config = addWebpackAlias({
        'process': 'process/browser',
        'buffer': 'buffer',
    })(config);
    
    return config;
}; 