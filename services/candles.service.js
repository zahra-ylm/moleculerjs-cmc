const axios = require('axios');
//const DbService = require("../mixins/db.mixin");
const APP_URL = 'https://pro-api.coinmarketcap.com/v1/';
const CANDLE_HISTORICAL_URL = 'cryptocurrency/ohlcv/historical';
const CRYPTOCURRENCY_LATEST_URL = 'cryptocurrency/listings/latest';
const QUOTES_LATEST_URL = 'cryptocurrency/quotes/latest';
const BASE_CURR = 'USD';

const MongoDBAdapter = require("moleculer-db-adapter-mongo");
const DbService = require("moleculer-db");

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

    settings: {
        $secureSettings     : ["CMC_PRO_API_KEY"],
        CMC_PRO_API_KEY : 'caed7c8d-c985-485e-8f8e-f1c2755f8eee',
    },

    mixins: [DbService],
    collection: "candles",
    adapter: new MongoDBAdapter("mongodb://localhost/cryptocurrency"),

    actions: {

        async cryptocurrencies(ctx) {
            
            var all_params = ['start','limit','price_min','price_max','volume_24h_min',
                    'volume_24h_max','circulating_supply_min','circulating_supply_max','percent_change_24h_min',
                    'percent_change_24h_max','convert','convert_id','sort','sort_dir','cryptocurrency_type','tag'];

            var query_params = {};
            var query_options = {};
            var query = {};

            //generate a cache key
            var cache_key = 'candles.cryptocurrencies'; 

            all_params.forEach(function (argument) {                    
                if(ctx.params[argument]){
                    
                    query_params[argument] = ctx.params[argument];                    
                    cache_key = cache_key + '|' +argument +'|' + query_params[argument];

                    //create query for search in data table
                    switch(argument){
                        case 'volume_24h_min':
                            query['volume_24h']={};
                            query['volume_24h'][`$gte`] = parseFloat(query_params[argument]);
                        break;
                        case 'volume_24h_max':
                            query['volume_24h'][`$lte`] = parseFloat(query_params[argument]);
                        break;
                        case 'price_min':
                            query['price']={};
                            query['price'][`$gte`] = parseFloat(query_params[argument]);
                        break;
                        case 'price_max':
                            query['price'][`$lte`] = parseFloat(query_params[argument]);
                        break;
                        case 'circulating_supply_min':
                            query['circulating_supply_min']={};
                            query['circulating_supply'][`$gte`] = parseFloat(query_params[argument]);
                        break;
                        case 'circulating_supply_max':
                            query['circulating_supply'][`$lte`] = parseFloat(query_params[argument]);
                        break;
                        case 'percent_change_24h_min':
                            query['percent_change_24h_min']={};
                            query['percent_change_24h'][`$gte`] = parseFloat(query_params[argument]);
                        break;
                        case 'percent_change_24h_max':
                            query['percent_change_24h'][`$lte`] = parseFloat(query_params[argument]);
                        break;
                        case 'limit':
                            query_options['limit'] = parseInt(query_params[argument]);
                        break;
                        case 'start':
                            query_options['offset'] = parseInt(query_params[argument]);
                        break;
                        case 'sort':
                            var sort_dir = (ctx.params['sort_dir'] == 'desc' )? '-':'';
                            query_options['sort'] = sort_dir+query_params[argument];
                        break;                        
                    }
                }
            });               

            // Get from cache (async)
            return await this.broker.cacher.get(cache_key).then(cache_data => {

                if(cache_data){
                    console.log('cache_data');
                    return cache_data;
                }

                //Get from DB

                return this.adapter.db.collection("currencies").find(query , query_options).toArray().then(db_data => {

                    console.log('database');                    

                    if(db_data.length != 0){

                        var response = {'status' : 'Success',data:db_data};
                        this.broker.cacher.set(cache_key, response ); 
                        return response;
                    }
                    else{
                    console.log('API');                    

                        // Get from API
                        return this.saveCryptocurrencyMethod(query_params,cache_key);
                
                    }
                });

            })
            .catch(err => {
                return err;
            });      
            
        },
        async quotes(ctx) {
            
            var query_params = {};
            var argument = '';            
            var query = {};

            //check query params
            if(ctx.params['id']){
                argument = query_params['id'] = ctx.params['id'];
                query['id'] = parseInt(ctx.params['id']);
            }
            else if(ctx.params['symbol']){
                argument = query_params['symbol'] = ctx.params['symbol'];
                query['symbol'] = ctx.params['symbol'];
            }
            else{
                return {'status' : 'Error','message':'At leaset one of id or symbol must be have value.'};
            }

            //generate a cache key
            var cache_key = 'candles.quotes' + '|' +argument ;

            // Get from cache (async)
            return await this.broker.cacher.get(cache_key).then(cache_data => {

                if(cache_data){
                    return cache_data;
                }

                //Get from DB
                
                return this.adapter.db.collection("quotes").find(query).toArray().then(db_data => {


                    if(db_data.length != 0){

                        var response = {'status' : 'Success',data:db_data};
                        this.broker.cacher.set(cache_key, response ); 
                        return response;
                    }
                    else{

                        // Get from API
                        return this.saveQuotesMethod(query_params,cache_key,argument);
                
                    }
                });

            })
            .catch(err => {
                return err;
            });      
            
        },
        
        getcandles : {
            
            handler(ctx){

                var query_params = this.candlesParams(ctx.params);   
                   
                var collection_name = this.candlesCollectionName(query_params);                           

                return this.adapter.db.collection(collection_name).find().toArray().then(db_data => {


                    if(db_data.length != 0){

                        var response = {'status' : 'Success',data:db_data};
                        return response;
                    }
                    else{

                        // Get from API
                        return this.saveCandlesMethod(query_params);
                
                    }
                });
            }            
        },
        async savecandles(ctx) {
            
            var query_params = this.candlesParams(ctx.params);
            
            var collection_name = this.candlesCollectionName(query_params);           
            
            return this.adapter.db.collection(collection_name).deleteMany().then(res =>{

                return this.saveCandlesMethod(query_params);                   
                
            });

            
        },
        async saveCryptocurrency(ctx) {

            return this.saveCryptocurrencyMethod();                   
        },
        async saveQuotes(ctx) {

            return this.saveQuotesMethod();                   
        }
    },
    methods: {

        async saveCandlesMethod(query_params) {
            
            const self = this;  
            var collection_name = this.candlesCollectionName(query_params);                       
            
            // Get from API
            return this.getFromApi(CANDLE_HISTORICAL_URL,query_params,true).then(response => {

                if(response.status == 'Success'){

                    var objects = [];
                    var symbol = response.data.symbol;
                    var trades = response.data.id;

                    response.data.quotes.map(function (argument) {
                
                        var currency = argument.quote[BASE_CURR];
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
                            "pair": BASE_CURR + "T_"+symbol+"_60"
                        }

                        objects.push(temp);

                    });

                    self.adapter.db.collection(collection_name).insertMany(objects);

                    response['data'] = objects;
                    
                }
                
                return response;                
                
            })
            .catch(err => {
                return err;
            });                           
            
        },
        saveCryptocurrencyMethod(query_params,cache_key){

            var self = this;

            // Get from API
            return this.getFromApi(CRYPTOCURRENCY_LATEST_URL,query_params,false).then(response => {

                if(response.status == 'Success'){

                    var payLoad = [];
                    response.data.map(function (argument) {   

                        var temp = {
                            id:argument.id,
                            "name": argument.name,
                            "symbol": argument.symbol,
                            "slug": argument.slug,
                            "circulating_supply": argument.circulating_supply,
                            "total_supply": argument.total_supply,
                            "price": argument.quote[BASE_CURR].price,
                            "volume_24h": argument.quote[BASE_CURR].volume_24h,
                            "volume_change_24h": argument.quote[BASE_CURR].volume_change_24h,
                            "percent_change_1h": argument.quote[BASE_CURR].percent_change_1h,
                            "percent_change_24h": argument.quote[BASE_CURR].percent_change_24h,
                            "percent_change_7d": argument.quote[BASE_CURR].percent_change_7d,
                            "percent_change_30d": argument.quote[BASE_CURR].percent_change_30d,
                            "percent_change_60d": argument.quote[BASE_CURR].percent_change_60d,
                            "percent_change_90d": argument.quote[BASE_CURR].percent_change_90d,
                            "last_updated": argument.quote[BASE_CURR].last_updated,
                        };

                        payLoad.push(temp);
                        
                    });

                    self.adapter.db.collection("currencies").insertMany(payLoad);
                    response['data'] = payLoad;
                    
                    if(cache_key){
                        this.broker.cacher.set(cache_key, response );    
                    }
                }
                return response;
                    
            })
            .catch(err => {
                return err;
            }); 

        },
        saveQuotesMethod(query_params,cache_key,argument){

            // Get from API
            return this.getFromApi(QUOTES_LATEST_URL,query_params,false).then(response => {
                
                if(response.status == 'Success'){

                    var data = response['data'][argument];
                    var payLoad = {
                        "id": data.id,
                        "name": data.name,
                        "symbol": data.symbol,
                        "slug": data.slug,
                        "circulating_supply": data.circulating_supply,
                        "total_supply": data.total_supply,
                        "max_supply": data.max_supply,
                        "last_updated": data.last_updated,
                        "price": data.quote[BASE_CURR].price,
                        "volume_24h": data.quote[BASE_CURR].volume_24h,
                        "volume_change_24h": data.quote[BASE_CURR].volume_change_24h,
                        "percent_change_1h": data.quote[BASE_CURR].percent_change_1h,
                        "percent_change_24h": data.quote[BASE_CURR].percent_change_24h,
                        "percent_change_7d": data.quote[BASE_CURR].percent_change_7d,
                        "percent_change_30d": data.quote[BASE_CURR].percent_change_30d,
                        "percent_change_60d": data.quote[BASE_CURR].percent_change_60d,
                        "percent_change_90d": data.quote[BASE_CURR].percent_change_90d,

                    };
                    response['data'] = payLoad;
                        
                    this.adapter.db.collection("quotes").insert(payLoad);
                    this.broker.cacher.set(cache_key, response );    
                }
                return response;
                
            })
            .catch(err => {
                return err;
            }); 
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
                    headers: {'X-CMC_PRO_API_KEY': this.settings.CMC_PRO_API_KEY}
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

            var all_params = ['id','slug','symbol','time_period','time_start','time_end','count','interval'];

            var query_params = {};

            all_params.forEach(function (argument) {                    
                if(ctx[argument]){
                    query_params[argument] = ctx[argument]
                }
            });

            if( !ctx['id'] && !ctx['slug'] && !ctx['symbol'] ){
                query_params['symbol'] = 'BTC';
            }

            query_params['time_period'] = (ctx.time_period && ctx.time_period == 'daily') ? ctx.time_period : 'hourly';

            return query_params;

        },
        candlesCollectionName(query_params){

            return BASE_CURR + "T_"+query_params['symbol']+"_60";           

        }       

    }
};