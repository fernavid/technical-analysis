var _ = require("underscore");
var gauss = require('gauss');

//simplifies response from yahoo finance api
exports.processPrices = function(input, ticker){
	var timeseries = input.map(function(d){
		return {
			date: d.date.getTime(),
			close: d.close
		}
	});
	return {
		ticker: ticker,
		data: timeseries
	}
}

exports.getRandomWalk = function(data){
	var rawIndex = data.map(function(d){
		return d.close;
	});
	var dates = data.map(function(d){
		return d.date;
	});
	dates.shift();
	rawIndex = rawIndex.toVector();
	var returns = rawIndex.delta();
	rawIndex.shift();
	returns = returns.divide(rawIndex).add(1);
	var shuffled = _.shuffle(returns);
	var cumulative = 100;
	var result = _.map(shuffled,function(num){ 
	    cumulative *= num;
	    return cumulative;
	});
	var randomWalk = dates.map(function(d, idx){
		return {
			date: d,
			close: result[idx]
		};
	});
	return {
		ticker: 'Random Walk',
		data: randomWalk
	}
}