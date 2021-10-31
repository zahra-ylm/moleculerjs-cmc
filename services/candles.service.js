const axios = require('axios');
const DbService = require("../mixins/db.mixin");
const APP_URL = 'https://pro-api.coinmarketcap.com/v1/';
const CANDLE_HISTORICAL_URL = 'cryptocurrency/ohlcv/historical';
const CRYPTOCURRENCY_LATEST_URL = 'cryptocurrency/listings/latest';

var sample_response = {
    "data": {
        "id": 1,
        "name": "Bitcoin",
        "symbol": "BTC",
        "quotes": [
            {
                "time_open": "2019-01-02T00:00:00.000Z",
                "time_close": "2019-01-02T23:59:59.999Z",
                "time_high": "2019-01-02T03:53:00.000Z",
                "time_low": "2019-01-02T02:43:00.000Z",
                "quote": {
                    "USD": {
                        "open": 3849.21640853,
                        "high": 3947.9812729,
                        "low": 3817.40949569,
                        "close": 3943.40933686,
                        "volume": 5244856835.70851,
                        "market_cap": 68849856731.6738,
                        "timestamp": "2019-01-02T23:59:59.999Z"
                    }
                }
            },
            {
                "time_open": "2019-01-03T00:00:00.000Z",
                "time_close": "2019-01-03T23:59:59.999Z",
                "time_high": "2019-01-02T03:53:00.000Z",
                "time_low": "2019-01-02T02:43:00.000Z",
                "quote": {
                    "USD": {
                        "open": 3931.04863841,
                        "high": 3935.68513083,
                        "low": 3826.22287069,
                        "close": 3836.74131867,
                        "volume": 4530215218.84018,
                        "market_cap": 66994920902.7202,
                        "timestamp": "2019-01-03T23:59:59.999Z"
                    }
                }
            }
        ]
    },
    "status": {
        "timestamp": "2021-10-26T02:23:50.887Z",
        "error_code": 0,
        "error_message": "",
        "elapsed": 10,
        "credit_count": 1
    }

};

module.exports = {
    name: "candles",
    mixins: [DbService("candles")],

    actions: {

        async lastestCryptocurrency(ctx) {
            
            var all_params = ['start','limit','price_min','price_max','market_cap_min','market_cap_max','volume_24h_min',
                    'volume_24h_max','circulating_supply_min','circulating_supply_max','percent_change_24h_min',
                    'percent_change_24h_max','convert','convert_id','sort','sort_dir','cryptocurrency_type','tag','aux'];

            var query_params = {};

            //generate a cache key
            var cache_key = 'candles.lastestCryptocurrency'; 

            all_params.forEach(function (argument) {                    
                if(ctx.params[argument]){
                    
                    query_params[argument] = ctx.params[argument];                    
                    cache_key = cache_key + '|' +argument +'|' + query_params[argument];
                }
            });               

            // Get from cache (async)
            return await this.broker.cacher.get(cache_key).then(cache_data => {

                if(!cache_data){

                    return this.getFromApi(CRYPTOCURRENCY_LATEST_URL,query_params,false).then(response => {

                        if(response.status == 'Success'){
                            this.broker.cacher.set(cache_key, response );    
                        }
                        return response;
                        
                    })
                    .catch(err => {
                        return err;
                    }); 

                }
                else{
                    return cache_data;
                }


            })
            .catch(err => {
                return err;
            });      
            
        },
        getcandles : {

            cache: {
                //  generate cache key
                keys: ['limit']
            },
            async handler(ctx) {
                
                var limit = ctx.params.limit ? ctx.params.limit : 10;
                limit = parseInt(limit);

                return this.adapter.find({
                    limit:limit,
                });
            }            
            
        },
        async savecandles(ctx) {
            
            const self = this;
            var query_params = this.candlesParams(ctx.params);

            return this.getFromApi(CANDLE_HISTORICAL_URL,query_params,true).then(response => {

                if(response.status == 'Success'){
                    return this.saveResponse(response.data,self);   
                }
                else{
                    return response;
                }
                
            })
            .catch(err => {
                return err;
            });                           
            
        }
    },
    methods: {

        saveResponse(response, self) {

            var objects = [];
            var symbol = response.symbol;
            var trades = response.id;

            response.quotes.map(function (argument) {
                
                var currency = argument.quote['USD'];
                var time = new Date(currency['timestamp']).getTime() / 1000;
                var time_open = new Date(argument['time_open']).getTime() / 1000;

                var temp = {
                    "time": time,
                    "start": time_open,
                    "open": currency['open'],
                    "high": currency['high'],
                    "low": currency['low'],
                    "close": currency['close'],
                    "volume": currency['volume'],
                    "trades": trades,
                    "pair": "USDT_"+symbol+"_60"
                }

                objects.push(temp);

                self.adapter.insert(temp);
            });

            return objects;
        },
        async getFromApi(url,query_params,is_candle){

            var payLoad = {status : 'Success'};

            if( this.broker.options.apiPackageMode == 'Basic' && is_candle ){

                var response = sample_response.data;
                payLoad['data'] = response;
                
                return payLoad;
                
            }
            else{

                return await axios({
                    method: 'get',
                    url: APP_URL + url ,
                    params: query_params,
                    headers: {'X-CMC_PRO_API_KEY': this.broker.options.CMC_PRO_API_KEY}
                })
                .then(res => {

                    const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
                    const response = res.data.data;

                    payLoad['data'] = response;
                    return payLoad;                    

                })
                .catch(err => {
                    return {'status' : 'Error', 'message' : err.message };
                });                

            }

        },
        candlesParams(ctx){

            var all_params = ['id','slug','symbol','time_period','time_start','time_end','count',
                    'interval','convert','convert_id','skip_invalid'];

            var query_params = {};

            all_params.forEach(function (argument) {                    
                if(ctx[argument]){
                    query_params[argument] = ctx[argument]
                }
            });

            if(ctx['id'] == '' && ctx['slug'] =='' && ctx['symbol'] == ''){
                query_params['symbol'] = 'BTC';
            }

            query_params['time_period'] = (ctx.time_period && ctx.time_period == 'daily') ? ctx.time_period : 'hourly';

            return query_params;

        },

    }
};