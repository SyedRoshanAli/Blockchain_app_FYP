const webpack = require('webpack');
const path = require('path');
const { override, addWebpackAlias, addWebpackPlugin } = require('customize-cra');
const ProcessPolyfillPlugin = require('./process-polyfill-plugin');

module.exports = override(
  // Add webpack aliases for node polyfills
  addWebpackAlias({
    'crypto': require.resolve('crypto-browserify'),
    'stream': require.resolve('stream-browserify'),
    'buffer': require.resolve('buffer'),
    'http': require.resolve('stream-http'),
    'https': require.resolve('https-browserify'),
    'os': require.resolve('os-browserify/browser'),
    'process': require.resolve('process/browser'),
    'util': require.resolve('util'),
    'url': require.resolve('url'),
    'assert': require.resolve('assert'),
    'path': require.resolve('path-browserify')
  }),
  
  // Add webpack plugins
  addWebpackPlugin(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    })
  ),
  
  // Add our custom process polyfill plugin
  addWebpackPlugin(new ProcessPolyfillPlugin()),
  
  // Add DefinePlugin to define process in the global scope
  addWebpackPlugin(
    new webpack.DefinePlugin({
      'process': 'window.process',
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.browser': JSON.stringify(true)
    })
  ),
  
  // Custom webpack config
  (config) => {
    // Disable source-map-loader warnings
    config.module.rules = config.module.rules.filter(
      (rule) => !(rule.loader && rule.loader.includes('source-map-loader'))
    );
    
    // Add a rule to handle process/browser.js
    config.module.rules.push({
      test: /\/process\/browser\.js$/,
      use: {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]'
        }
      }
    });
    
    // Set resolve extensions
    config.resolve.extensions = [...config.resolve.extensions, '.ts', '.js', '.mjs'];
    
    // Configure babel-loader to include web3 libraries
    const babelRule = config.module.rules.find(
      (rule) => rule.loader && rule.loader.includes('babel-loader')
    );
    
    if (babelRule) {
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
    
    // Add node polyfills
    config.node = {
      module: 'empty',
      dgram: 'empty',
      dns: 'mock',
      fs: 'empty',
      http2: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty',
      process: true,
      Buffer: true
    };
    
    return config;
  }
);
