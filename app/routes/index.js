var express = require('express');
var router = express.Router();
var path = require('path'); //Set absolute path
var model = require('../../app/models/index.js');
var passport = require('passport');
var User = model.user;
var Task = model.task;
var multer = require('multer');
var fs = require('fs');

"use strict";
/*****************
*** LOCAL AUTH ***
******************/

/* LOGIN */
router.get('/login', isNotAuthenticated, function(req, res) {
	console.log('[Route] GET Login'.cyan);
	res.json(req.user);
});

router.post('/login', passport.authenticate('login'), function(req, res) {
	console.log('[Route] POST Login'.cyan);
	res.json(req.user);
});

/* REGISTER */
router.get('/register', isNotAuthenticated, function(req, res) {
	console.log('[Route] GET Register'.cyan);
	res.json(req.user);
});

router.post('/register', passport.authenticate('register'), function(req, res) {
	console.log('[Route] POST Register'.cyan);
	res.json(req.user);
});

/* LOGOUT */
router.get('/logout', function(req, res) {
	console.log('[Route] POST Logout'.cyan);
	req.logout();
	res.redirect('/');
});

/********************
*** FACEBOOK AUTH ***
*********************/

router.get('/auth/facebook', passport.authenticate('facebook'));

router.get('/auth/facebook/callback',
	passport.authenticate('facebook', {
		successRedirect : '/partials/after-auth.html?success',
		failureRedirect : '/partials/after-auth.html?failure'
	})
);

/******************
*** GOOGLE AUTH ***
*******************/

router.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

// the callback after google has authenticated the user
router.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect : '/partials/after-auth.html?success',
		failureRedirect : '/partials/after-auth.html?failure'
    })
);

/***********
*** TASK ***
************/

router.get('/task/get', isAuthenticated, function(req, res) {
	Task.find({owner: req.user.email}, function(err, tasks) {
		if (err)
			res.send(err);
		res.json(tasks);
	});
});

router.post('/task/create', isAuthenticated, function(req, res) {
	var task = new Task({owner: req.body.owner, name: req.body.name, output: req.body.output});

	task.save(function(err){
		if (err) {
			console.log(err);
		} else {
			console.log(task.name + " has been created");
		};
	});

	Task.find({owner: req.user.email}, function(err, tasks) {
		if (err)
			res.send(err);
		res.json(tasks);
	});
});

/*** UPLOAD ***/
	
router.post('/upload', isAuthenticated, function(req, res) {
	
	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			checkDirectorySync("./tmp");
			cb(null, './tmp/');
		},
		filename: function(req, file, cb) {
			
			console.log(file);
			cb(null, file.originalname);
		}
	});

	var upload = multer({storage: storage}).single('file');

	console.log('Upload process');
	upload(req, res, function(err) {
		"use strict";
		if (err) {
			console.log('Upload error'.red);
			res.json({error_code: 1, err_desc: err});
			return;
		};

		var filename = req.body.filename;
		var oldFilename = req.body.filename;
		var copyNumber = 1;

		checkFileExist();

		function checkFileExist() {
			console.log('Loop '+copyNumber);
			if (copyNumber != 1) {
				filename = "(" + copyNumber + ")" + req.body.filename;
			};
			//Check if the file exist, Yes => Create a second, No => Just create
			fs.exists(__dirname + '../../../uploads/' + req.user.email + '/' + filename, function(exists) {
				if (exists) {
					console.log(filename + ' exists'.red);
					copyNumber++;
					checkFileExist();
				} else {
					console.log(filename + ' does not exist'.green);
					moveRename();
				};
			});
				
		}

		function moveRename() {
			req.body.filename = filename;
			checkDirectorySync("./uploads/" + req.user.email);
			fs.rename('./tmp/' + req.file.originalname, './uploads/' + req.user.email + '/' + req.body.filename, function(err) {
			    if ( err ) console.log('ERROR: ' + err);
			    console.log('Upload of '.green + req.body.filename + ' success !'.green);
				res.json({error_code:0, err_desc: null});
			});
		}
			
	}); /* End of upload */

});

/***************
*** CLASSICS ***
****************/

router.get('/isAuth', isAuthenticated, function(req, res) {
	res.json(req.user);
});

router.get('/profil', isAuthenticated, function(req, res) {
	res.sendFile(path.join(__dirname, '../../public', 'index.html'));
	console.log('[Route] GET Profil'.cyan);
});

/* WHO AM I */
router.get('/whoami', isAuthenticated, function(req, res) {
	res.json(req.user);
});

/**************
*** METHODS ***
***************/

function isAuthenticated(req, res, next) {
	console.log('Checking if user is authenticated...');
	if (req.isAuthenticated()) {
		console.log('Authorized route !'.green)
		return next();
	};
	console.log("Forbidden route".red);
	res.sendStatus(401);
};

function isNotAuthenticated(req, res, next) {
	console.log('Checking if user is not authenticated...');
	if (!req.isAuthenticated) {
		console.log('Authorized route ! !'.green);
		return next();
	};
	console.log("Forbidden route".red);
	res.redirect('/');
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