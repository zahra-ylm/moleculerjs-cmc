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
    CMC_PRO_API_KEY : 'caed7c8d-c985-485e-8f8e-f1c2755f8eee',

    transporter: null,
    requestTimeout: 10 * 1000,

    circuitBreaker: {
        enabled: false
    },

    metrics: false,


};