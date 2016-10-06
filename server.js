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
// mongoose.connect('mongodb://' + '' + ':' + '' + '@ds053146.mlab.com:53146/codefiasco-sites');

// Set root route
app.get('/', function (req, res) {
    res.render('pages/index');
});

// Redirect undefined routes to root
app.get('*', function (req, res) {
    res.redirect('/');
});

// Listen on previous set port
app.listen(port);