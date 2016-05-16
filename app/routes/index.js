var express = require("express");
var router = express.Router();
var path = require("path"); //Set absolute path
var model = require("../../app/models/index.js");
var passport = require("passport");
var User = model.user;
var Task = model.task;
var multer = require("multer");
var fs = require("fs");

var config = require("../config");

"use strict";
/*****************
*** LOCAL AUTH ***
******************/

/* LOGIN */
router.get("/login", isNotAuthenticated, function(req, res) {
	console.log("[Route] GET Login".cyan);
	res.json(req.user);
});

router.post("/login", passport.authenticate("login"), function(req, res) {
	console.log("[Route] POST Login".cyan);
	res.json(req.user);
});

/* REGISTER */
router.get("/register", isNotAuthenticated, function(req, res) {
	console.log("[Route] GET Register".cyan);
	res.json(req.user);
});

router.post("/register", passport.authenticate("register"), function(req, res) {
	console.log("[Route] POST Register".cyan);
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

/***********
*** TASK ***
************/

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
		filename: req.body.filename
	});

	task.save(function(err){
		if (err) {
			console.log(err);
			res.send(err);
		} else {
			console.log(task.name + " has been created".green);
		};
	});

	getTasksFromUser(req.user.email, res);

});

router.delete("/task/delete/:id", isAuthenticated, function(req, res) {

	Task.findOne({_id: req.params.id}, function(err, task) {
		if (err) {
			console.log("Finding current task error".red);
			res.send(err);
		};
			
		if (task) {
			console.log(task.name + " found".green);
			
			fs.unlinkSync(config.iscsiServer + "uploads/" + req.user.email + "/" + task.filename);
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
	Task.find({owner: email}, function(err, tasks) {
		if (err)
			res.send(err);
		res.json(tasks);
	});
}

/*** UPLOAD ***/
	
router.post("/upload", isAuthenticated, function(req, res) {
	
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

		Task.findOne({owner: req.user.email, name: req.body.filename + " " + req.body.input + " to " + req.body.output}, function(err, task) {
			if (err) {
				console.log("taskExistCheck Error".red);
			};
				
			if (task) {
				console.log(task.name + " already exists".red);
				res.json({error_code: 1, err_desc: task.name + " already exists"});
				return;
			};

			var filename = req.body.filename;
			var oldFilename = req.body.filename;
			var copyNumber = 1;

			checkDirectorySync( config.iscsiServer + "uploads");
			checkFileExist();

			function checkFileExist() {
				if (copyNumber != 1) {
					filename = "(" + copyNumber + ")" + req.body.filename;
				};

				//Check if the file exist, Yes => Create a second, No => Just create
				fs.exists(config.iscsiServer + "uploads/" + req.user.email + "/" + filename, function(exists) {
					if (exists) {
						console.log(filename + " exists".red);
						copyNumber++;
						checkFileExist();
					} else {
						console.log(filename + " does not exist".green);
						moveRename();
					};
				});
					
			}

			function moveRename() {
				req.body.filename = filename;
				checkDirectorySync(config.iscsiServer + "uploads/" + req.user.email);

				//Rename and move the file to the correct path
				fs.rename(config.iscsiServer + "tmp/" + req.file.originalname, config.iscsiServer + "uploads/" + req.user.email + "/" + req.body.filename, function(err) {
				    if ( err ) console.log("ERROR: " + err);
				    console.log("Upload of ".green + req.body.filename + " success !".green);
					res.json({error_code:0, err_desc: null});
				});
			}
		});
	}); /* End of upload */

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
	if (!req.isAuthenticated) {
		console.log("Authorized route ! !".green);
		return next();
	};
	console.log("Forbidden route".red);
	res.redirect("/");
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

module.exports = router;