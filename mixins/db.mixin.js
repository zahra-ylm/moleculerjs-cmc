"use strict";

const DbService	= require("moleculer-db");

module.exports = function(collection) {
	
	// Mongo adapter
	const MongoDBAdapter = require("moleculer-db-adapter-mongo");

	return {
		mixins: [DbService],
		adapter: new MongoDBAdapter("mongodb://localhost/cryptocurrency"),
		collection
	};	
	
	
};

//cd C:\Program Files\MongoDB\Server\3.2\bin && mongod --storageEngine=mmapv1 --dbpath E:\nodejs\db