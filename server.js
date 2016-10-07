// This App requires process variables:
// PORT = port number
// MLUSER = username to connect to the db
// MLPW = password for the user
// CONSUMER_KEY = twitter OAuth consumer key
// CONSUMER_SECRET = twitter OAuth consumer secret
// SECRET = used to compute session hash

// Server port number
var port = process.env.PORT || 3000;

// Import express module and initiate express app
var express = require('express');
var app = express();

// Handle public files requests
app.use('/assets', express.static(__dirname + '/public'));

// Set EJS as template engine
app.set('view engine', 'ejs');

// Import mongoose and connect to database
var mongoose = require('mongoose');
mongoose.connect('mongodb://' + process.env.MLUSER + ':' + process.env.MLPW + '@ds053146.mlab.com:53146/codefiasco-sites');

// Set schemas for mongo db
var Schema = mongoose.Schema;

// Vote schema
var voteSchema = new mongoose.Schema({ ip: 'String' });

// Options schema
var optionSchema = new mongoose.Schema({ 
  text: String
});

// Poll schema
var pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  choices: [optionSchema],
  votes: [voteSchema],
  authorId: String
});

var Poll = mongoose.model('Poll', pollSchema);

// Setup authentication
var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;

passport.use(new Strategy({
        consumerKey: process.env.CONSUMER_KEY,
        consumerSecret: process.env.CONSUMER_SECRET,
        callbackURL: 'https://codefiasco-polls.herokuapp.com/login/twitter/return'
    },
    function(token, tokenSecret, profile, cb) {
        return cb(null, profile);
    }
));

// Configure Passport authenticated session persistence
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: process.env.SECRET, resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());



// ** Routes **

// Set root route
app.get('/', function (req, res) {
    res.render('pages/index', {
        user: req.user,
        polls: Poll.find({})
    });
});

// Twitter OAuth
app.get('/login/twitter', passport.authenticate('twitter'));

// Twitter OAuth Callback
app.get('/login/twitter/return', 
    passport.authenticate('twitter', { failureRedirect: '/' }),
    function(req, res) {
        res.redirect('/dashboard');
    });

// Log Out
app.get('/logout', function (req, res){
    req.session.destroy(function (err) {
        res.redirect('/');
    });
});

// User Dashboard
app.get('/dashboard',
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        res.render('pages/dashboard', { user: req.user });
    });

// New Poll
app.get('/new',
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        res.render('pages/new', {
            user: req.user,
            errors: null
        })
    });

app.post('/new',
    function (req, res) {
        res.send('Your input: ' + req.body.title + ';' + req.body.options)
    });

// Redirect undefined routes to root
app.get('*', function (req, res) {
    res.redirect('/');
});

// Listen on previous set port
app.listen(port);