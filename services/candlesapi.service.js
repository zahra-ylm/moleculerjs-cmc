const ApiGateway = require("moleculer-web");


module.exports = {
    name: "candlesapi",
    mixins: [ApiGateway],    
   
    settings: {
        routes: [{
            aliases: {
                "GET candles": "candles.getcandles",
                "GET cryptocurrencies": "candles.lastestCryptocurrency",
            }
        }]
    }

};