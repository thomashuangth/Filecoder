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

	mongoose.connect('mongodb://127.0.0.1/transcoder', function(err){
		if (err) {
			console.log('[!] Mongo DB connection error...'.red, err);
		} else {
			console.log('[x] Mongo DB connection succesful !'.green);		
		};
	})
	
	require('./app/passport')(app);

	app.use(express.static(__dirname + '/public'));
	app.use(bodyParser.urlencoded({'extended':'true'}));
	app.use(bodyParser.json());
	app.use(routes);


	

/*	app.get("/get", function(request, response) {
		Customer.find(function(err, customers) {
			if (err) {
				return console.error(err);
			};
			response.json(customers);
		});
	});

	app.post("/add", function(request, response) {
		var customer = new Customer({name: request.body.name, age: request.body.age});

		customer.save(function(err){
			if (err) {
				console.log(err);
			} else {
				console.log(customer.name + " has been added");
			};
		});

		Customer.find(function(err, customers) {
			if (err)
				res.send(err);
			response.json(customers);
		});
	});

	app.get("/update/:name", function(request, response) {
		Customer.update({name: request.params.name}, {age: 22}, function(err){
			if (err) {
				console.log(err);
			} else {
				console.log(request.params.name + " has been updated");
			};
		});
	});

	app.delete("/delete/:id", function(request, response) {
		Customer.remove({_id: request.params.id}, function(err){
			if (err) {
				console.log(err);
			} else {
				console.log(request.params.name + " has been removed");
			};
		});

		Customer.find(function(err, customers) {
			if (err)
				res.send(err);
			response.json(customers);
		})
	});

	app.get("/get/:name", function(request, response) {

		Customer.findOne({name: request.params.name}, function(err, customer) {
			if (err) {
				return console.error(err);
			};
			response.json(customer);
		});
	});*/

	app.get('*', function(req, res) {
		res.sendFile(path.join(__dirname, '/public', 'index.html'));
		console.log('[Route] *'.cyan);
	});
	var port = 3000;
	app.listen(port, "0.0.0.0", function() {
		console.log("\n*******************************************\n**".red + (" Transcoder is now online on port " + port).yellow + " **\n*******************************************".red);		
		console.log(new Date().toString().grey + '\n');
	});
})();