var express = require("express");
var router = express.Router();
var path = require("path"); //Set absolute path
var model = require("../../app/models/index.js");
var passport = require("passport");
var User = model.user;
var Task = model.task;
var multer = require("multer");
var http = require('http');
var fs = require("fs");
var paypal = require('paypal-rest-sdk');

var config = require("../config");

"use strict";

/*****************
*** LOCAL AUTH ***
******************/

/* LOGIN */
router.get("/login", isNotAuthenticated, function(req, res) {
	console.log("[Route] GET Login".cyan);
	res.sendFile(path.join(__dirname, "../../public", "index.html"));
});

router.post("/login", function(req, res, next) {
	passport.authenticate("login", function(err, user, info) {
		console.log("[Route] POST Login".cyan);
		console.log(info);
		if (err) {
			return res.send(err);
		};
		if (!user) {
			return res.status(500).send(info.message);
		};

		req.login(user, function(err) {
			if (err) {
				return res.status(500).send(err);
			};
			return res.json(user);
		});
	})(req, res, next);
}, function(req, res) {
	res.json(req.user);
});

/* REGISTER */
router.get("/register", isNotAuthenticated, function(req, res) {
	console.log("[Route] GET Register".cyan);
	res.sendFile(path.join(__dirname, "../../public", "index.html"));
});

router.post("/register", function(req, res, next) {
	passport.authenticate("register", function(err, user, info) {
		console.log("[Route] POST Register".cyan);
		console.log(info);
		if (err) {
			return res.send(err);
		};
		if (!user) {
			return res.status(500).send(info.message);
		};

		req.login(user, function(err) {
			if (err) {
				return res.status(500).send(err);
			};
			return res.json(user);
		});
	})(req, res, next);
}, function(req, res) {
	res.json(req.user);
});

/* LOGOUT */
router.get("/logout", function(req, res) {
	console.log("[Route] POST Logout".cyan);
	req.logout();
	res.redirect("/");
});

/********************
*** FACEBOOK AUTH ***
*********************/

router.get("/auth/facebook", passport.authenticate("facebook"));

router.get("/auth/facebook/callback",
	passport.authenticate("facebook", {
		successRedirect : "/partials/after-auth.html?success",
		failureRedirect : "/partials/after-auth.html?failure"
	})
);

/******************
*** GOOGLE AUTH ***
*******************/

router.get("/auth/google", passport.authenticate("google", { scope : ["profile", "email"] }));

// the callback after google has authenticated the user
router.get("/auth/google/callback",
    passport.authenticate("google", {
        successRedirect : "/partials/after-auth.html?success",
		failureRedirect : "/partials/after-auth.html?failure"
    })
);

/*************
*** PAYPAL ***
**************/

paypalInit();

function paypalInit() {
	console.log('Paypal Initialisation');
	paypal.configure(config.paypal);
};

router.get('/paypal/create/:price', function(req, res) {
	console.log("[Route] GET Paypal create".cyan);
	var payment = {
		"intent": "sale",
		"payer": {
			"payment_method": "paypal"
		},
		"redirect_urls": {
			"return_url": "http://" + config.domain + ":" + config.serverPort + "/paypal/execute",
			"cancel_url": "http://" + config.domain + ":" + config.serverPort + "/paypal/cancel"
		},
		"transactions": [
        {
            "amount": {
                "total": req.params.price,
                "currency": "USD",
                "details": {
                    "subtotal": req.params.price,
                    "tax": "0.00",
                    "shipping": "0.00"
                }
            },
            "description": "Transcoder Conversion Payment.",
            "item_list": { 
                "items":[
                    {
                        "quantity":"1", 
                        "name":req.params.price + " Hour(s)", 
                        "price":req.params.price,
                        "currency":"USD"
                    }
                ]
            }
        }
    ]
	};
	paypalCreation(payment, req, res);
});

router.get('/paypal/execute', function(req, res) {
	console.log("[Route] GET Paypal execute".cyan);
	var paymentId = req.session.paymentId;
	var payerId = req.query.PayerID;
	var details = { "payer_id": payerId };

	paypal.payment.execute(paymentId, details, function (err, payment) {
		if (err) {
			console.log(err);
			console.log('Paypal execute error'.red);
			res.redirect('/partials/after-pay.html?failure');
		} else {
			console.log('Paypal execute success'.green);
			res.redirect('/partials/after-pay.html?success');
		};
	})
});

router.get('/paypal/cancel', function(req, res) {
	console.log("Paypal canceled".red);
	res.send("The payment got canceled");
});


function paypalCreation(payment, req, res) {
	paypal.payment.create(payment, function(err, payment) {
		if (err) {
			console.log(err);
			console.log("Paypal payment creation error".red);
		} else {
			if (payment.payer.payment_method === 'paypal') {
				
				req.session.paymentId = payment.id;
				var redirectUrl;
				for (var i = 0; i < payment.links.length; i++) {
					var link = payment.links[i];
					if (link.method === 'REDIRECT') {
						redirectUrl = link.href;
					};
				}

				res.redirect(redirectUrl);

			};
		};
	})
};

/***********
*** TASK ***
************/

router.get("/task/get/:id", isAuthenticated, function(req, res) {

	Task.findOne({_id: req.params.id}, function(err, task) {
		if (err) {
			console.log("Finding current task error".red);
			res.send(err);
		};
			
		if (task) {
			console.log(task.name + " found".green);
			
			res.json(task);
		};
	});

});

router.get("/task/get", isAuthenticated, function(req, res) {

	getTasksFromUser(req.user.email, res);

});

router.post("/task/create", isAuthenticated, function(req, res) {
	console.log("Creating new task...");
	var task = new Task({
		owner: req.user.email, 
		name: req.body.filename + " " + req.body.input + " to " + req.body.output, 
		output: req.body.output, 
		input: req.body.input, 
		type: req.body.type, 
		filename: req.body.filename,
		duration: req.body.duration,
		size: req.body.size
	});

	task.save(function(err){
		if (err) {
			console.log(err);
			res.send(err);
		} else {
			console.log(task.name + " has been created".green);
		};
	});
	
	checkDirectorySync(config.iscsiServer + "uploads/" + req.user.email);
	fs.rename(config.iscsiServer + "uploads/guest/" + task.filename, config.iscsiServer + "uploads/" + req.user.email + "/" + task.filename, function(err) {
	    if ( !err ) console.log("Upload of ".green + req.body.filename + " success !".green);
	});

	getTasksFromUser(req.user.email, res);

});

router.get("/task/update/:id", isAuthenticated, function(req, res) {
	Task.update({_id: req.params.id}, {status: "Paid", paid: true}, function(err){
		if (err) {
			console.log(err);
			console.log("Can't update the paid task".red);
		} else {
			console.log("The task is now paid".green);
			res.send("The task is now paid");
		};
	});
});

router.delete("/task/delete/:id", isAuthenticated, function(req, res) {

	Task.findOne({_id: req.params.id}, function(err, task) {
		if (err) {
			console.log("Finding current task error".red);
			res.send(err);
		};
			
		if (task) {
			console.log(task.name + " found".green);

			var folder = "uploads/";

			if (task.status == "converted") {
				folder = "converted/";
			};
			
			fs.unlinkSync(config.iscsiServer + folder + req.user.email + "/" + task.filename);
			Task.remove({_id: req.params.id, owner: req.user.email}, function(err){
				if (err) {
					console.log(err);
					res.send(err);
				} else {
					console.log("Task has been removed");
				};
			});

			getTasksFromUser(req.user.email, res);
		};
	});

});

function getTasksFromUser(email, res) {
	Task.find({owner: email}, null, {sort: {date: -1}}, function(err, tasks) {
		if (err)
			res.send(err);


		for (var i = 0; i < tasks.length; i++) {
			tasks[i].path = config.iscsiServer + "converted/" + tasks[i].owner + "/" + tasks[i].filename;
		};
		console.log(tasks);
		res.json(tasks);
	});
}

/*** UPLOAD ***/
	
router.post("/upload", function(req, res) {
	
	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			checkDirectorySync(config.iscsiServer + "tmp");
			cb(null, config.iscsiServer + "tmp/");
		},
		filename: function(req, file, cb) {
			cb(null, file.originalname);
		}
	});

	var upload = multer({storage: storage}).single("file");

	console.log("Upload process");
	upload(req, res, function(err) {
		"use strict";

		if (err) {
			console.log("Upload error".red);
			res.json({error_code: 1, err_desc: err});
			return;
		};

		Task.findOne({owner: req.body.username, name: req.body.filename + " " + req.body.input + " to " + req.body.output}, function(err, task) {
			if (err) {
				console.log("taskExistCheck Error".red);
			};
				
			if (task) {
				console.log(task.name + " already exists".red);
			};

			var filename = req.body.filename;
			var oldFilename = req.file.originalname;
			var copyNumber = 1;

			checkDirectorySync( config.iscsiServer + "uploads");
			checkFileExist(filename, filename, req.body.username, copyNumber, req, res, function(filename) {
				moveRename(filename, oldFilename, req.body.username, req, res);
			});
			

		});
	}); /* End of upload */

});

router.post("/download/url", function(req, res) {

	var filename = oldFilename = req.body.filename;
	var copyNumber = 1;

	checkDirectorySync( config.iscsiServer + "uploads");

	checkFileExist(filename, oldFilename, req.body.username, copyNumber, req, res, function(filename) {
		download(req.body.url, config.iscsiServer + "uploads/" + req.body.username + "/" + filename);
	});

	function download(url, dest, cb) {
		var file = fs.createWriteStream(dest);
		var request = http.get(url, function(response) {
			response.pipe(file);
			var len = parseInt(response.headers['content-length'], 10);
            var cur = 0;

            

			response.on("data", function(chunk) {
                cur += chunk.length;
                res.write("event: dl_url_percent\n");
      			res.write("data: " + (100.0 * cur / len).toFixed(2).toString() + "\n\n");
  				

			});

			file.on('finish', function() {
		  		file.close(cb);  // close() is async, call cb after close completes.
			});
		}).on('error', function(err) { // Handle errors
			fs.unlink(dest); // Delete the file async. (But we don't check the result)
			if (cb) cb(err.message);
		});
	};
});

/***************
*** CLASSICS ***
****************/

router.get("/isAuth", isAuthenticated, function(req, res) {
	res.json(req.user);
});

router.get("/profil", isAuthenticated, function(req, res) {
	res.sendFile(path.join(__dirname, "../../public", "index.html"));
	console.log("[Route] GET Profil".cyan);
});

router.get("/tasks", isAuthenticated, function(req, res) {
	res.sendFile(path.join(__dirname, "../../public", "index.html"));
	console.log("[Route] GET Tasks".cyan);
});

router.get("/pay", isAuthenticated, function(req, res) {
	res.sendFile(path.join(__dirname, "../../public", "index.html"));
	console.log("[Route] GET Pay".cyan);
});

router.get("/convert", isAuthenticated, function(req, res) {
	res.sendFile(path.join(__dirname, "../../public", "index.html"));
	console.log("[Route] GET Convert".cyan);
});

router.post("/converting", isAuthenticated, function(req, res) {
	console.log("[Route] POST Convert".cyan);
	console.log("Converting...");

	var filename = req.body.filename;
	var duration = req.body.duration; //In seconds
	var type = req.body.type;

	/* owner: 
	name
	output
	input 
	type
	filenam
	duration
	size
	paid
	date
	status
	*/

	var path = config.iscsiServer + "uploads/" + req.user.email + "/" + filename

	console.log(req.body);
	if (duration > 200) {
		console.log("Duration + 200");
		//SHELLJSSTUFF
	} else {
		console.log("Duration - 200");
		//SHELLJSSTUFF
	};

	//Change Tasks Status

	//Send mail
	
	//res.json(tasks);
});

/* WHO AM I */
router.get("/whoami", isAuthenticated, function(req, res) {
	res.json(req.user);
});

/**************
*** METHODS ***
***************/

function isAuthenticated(req, res, next) {
	console.log("Checking if user is authenticated...");
	if (req.isAuthenticated()) {
		console.log("Authorized route !".green)
		return next();
	};
	console.log("Forbidden route".red);
	res.sendStatus(401);
};

function isNotAuthenticated(req, res, next) {
	console.log("Checking if user is not authenticated...");
	if (!req.isAuthenticated()) {
		console.log("Authorized route ! !".green);
		return next();
	};
	console.log("Forbidden route".red);
};

function checkDirectorySync(directory) {
	try {
		console.log("Checking directory");
		fs.statSync(directory);
	} catch(e) {
		console.log("Creating directory : ".green + directory);
		fs.mkdirSync(directory);
	}
	console.log("Directory ".green + directory + " exists".green);
}

function checkFileExist(filename, oldFilename, username, copyNumber, req, res, callback) {
	if (copyNumber != 1) {
		filename = "(" + copyNumber + ")" + filename;
	};

	//Check if the file exist, Yes => Create a second, No => Just create
	fs.exists(config.iscsiServer + "uploads/" + username + "/" + filename, function(exists) {
		if (exists) {
			console.log(filename + " exists".red);
			copyNumber++;
			checkFileExist(oldFilename, oldFilename, username, copyNumber, req, res, callback);
		} else {
			console.log(filename + " does not exist".green);
			callback(filename);
		};
	});
		
}

function moveRename(filename, oldFilename, username, req, res) {
	checkDirectorySync(config.iscsiServer + "uploads/" + username);
	console.log(filename + " " + oldFilename);
	//Rename and move the file to the correct path
	fs.rename(config.iscsiServer + "tmp/" + oldFilename, config.iscsiServer + "uploads/" + username + "/" + filename, function(err) {
	    if ( err ) console.log("ERROR: " + err);
	    console.log("Upload of ".green + filename + " success !".green);
		res.json({error_code:0, err_desc: null, filename: filename});
	});
}

module.exports = router;