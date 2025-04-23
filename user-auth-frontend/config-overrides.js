const { addBabelPlugin } = require('customize-cra');

module.exports = function override(config, env) {
    // Disable source-map-loader warnings
    config.module.rules = config.module.rules.filter(
        (rule) => !(rule.loader && rule.loader.includes('source-map-loader'))
    );
    
    // Add Babel plugin for optional chaining
    config = addBabelPlugin('@babel/plugin-proposal-optional-chaining')(config);
    
    return config;
};
