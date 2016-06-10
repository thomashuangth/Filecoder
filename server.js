(function(){
	'use strict';

	var express = require('express');
	var app = express();
	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});
	var mongoose = require('mongoose');
	var path = require('path'); //Set absolute path
	var bodyParser = require('body-parser');
	var routes = require('./app/routes/index');
	var colors = require('colors');

	var config = require('./app/config');

	var mongoServer = 'mongodb://' + config.mongoServer + '/' + config.databaseName/* + ',mongodb://' + config.mongoServer2 + ',mongodb://' + config.mongoServer3 + "/?replicaSet=myreplica"*/;
	
	mongoose.connect(mongoServer, function(err){
		if (err) {
			console.log('[/] Mongo DB connection error, trying another one...'.red);	
		} else {
			console.log('[x] Mongo DB connection succesful !'.green);		
		};
	})
	
	require('./app/passport')(app);

	app.use(express.static(__dirname + '/public'));
	app.use(bodyParser.urlencoded({'extended':'true'}));
	app.use(bodyParser.json());
	app.use(routes);

	app.get('*', function(req, res) {
		res.sendFile(path.join(__dirname, '/public', 'index.html'));
		console.log('[Route] *'.cyan);
	});

	app.listen(config.serverPort, "0.0.0.0", function() {
		console.log("\n*******************************************\n**".red + (" Transcoder is now online on port " + config.serverPort).yellow + " **\n*******************************************".red);		
		console.log(new Date().toString().grey + '\n');
	});
})();