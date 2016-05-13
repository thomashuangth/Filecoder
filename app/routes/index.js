var express = require('express');
var router = express.Router();
var path = require('path'); //Set absolute path
var model = require('../../app/models/index.js');
var passport = require('passport');
var User = model.user;

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
	})/*,
	function(req, res) {
		res.send(req.user.facebook);	
	}*/);

/******************
*** GOOGLE AUTH ***
*******************/

router.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

// the callback after google has authenticated the user
router.get('/auth/google/callback',
        passport.authenticate('google', {
            successRedirect : '/partials/after-auth.html?success',
			failureRedirect : '/partials/after-auth.html?failure'
        }));

/*************
*** ROUTES ***
**************/

router.get('/isAuth', isAuthenticated, function(req, res) {
	res.json(req.user);
})

router.get('/profil', isAuthenticated, function(req, res) {
	res.sendFile(path.join(__dirname, '../../public', 'index.html'));
	console.log('[Route] GET Profil'.cyan);
});

/* WHO AM I */
router.get('/whoami', isAuthenticated, function(req, res) {
	res.json(req.user);
})

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
}

function isNotAuthenticated(req, res, next) {
	console.log('Checking if user is not authenticated...');
	if (!req.isAuthenticated) {
		console.log('Authorized route ! !'.green);
		return next();
	};
	console.log("Forbidden route".red);
	res.redirect('/');
}

module.exports = router;