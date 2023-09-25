// Define our dependencies
var express        = require('express');
var session        = require('express-session');
var passport       = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var request        = require('request');
var handlebars     = require('express-handlebars');
require('dotenv').config()


const TWITCH_CLIENT_ID = process.env.CLIENT_ID;
const TWITCH_SECRET    = process.env.CLIENT_SECRET;
const SESSION_SECRET   = process.env.SESSION_SECRET;
const CALLBACK_URL     = process.env.CALLBACK_URL;

const PORT = 8080;
const HOST = '0.0.0.0';

// Initialize Express and middlewares
var app = express();
app.use(session({secret: SESSION_SECRET, resave: false, saveUninitialized: false}));

app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './src')

app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());

// Override passport profile function to get user profile from Twitch API
OAuth2Strategy.prototype.userProfile = function(accessToken, done) {
  var options = {
    url: 'https://api.twitch.tv/helix/users',
    method: 'GET',
    headers: {
      'Client-ID': TWITCH_CLIENT_ID,
      'Accept': 'application/vnd.twitchtv.v5+json',
      'Authorization': 'Bearer ' + accessToken
    }
  };

  request(options, function (error, response, body) {
    if (response && response.statusCode == 200) {
      done(null, JSON.parse(body));
    } else {
      done(JSON.parse(body));
    }
  });
}

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

passport.use('twitch', new OAuth2Strategy({
    authorizationURL: 'https://id.twitch.tv/oauth2/authorize',
    tokenURL: 'https://id.twitch.tv/oauth2/token',
    clientID: TWITCH_CLIENT_ID,
    clientSecret: TWITCH_SECRET,
    callbackURL: CALLBACK_URL,
    state: true
  },
  function(accessToken, refreshToken, profile, done) {
    profile.accessToken = accessToken;
    profile.refreshToken = refreshToken;
    profile.user = profile.data[0]

    console.log(profile);
    console.log(profile);
    console.log(profile);

    done(null, profile);
  }
));

// Set route to start OAuth link, this is where you define scopes to request
app.get('/auth/twitch', passport.authenticate('twitch', { scope: 'chat:read chat:edit channel:read:redemptions channel:manage:redemptions moderator:manage:banned_users moderator:read:shoutouts moderator:manage:shoutouts moderator:read:chatters moderator:read:followers channel:edit:commercial channel:read:subscriptions' }));

// Set route for OAuth redirect
app.get('/auth/twitch/callback', passport.authenticate('twitch', { successRedirect: '/', failureRedirect: '/' }));


// If user has an authenticated session, display it, otherwise display link to authenticate
app.get('/', function (req, res) {
  if(req.session && req.session.passport && req.session.passport.user) {
    console.log(req.session)
    res.render('home', req.session.passport.user)
  } else {
    res.redirect('/auth/twitch');
  }
});

app.listen(PORT, HOST, function () {
  console.log(`Twitch auth listening on port ${HOST}:${PORT}!`)
});
