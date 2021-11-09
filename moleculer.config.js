module.exports = {
    nodeID: null,
    logger: true,
    logLevel: "debug",
    
    cacher: {
        type: "memory",
        options: {
            ttl: 60, // 30 seconds
            maxParamsLength: 60
        }
    },

    apiPackageMode : 'Basic', //Basic or Production

    transporter: null,
    requestTimeout: 10 * 1000,

    circuitBreaker: {
        enabled: false
    },

    metrics: false,


};