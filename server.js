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
mongoose.connect('mongodb://' + process.env.MLUSER + ':' + process.env.MLPW + '@ds053216.mlab.com:53216/codefiasco-voting');

// Set schemas for mongo db
var Schema = mongoose.Schema;

// Vote schema
var voteSchema = new mongoose.Schema({ ip: 'String' });

// Options schema
var optionSchema = new mongoose.Schema({ 
  option: String,
  votes: Number
});

// Poll schema
var pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  choices: [optionSchema],
  votedIps: [voteSchema],
  authorId: String
});

var Poll = mongoose.model('Poll', pollSchema);

// Setup authentication
var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;

passport.use(new Strategy({
        consumerKey: process.env.CONSUMER_KEY || CONSUMER_KEY,
        consumerSecret: process.env.CONSUMER_SECRET || CONSUMER_SECRET,
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
app.use(require('express-session')({ secret: process.env.SECRET || SECRET, resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());



// ** Routes **

// Set root route
app.get('/', function (req, res) {
    Poll.find({}, function (err, polls) {
        res.render('pages/index', {
        user: req.user,
        polls: polls
        });
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
        Poll.find({ authorId: req.user.id}, function (err, polls) {
            res.render('pages/dashboard', {
            user: req.user,
            polls: polls
            });
        });
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
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        var errors = [];
        var arrayOfOptions;

        if(!req.body.title){
            errors.push('Title required;')
        }

        if (!req.body.options) {
            errors.push('Options required;');
        }
        else{
             arrayOfOptions = req.body.options.split('#@#');

            if (arrayOfOptions.length < 2) {
                errors.push('Enter at least 2 options');
            }
        }
        

        if (errors.length > 0) {
            res.render('pages/new', {
                user: req.user,
                errors: errors
                });
        }
        else{
            var options = []

            for (var i=0; i < arrayOfOptions.length; i++) {
                var opt = {
                    option: arrayOfOptions[i],
                    votes: 0
                }

                options.push(opt);
            }

            var newPoll = Poll({
                question: req.body.title,
                choices: options,
                votes: [],
                authorId: req.user.id
            });

            newPoll.save(function (err) {
                if (err) throw err;
                
                console.log('New Poll Saved!');

                res.redirect('/dashboard');
            });
        }
        
    });

app.get('/poll/:id', function (req, res) {
    Poll.findById(req.params.id, function (err, poll) {
        if (err) throw err;
        res.render('pages/poll', {
            user: req.user,
            poll: poll,
            errors: null
        });
    });    
});

app.post('/poll', function (req, res) {
    Poll.findById(req.body.pollId, function (err, poll) {
        if (err) throw err;
        
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        var lookup = {};
        for (var i = 0, len = poll.votedIps.length; i < len; i++) {
            lookup[poll.votedIps[i].ip] = poll.votedIps[i];
        }
        
        if (!lookup[ip]) {

            poll.choices[req.body.optionIdx].votes += 1;
            poll.votedIps.push({ ip: ip });
            
            poll.save(function (err) {
                if (err) throw err;

                res.redirect('/poll/' + req.body.pollId);
            });
        }
        else {
            res.render('pages/poll', {
                user: req.user,
                poll: poll,
                errors: ['You already voted;']
            });
        }
    });    
});

app.post('/poll/delete',
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        Poll.findById(req.body.pollId, function (err, poll) {
            if (err) throw err;
            
            if (req.user.id != poll.authorId) {
                res.redirect('/poll/' + req.body.pollId);
            }
            else {
                poll.remove(function () {
                    res.redirect('/dashboard');
                });
            }
        }); 
    });

app.post('/poll/add',
    require('connect-ensure-login').ensureLoggedIn(),
    function (req, res) {
        Poll.findById(req.body.pollId, function (err, poll) {
            if (err) throw err;

            if (!req.user) {
                res.redirect('/poll/' + req.body.pollId);
            }
        
            var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

            var lookup = {};
            for (var i = 0, len = poll.votedIps.length; i < len; i++) {
                lookup[poll.votedIps[i].ip] = poll.votedIps[i];
            }
            
            if (!lookup[ip]) {
                var opt = {
                    option: req.body.option,
                    votes: 1
                };

                poll.choices.push(opt);
                poll.votedIps.push({ ip: ip });
                
                poll.save(function () {
                    res.redirect('/poll/' + req.body.pollId);
                });
            }
            else {
                res.render('pages/poll', {
                    user: req.user,
                    poll: poll,
                    errors: ['You already voted;']
                });
            }
        }); 
    });


// Redirect undefined routes to root
app.get('*', function (req, res) {
    res.redirect('/');
});

// Listen on previous set port
app.listen(port);