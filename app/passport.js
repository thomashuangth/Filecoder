module.exports = function(app) {
	
	var path = require('path');
	var passport = require('passport');
	var mongoose = require('mongoose');
	var expressSession = require('express-session');
	var LocalStrategy = require('passport-local').Strategy;
	var FacebookStrategy = require('passport-facebook').Strategy;
	var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
	var MongoStore = require('connect-mongo')(expressSession);

	var config = require('./config');
	var configAuth = require('./auth');

	app.use(expressSession({
		secret: 'TCsecret', 
		maxAge: new Date(Date.now() + 3600000),
		store: new MongoStore(
			{url: 'mongodb://' + config.mongoServer + '/' + config.databaseName},
			function(err) {
				console.log(err || '[x] Connect-Mongo Setup Ok');
			}
		),
		cookie: {}, 
		resave: true, 
		saveUninitialized: true }));
	app.use(passport.initialize());
	app.use(passport.session());

	// Load the models
	var model = require(path.join(__dirname, '/models', 'index.js'));
	var User = model.user;

	/*=================================== STRATEGY ===================================*/

	/*********************
	*** LOCAL STRATEGY ***
	*********************/

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(user, done) {
		done(null, user);
	});

	/*** LOGIN ***/

	passport.use('login', new LocalStrategy({
		usernameField : 'email',
        passwordField : 'password'
	},
	function(email, password, done) {
		process.nextTick(function() {
			// Auth Check Logic
			User.findOne({
				'local.email': email,
			}, function(err, user) {
				if (err) {
					console.log('Error in login'.red)
					return done(err);
				};
				if (!user) {
					console.log('No user found'.red);
					return done(null, false, { message: "No user found."});
				};
				if (!user.validPassword(password)) {
					console.log('Password does not match.'.red)
					return done(null, false, { message: "Password does not match"});
				};

				console.log('Login successful ! (User '.green + email + ') '.green  + new Date().toString().grey);
				return done(null, user.local);
			});
		});
	}));

	/*** REGISTER ***/

	passport.use('register', new LocalStrategy({
		usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true
	},
	function(req, email, password, done) {
		process.nextTick(function() {
			var profile = {id: 0, email: email, password: password, username: req.body.username}
			getUserOrCreateUser(profile, 'local', done);
		});
	}));
	

	/************************
	*** FACEBOOK STRATEGY ***
	************************/

	passport.use(new FacebookStrategy({
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL,
        profileFields: ['emails', 'name'],
        scope: ['public_profile', 'email']
    },
    function(token, refreshToken, profile, done) {
        process.nextTick(function() {
        	profile.token = token;
        	profile.refreshToken = refreshToken;
        	profile.email = profile.emails[0].value;
            getUserOrCreateUser(profile, 'facebook', done);
        });
    }));

	/**********************
	*** GOOGLE STRATEGY ***
	**********************/

	passport.use(new GoogleStrategy({

        clientID        : configAuth.googleAuth.clientID,
        clientSecret    : configAuth.googleAuth.clientSecret,
        callbackURL     : configAuth.googleAuth.callbackURL,

    },
    function(token, refreshToken, profile, done) {
        process.nextTick(function() {
        	profile.token = token;
        	profile.refreshToken = refreshToken;
        	profile.email = profile.emails[0].value;
            getUserOrCreateUser(profile, 'google', done);
        });
    }));

	/*=================================== METHODS ===================================*/

	function getUserOrCreateUser(profile, context, done) {
		User.findOne({
			$or: [
				{ 'local.email': profile.email },
				{ 'facebook.email': profile.email },
				{ 'google.email': profile.email}
			]
		},
		function (err, user) {
			if (err) {
				console.log('Error in registration'.red);
				return done(err);
			};
			if (user) {
				if (context == "facebook" && user.facebook.username ) {
					console.log('Login Facebook successful ! (User '.green + profile.email + ') '.green  + new Date().toString().grey);
					return done(null, user.facebook);
				} else if (context == "google" && user.google.username ) {
					console.log('Login Google successful ! (User '.green + profile.email + ') '.green  + new Date().toString().grey);
					return done(null, user.google);
				};
				console.log('User already exists'.red);
				return done(null, false, { message: "User already exists"});
			}
			
			var newUser = new User();

			if (context == "local") {
				newUser.local.email = profile.email;
				newUser.local.password = newUser.generateHash(profile.password);
				newUser.local.username = profile.username;
			} else if (context == "facebook") {
				console.log('Importing facebook user in database'.green)
				newUser.facebook.id    = profile.id;            
                newUser.facebook.token = profile.token;                    
                newUser.facebook.username  = profile.name.givenName + ' ' + profile.name.familyName;
                newUser.facebook.email = profile.email;
			} else if (context == "google") {
				console.log('Importing google user in database'.green)
				newUser.google.id    = profile.id;
                newUser.google.token = profile.token;
                newUser.google.username  = profile.displayName;
                newUser.google.email = profile.email;
			};

			newUser.save(function(err) {
				if (err) {
					console.log('Error in saving user'.red);
					return done(err);
				};

				if (context == "local") {
					console.log('Registration succesful (User '.green + profile.email + ') '.green + new Date().toString().grey);
					return done(null, newUser.local);
				} else if (context == "facebook") {
					console.log('Register Facebook successful ! (User '.green + newUser.facebook.email + ') '.green  + new Date().toString().grey);
                    return done(null, newUser.facebook);
				} else if (context == "google") {
					console.log('Register Google successful ! (User '.green + newUser.google.email + ') '.green  + new Date().toString().grey);
                    return done(null, newUser.google);
				};	
			});
		});
	}; /* End of function */


}