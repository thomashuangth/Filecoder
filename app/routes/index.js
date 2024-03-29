var express = require("express");
var router = express.Router();
var path = require("path"); //Set absolute path
var model = require("../../app/models/index.js");
var passport = require("passport");
var User = model.user;
var Task = model.task;
var Queue = model.queue;
var multer = require("multer");
var http = require('http');
var fs = require("fs");
var paypal = require('paypal-rest-sdk');
var nodemailer = require('nodemailer');
var SSH = require("simple-ssh");

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

	console.log("\nGetting one task...");
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
	console.log("\nCreating new task...");

	var status = "Pending";
	var paid = false;

	if (req.body.input == "AVI" || req.body.input == "TS") {
		status = "Paid";
		paid = true;
	};

	var task = new Task({
		owner: req.user.email, 
		name: req.body.filename + " " + req.body.input + " to " + req.body.output, 
		output: req.body.output, 
		input: req.body.input, 
		type: req.body.type, 
		filename: req.body.filename,
		originalname: req.body.filename.split('.')[0],
		duration: req.body.duration,
		size: req.body.size,
		status: status,
		paid: paid,
		path: "nfs/converted/" + req.user.email + "/" + req.body.filename.split('.')[0] + "." + req.body.output.toLowerCase()
	});

	task.save(function(err){
		if (err) {
			console.log(err);
			res.send(err);
		} else {
			console.log(task.name + " has been created".green);
		};
	});
	
	checkDirectorySync(config.storageServer + "uploads/" + req.user.email);
	fs.rename(config.storageServer + "uploads/guest/" + task.filename, config.storageServer + "uploads/" + req.user.email + "/" + task.filename, function(err) {
	    if ( !err ) console.log("Upload of ".green + req.body.filename + " success !".green);
	});

	getTasksFromUser(req.user.email, res);

});

router.get("/task/update/:id", isAuthenticated, function(req, res) {
	console.log("\n Updating task...");
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

	console.log("\n Deleting task...");
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
			
			fs.unlinkSync(config.storageServer + folder + req.user.email + "/" + encodeURI(task.filename));
			Task.remove({_id: req.params.id, owner: req.user.email}, function(err){
				if (err) {
					console.log(err);
					res.send(err);
				} else {
					console.log("Task has been removed".green);
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


		/*for (var i = 0; i < tasks.length; i++) {
			tasks[i].filename = decodeURI(tasks[i].filename);
			var originalname = tasks[i].filename.split('.')[0];
			tasks[i].path = config.storageServer + "converted/" + tasks[i].owner + "/" + originalname + "." + tasks[i].output.toLowerCase();
		};*/

		res.json(tasks);
	});
}

/*** UPLOAD ***/
	
router.post("/upload", function(req, res) {
	
	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			checkDirectorySync(config.storageServer + "tmp");
			cb(null, config.storageServer + "tmp/");
		},
		filename: function(req, file, cb) {
			cb(null, file.originalname);
		}
	});

	var upload = multer({storage: storage}).single("file");

	console.log("\nUpload process");
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

			checkDirectorySync( config.storageServer + "uploads");
			checkFileExist(filename, filename, req.body.username, copyNumber, req, res, function(filename) {
				moveRename(filename, oldFilename, req.body.username, req, res);
			});
			

		});
	}); /* End of upload */

});

router.post("/download/url", function(req, res) {

	var filename = oldFilename = req.body.filename;
	var copyNumber = 1;
	console.log("URL : " + req.body.url);

	checkURL(req.body.url, function(response) {
		console.log("\nChecking URL");
		if (response) {
			console.log("Good URL".green);
			checkDirectorySync(config.storageServer + "uploads");
			checkDirectorySync(config.storageServer + "uploads/guest");
			checkDirectorySync(config.storageServer + "uploads/" + req.body.username);

			checkFileExist(filename, oldFilename, req.body.username, copyNumber, req, res, function(filename) {
				download(req.body.url, config.storageServer + "uploads/" + req.body.username + "/" + encodeURI(filename));
			});
		} else {
			console.log("Wrong URL".red);
			res.status(500).send("Wrong URL");
		};
	});

	function checkURL(Url, callback) {
        var http = require('http'),
            url = require('url');
        var options = {
            method: 'HEAD',
            host: url.parse(Url).host,
            port: 80,
            path: url.parse(Url).pathname
        };
        var req = http.request(options, function (r) {
            callback( r.statusCode == 200);
        });

        req.on('error', function(err) {
        	callback(false);
        })
        req.end();
    }

	function download(url, dest, cb) {
		var file = fs.createWriteStream(dest);
		var request = http.get(url, function(response) {
			response.pipe(file);
			var len = parseInt(response.headers['content-length'], 10);
            var cur = 0;

			response.on("data", function(chunk) {
                cur += chunk.length;
                /*res.write("event: dl_url_percent\n");
      			res.write("data: " + (100.0 * cur / len).toFixed(2).toString() + "\n\n");*/
  				
			});

			file.on('finish', function() {
		  		file.close(cb);  // close() is async, call cb after close completes.
		  		var stats = fs.statSync(config.storageServer + "uploads/" + req.body.username + "/" + encodeURI(filename));
		  		res.json(stats);
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

router.post("/converting", function(req, res) {
	console.log("[Route] GET Converting".cyan);

	var file = queue = null;

	if (req.body._id) {
		var file = {
			taskId : req.body._id,
			filename: req.body.filename,
			path: req.body.path,
			owner: req.user.email,
			output: req.body.output, 
			input: req.body.input,
			duration: req.body.duration,
			type: req.body.type
		};
		var queue = new Queue(file);
	};

	checkQueue(file, queue);

	function checkQueue(file, queue) {

		console.log("\nChecking queue...");
		//Checking if tasks in queue
		Queue.find({}, function(err, queues) {
			if (err)
				res.send(err);

			//Tasks found in queue
			if (queues.length > 0) {
				//Proccessing oldest task first
				file = queues[0];
				console.log("There are tasks in queue".red);
				if (queue) {
					//Checking if task already in queue
					Queue.find({owner: queue.owner, filename: queue.filename}, function(err, currentQueue) {
						if (err)
							res.send(err);

						//Already in queue
						if (currentQueue.length > 0) {
							console.log("Already in queue".red);
						} else {
							//Adding task in queue
							queue.save(function(err){
								if (err) {
									console.log(err);
									res.send(err);
								} else {
									console.log("New task has been added in queue".green);
								};
							});

							res.send("inQueue");
						};	
					});
				} else {
					console.log("\nFilecoding...");
					if (file) {
						filecode(file);	
					};
				};
				
			} else {
				console.log("Nothing in queue !".green);
				if (queue) {
					//Adding task in queue
					queue.save(function(err){
						if (err) {
							console.log(err);
							res.send(err);
						} else {
							console.log("New task has been added in queue".green);
						};
					});	
				};
				
				if (file) {
					console.log("\nFilecoding...");
					filecode(file);	
				} else {
					console.log("Queue has been cleared !".green);
					res.send("empty");
				};
			};
		});
	};

	function filecode(file) {

		var ssh = new SSH({
			host: config.ssh.host,
			user: config.ssh.user,
			pass: config.ssh.pass
		});

		var cmd = "sleep 5 && ls";

		/*var ssh = new SSH({
			host: '192.168.75.40',
			user: 'root',
			pass: 'supinfo'
		})
		var cmd = "python brain.py " + file.owner + " " + file.filename + " " + file.output;

		if (file.type == 'audio'){
			cmd = cmd + " 1";
		}
		else
		{		
			if (file.duration > 200) {
				cmd = cmd + " 8";
			} 
			else if (file.duration > 100) {
				cmd = cmd + " 4";
			}
			else if (file.duration > 50) {
				cmd = cmd + " 3";
			}
			else if (file.duration > 20) {
				cmd = cmd + " 2";
			}
			else {
				cmd = cmd + " 1";
			}
		}*/

		ssh.on('error', function(err) {
			console.log("Connect SSH Manager 1 failed : ".red + err);
		    ssh = new SSH({
				host: config.ssh.host2,
				user: config.ssh.user,
				pass: config.ssh.pass
			});
			sshConnect(ssh, cmd);
		});
		
		sshConnect(ssh, cmd);

		function sshConnect(ssh, cmd) {
			console.log("NOW CONVERTING ".green + file.filename);
			ssh.exec(cmd, {
				out: function(stdout) {
					console.log(stdout);
				},
				err: function(stderr) {
			        console.log(stderr); // this-does-not-exist: command not found
			    },
				exit: function(code) {
					console.log("========== EXIT ==========");
					console.log(code);

					Queue.remove({taskId: file.taskId}, function(err){
						if (err) {
							console.log(err);
							res.send(err);
						} else {
							console.log("Task removed from queue".green);

							//Change Tasks Status
							Task.update({_id: file.taskId}, {status: "Converted"}, function(err){
								if (err) {
									console.log(err);
									console.log("Can't update the converted task".red);
								} else {
									console.log("The task is now converted".green);
									sendEmail(file.owner, file.path);
									res.send("converted");
								};
							});
						};
					});

					
				}
			}).start();
		}
		
	};

	function sendEmail(email, downloadLink) {
		//Send mail
		var transporter = nodemailer.createTransport('smtps://filecoder.transcode%40gmail.com:Supinf0pp@smtp.gmail.com');

		var html = "<html style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><head style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><meta content=\"width=device-width\"style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'name=viewport><meta content=\"text\/html; charset=UTF-8\"style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'http-equiv=Content-Type><title style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'>Filecoder Team<\/title><body bgcolor=#f6f6f6 style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0;-webkit-font-smoothing:antialiased;height:100%;-webkit-text-size-adjust:none;width:100%!important\'><table style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:20px;width:100%\'class=body-wrap bgcolor=#f6f6f6><tr style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><td style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><td style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0 auto!important;padding:20px;border:1px solid #f0f0f0;clear:both!important;display:block!important;max-width:600px!important\'class=container bgcolor=#FFFFFF><div class=content style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0 auto;padding:0;display:block;max-width:600px\'><table style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0;width:100%\'><tr style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><td style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><p style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6em;margin:0;padding:0;font-weight:400;margin-bottom:10px\'>Hi there,<p style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6em;margin:0;padding:0;font-weight:400;margin-bottom:10px\'>Our team of workers have finished working on your file<h2 style=\'font-family:\"Helvetica Neue\",Helvetica,Arial,\"Lucida Grande\",sans-serif;font-size:28px;line-height:1.2em;margin:40px 0 10px;padding:0;color:#111;font-weight:200\'>Your can now download your file !<\/h2><p style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6em;margin:0;padding:0;font-weight:400;margin-bottom:10px\'>Just click the link below, log in, choose your video and download it.<table style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0;margin-bottom:10px;width:auto!important\'class=btn-primary border=0 cellpadding=0 cellspacing=0><tr style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><td style=\'font-family:\"Helvetica Neue\",Helvetica,Arial,\"Lucida Grande\",sans-serif;font-size:14px;line-height:1.6em;margin:0;padding:0;background-color:#348eda;border-radius:25px;text-align:center;vertical-align:top\'><a href='http://filecoder.com/" + downloadLink + "' style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:2;margin:0;padding:0;color:#fff;background-color:#348eda;border:solid 1px #348eda;border-radius:25px;border-width:10px 20px;display:inline-block;cursor:pointer;font-weight:700;text-decoration:none\'>Download your file here<\/a><\/table><p style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6em;margin:0;padding:0;font-weight:400;margin-bottom:10px\'>Thanks, have a lovely day.<p style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6em;margin:0;padding:0;font-weight:400;margin-bottom:10px\'><a href=http:\/\/www.filecoder.com style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0;color:#348eda\'>Filecoder<\/a><\/table><\/div><td style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><\/table><table style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0;width:100%;clear:both!important\'class=footer-wrap><tr style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><td style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><td style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0 auto!important;padding:0;clear:both!important;display:block!important;max-width:600px!important\'class=container><div class=content style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0 auto;padding:0;display:block;max-width:600px\'><table style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0;width:100%\'><tr style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><td style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'align=center><p style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6em;margin:0;padding:0;font-weight:400;margin-bottom:10px;color:#666\'>Don\\\'t like these annoying emails? <a href=# style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0;color:#999\'><unsubscribe style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'>Unsubscribe<\/unsubscribe><\/a>.<\/table><\/div><td style=\'font-family:\"Helvetica Neue\",Helvetica,Helvetica,Arial,sans-serif;font-size:100%;line-height:1.6em;margin:0;padding:0\'><\/table>"
		// setup e-mail data with unicode symbols
		var mailOptions = {
		    from: '"Filecoder Team" <filecoder.transcode@filecoder.com>',
		    to: 'thomashuang.th@gmail.com',
		    subject: 'Your file conversion is complete !',
		    text: 'Your file conversion is complete !',
		    html: html
		};
		var test = '<a href="http://filecoder.com/"' + downloadLink + '>here</a>';
		// send mail with defined transport object
		transporter.sendMail(mailOptions, function(error, info){
			if(error){
				return console.log(error);
			}
			console.log('Message sent: ' + info.response);
		});
	};	
	
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
	console.log("\nChecking if user is authenticated...");
	if (req.isAuthenticated()) {
		console.log("Authorized route !".green)
		return next();
	};
	console.log("Forbidden route".red);
	res.sendStatus(401);
};

function isNotAuthenticated(req, res, next) {
	console.log("\nChecking if user is not authenticated...");
	if (!req.isAuthenticated()) {
		console.log("Authorized route ! !".green);
		return next();
	};
	console.log("Forbidden route".red);
};

function checkDirectorySync(directory) {
	try {
		console.log("\nChecking directory");
		fs.statSync(directory);
	} catch(e) {
		console.log("Creating directory : ".green + directory);
		fs.mkdirSync(directory);
	}
	console.log("Directory ".green + directory + " exists".green);
}

function checkFileExist(filename, oldFilename, username, copyNumber, req, res, callback) {
	if (copyNumber != 1) {
		filename = filename.split(".")[0] + "_" + copyNumber + "." + filename.split(".").pop();
	};

	//Check if the file exist, Yes => Create a second, No => Just create
	fs.exists(config.storageServer + "uploads/" + username + "/" + encodeURI(filename), function(exists) {
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
	checkDirectorySync(config.storageServer + "uploads/" + username);

	//Rename and move the file to the correct path
	fs.rename(config.storageServer + "tmp/" + oldFilename, config.storageServer + "uploads/" + username + "/" + encodeURI(filename), function(err) {
	    if ( err ) console.log("ERROR: " + err);
	    console.log("Upload of ".green + filename + " success !".green);

		res.json({error_code:0, err_desc: null, filename: filename});
	});
}

module.exports = router;