
/**
 * Module dependencies.
 */

var express = require('express');
var exphbs  = require('express3-handlebars')

var routes = require('./routes');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars')
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(request, response) {
	var readFile = "views/index.html";
	var fileContents = require('fs').readFileSync(readFile);

	response.send(fileContents.toString());
});
app.get('/prices/:ticker', routes.getPricing)
app.get('/random', routes.getRandom)

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
