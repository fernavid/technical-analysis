var yahooFinance = require('yahoo-finance');
var processPrices = require('../lib/util').processPrices;
var getRandomWalk = require('../lib/util').getRandomWalk;

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};

exports.getPricing = function(req, res) {
    var ticker = req.params.ticker;
    var shortMA = req.params.short;
    var longMA = req.params.long;

    console.log('Retrieving simulation data for: ' + ticker + shortMA + longMA);
    yahooFinance.historical({
		symbol: ticker,
		from: '2008-1-1'
	}, function (err, quotes, url, symbol) {
	  	var reply = processPrices(quotes, symbol);
	  	res.send(reply);
	});
};

exports.getRandom = function(req, res) {
	yahooFinance.historical({
		symbol: 'SPY',
		from: '2008-01-01'
	}, function (err, quotes, url, symbol) {
	  	var bag = processPrices(quotes, symbol);
	  	var reply = getRandomWalk(bag.data);
	  	res.send(reply);
	});
};