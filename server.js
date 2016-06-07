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
	/*var nodemailer = require('nodemailer');
	
	// create reusable transporter object using the default SMTP transport
	var transporter = nodemailer.createTransport('smtps://filecoder.transcode%40gmail.com:Supinf0pp@smtp.gmail.com');

	// setup e-mail data with unicode symbols
	var mailOptions = {
	    from: '"Test Tom 👥" <test@filecoder.com>', // sender address
	    to: 'thomashuang.th@gmail.com', // list of receivers
	    subject: 'Hello ✔', // Subject line
	    text: 'Hello world 🐴', // plaintext body
	    html: '<b>Hello world 🐴</b>' // html body
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			return console.log(error);
		}
		console.log('Message sent: ' + info.response);
	});*/
	var mongoServer = config.mongoServer;
	var serverNumber = 1;

	connectDB(mongoServer);

	function connectDB(mongoServer) {
		mongoose.connect('mongodb://' + config.mongoServer + '/' + config.databaseName, function(err){
			if (err) {
				console.log('[/] Mongo DB connection error, trying another one...'.red);	
				serverNumber++;
				connectDB(mongoServer+serverNumber)
			} else {
				console.log('[x] Mongo DB connection succesful !'.green);		
			};
		})
	};
	
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