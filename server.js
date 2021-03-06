'use strict';

require('dotenv').config();

var express = require('express');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var passport = require('passport');
//var util = require('util');
var bunyan = require('bunyan');
var config = require('./config');
//var ProfileApi = require('./apis/profiles');
var RegistrantsApi = require('./apis/registrants');
var TokenApi = require('./apis/token');
const appInsights = require('applicationinsights');

if (config.AppInsights) {
	appInsights.setup(config.AppInsights)
		.setAutoDependencyCorrelation(true)
		.setAutoCollectRequests(true)
		.setAutoCollectPerformance(true)
		.setAutoCollectExceptions(true)
		.setAutoCollectDependencies(true)
		.setAutoCollectConsole(true, true)
		.setUseDiskRetryCaching(true)
		.start();
}

// Controllers
var profiles = require('./controllers/profilesController');
var registrants = require('./controllers/registrantsController');
var token = require('./controllers/tokenController');

var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

var log = bunyan.createLogger({
	name: 'MCSC: Child Finder'
});

passport.serializeUser(function (user, done) {
	done(null, user.oid);
});

passport.deserializeUser(function (oid, done) {
	findByOid(oid, function (err, user) {
		done(err, user);
	});
});

var users = [];

var findByOid = function (oid, fn) {
	for (var i = 0, len = users.length; i < len; i++) {
		var user = users[i];
		if (user.oid === oid) {
			return fn(null, user);
		}
	}
	return fn(null, null);
};

passport.use(new OIDCStrategy({
	identityMetadata: config.creds.identityMetadata,
	clientID: config.creds.clientID,
	responseType: config.creds.responseType,
	responseMode: config.creds.responseMode,
	redirectUrl: config.creds.redirectUrl,
	allowHttpForRedirectUrl: config.creds.allowHttpForRedirectUrl,
	clientSecret: config.creds.clientSecret,
	validateIssuer: config.creds.validateIssuer,
	isB2C: config.creds.isB2C,
	issuer: config.creds.issuer,
	passReqToCallback: config.creds.passReqToCallback,
	scope: config.creds.scope,
	loggingLevel: config.creds.loggingLevel,
	nonceLifetime: config.creds.nonceLifetime,
	nonceMaxAmount: config.creds.nonceMaxAmount,
	useCookieInsteadOfSession: config.creds.useCookieInsteadOfSession,
	cookieEncryptionKeys: config.creds.cookieEncryptionKeys,
	clockSkew: config.creds.clockSkew
},
function (iss, sub, profile, accessToken, refreshToken, done) {
	if (!profile.oid) {
		return done(new Error('No oid found'), null);
	}
	// asynchronous verification, for effect...
	process.nextTick(function () {
		findByOid(profile.oid, function (err, user) {
			if (err) {
				return done(err);
			}
			if (!user) {
				// "Auto-registration"
				users.push(profile);
				return done(null, profile);
			}
			return done(null, user);
		});
	});
}
));

var app = express();
app.set('view engine', 'ejs');
app.use(express.logger());
app.use(methodOverride());
app.use(cookieParser());
app.use(express.static('public'));
app.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: false }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

function disableCaching(res) {
	res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
	res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
	res.setHeader("Expires", "0"); // Proxies.
}

function ensureAuthorized(req, res, next) {
	if (req.isAuthenticated()) {
		console.log('User is authenticated');
		// User is authenticated, ensure they are authorized
		if (userIsAuthorized(req.user)) {
			return next();
		}
		res.redirect('/unauthorized');
		return;
	}
	res.redirect('/login');
};

// Verifies that the user is authorized to use this application
// Defaults to validating that the user belongs to the configured AAD group
function userIsAuthorized(user) {
	if (user._json && user._json.groups && user._json.groups.indexOf(config.requiredAADGroupId) > -1) {
		return true;
	};

	log.info('!!! User: ' + user._json.preferred_username + ' is not authorized to access this application.')
	return false;
};

function ensureAuthorizedOrToken(req, res, next) {
	if (req.query.access_token != null) {
		var token = req.query.access_token;
		var id = req.params.id;
		new TokenApi().verify(id, token).then(
			function () {
				return next();
			},
			function () {
				console.error('Error verifying token');
				return ensureAuthorized(req, res, next)
			})
			.catch(function (err) {
				console.error('There was an error!', err.statusText);
				return ensureAuthorized(req, res, next)
			});
	} else {
		return ensureAuthorized(req, res, next);
	}
};

// LOGIN
app.get('/login/aad', function (req, res, next) {
	passport.authenticate('azuread-openidconnect',
		{
			response: res,
			failureRedirect: '/'
		}
	)(req, res, next);
},
function (req, res) {
	res.redirect('/');
});

app.get('/login', function (req, res) {
	res.render('login', {user: req.user});
});

// AAD / PASSPORT
app.get('/auth/openid/return',
	function (req, res, next) {
		passport.authenticate('azuread-openidconnect',
			{
				response: res,
				failureRedirect: '/'
			}
		)(req, res, next);
	},
	function (req, res) {
		log.info('We received a return from AzureAD.');
		res.redirect('/');
	});

app.post('/auth/openid/return',
	function (req, res, next) {
		passport.authenticate('azuread-openidconnect',
			{
				response: res,                      // required
				failureRedirect: '/'
			}
		)(req, res, next);
	},
	function (req, res) {
		log.info('We received a return from AzureAD.');
		res.redirect('/');
	});

app.get('/logout', function (req, res) {
	req.session.destroy(function (err) {
		if (err) {
			console.log('Error destroying session: ', err);
		}
		req.logOut();
		res.redirect(config.destroySessionUrl);
	});
});

app.get('/unauthorized', function (req, res) {
	res.status(401);
	res.render('unauthorized', {user: req.user});
});

// HOMEPAGE
app.get('/', ensureAuthorized, function (req, res) {
	disableCaching(res);
	res.render('index', { user: req.user});
});

// PROFILE
app.get('/profile/:id', ensureAuthorizedOrToken, profiles.show);

// REGISTRANTS
app.get('/registrants', ensureAuthorizedOrToken, function (req, res) {
	disableCaching(res);
	res.render('registrants', { user: req.user});
});


// ERROR HANDLER
const HTTP_SERVER_ERROR = 500;
app.use(function(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.status || HTTP_SERVER_ERROR).render('error', { err: err });
});

// APIS
app.get('/api/profiles', ensureAuthorized, profiles.list);
app.get('/api/registrants', ensureAuthorized, registrants.list);
app.put('/api/notify', ensureAuthorized, token.send);
app.post('/api/notify', ensureAuthorized, token.send);

app.listen(config.Port);