const webpack = require('webpack');
const path = require('path');

module.exports = function override(config, env) {
    // Disable source-map-loader warnings
    config.module.rules = config.module.rules.filter(
        (rule) => !(rule.loader && rule.loader.includes('source-map-loader'))
    );
    
    // Add node polyfills using webpack.ProvidePlugin
    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer']
        })
    );

    // Add polyfills
    config.resolve.alias = {
        ...config.resolve.alias,
        'crypto': require.resolve('crypto-browserify'),
        'stream': require.resolve('stream-browserify'),
        'buffer': require.resolve('buffer')
    };

    // Set resolve extensions to catch all JS files
    config.resolve.extensions = [...config.resolve.extensions, '.ts', '.js', '.mjs'];

    // Configure babel-loader to include web3 libraries
    const babelRule = config.module.rules.find(
        (rule) => rule.loader && rule.loader.includes('babel-loader')
    );
    
    if (babelRule) {
        // Instead of excluding web3, we'll modify the exclude pattern to process web3 libraries
        babelRule.exclude = function(modulePath) {
            // Include web3 modules for transpilation
            if (modulePath.includes('node_modules/web3')) {
                return false;
            }
            // Exclude other node_modules
            if (modulePath.includes('node_modules')) {
                return true;
            }
            return false;
        };
    }
    
    return config;
};
