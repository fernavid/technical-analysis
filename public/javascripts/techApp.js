var techApp = angular.module('techApp', []);

var _round = Math.round;
Math.round = function(number, decimals)
{
	if (arguments.length == 1)
	return _round(number);

	var multiplier = Math.pow(10, decimals);
	return _round(number * multiplier) / multiplier;
}

function getAnnualizedReturn(strat){
	var numYears = strat.length/252;
	var rat = strat[strat.length-1].y / strat[0].y;
	return Math.round((Math.pow(rat, 1/numYears) - 1) * 100, 2);
}

function makeChart(benchmark, shortMA, longMA, strategy, symbol){
    var data = [
        {
            key: symbol,
            values: benchmark
        },
    ];
    if(shortMA){
    	data.push({
    		key: "Short MA",
            values: shortMA
    	});
    }
    if(longMA){
    	data.push({
    		key: "Long MA",
            values: longMA
    	});
    }
    if(strategy){
    	data.push({
    		key: "Strategy",
            values: strategy
    	});
    }
    nv.addGraph(function() {
      var chart = nv.models.lineWithFocusChart();

      chart.xAxis
          .tickFormat(function(d) {
            return d3.time.format('%x')(new Date(d))
          });

      chart.x2Axis
          .tickFormat(function(d) {
            return d3.time.format('%x')(new Date(d))
          });

      chart.yAxis
          .tickFormat(d3.format(',.2f'));

      chart.y2Axis
          .tickFormat(d3.format(',.2f'));

      d3.select('#chart svg')
          .datum(data)
        .transition().duration(0)
          .call(chart);

      nv.utils.windowResize(chart.update);

      return chart;
    });
}

techApp.controller('techAppCtrl', function($scope, $http){
	$scope.loading = false;
	$scope.notloaded = true;
	$scope.stock = {performance:'N/A'};
	$scope.indicator = {
		longMA: '',
		shortMA: '',
		performance: 'N/A'
	};

	$scope.getRandom = function(){
		$scope.loading = true;
		$scope.notloaded = false;
		$scope.ticker = "Random Walk";
		$http.get('/random').success(function(data) {
			var times = data.data.map(function(d){
					return {x: d.date, y: d.close};	
				});
			$scope.priceData = times;
			makeChart(times, null, null, null, data.ticker);
			$scope.loading = false;
		});
	};

	$scope.loadPrices = function(stock){
		$scope.loading = true;
		$scope.notloaded = false;
		$scope.stock = angular.copy(stock);
		$http.get('/prices/'+$scope.stock.ticker).success(function(data) {
			var times = data.data.map(function(d){
					return {x: d.date, y: d.close};	
				});
			$scope.priceData = times;
			makeChart(times, null, null, null, $scope.stock.ticker);
			$scope.loading = false;
		});
	};

	$scope.validateParams = function(){
		var error = {};
		if(!$scope.indicator.shortMA){
			error.shortMA = "You need to enter a short term MA";
		}
		if(!$scope.indicator.longMA){
			error.longMA = "You need to enter a long term MA";
		}
		if(!$scope.priceData){
			error.priceData = "You need to load some pricing";
		}
		if($scope.indicator.shortMA > $scope.indicator.longMA){
			error.priceData = "Long MA must be longer than Short MA";
		}
		if(Object.keys(error).length > 0){
			alert(JSON.stringify(error));
			$scope.loading = false;
			throw error;
		}
	}

	$scope.addSMA = function(indicator){
		$scope.loading = true;
		$scope.indicator = angular.copy(indicator);
		$scope.indicator.shortMA = parseInt(indicator.shortMA);
		$scope.indicator.longMA = parseInt(indicator.longMA);

		$scope.validateParams();

		var rawIndex = $scope.priceData.map(function(d){
			return d.y;
		});
		var shortDates = $scope.priceData.map(function(d){
			return d.x;
		});
		var longDates = $scope.priceData.map(function(d){
			return d.x;
		});
		rawIndex = rawIndex.toVector();
		var shortSmoothed = rawIndex.sma($scope.indicator.shortMA);
		var longSmoothed = rawIndex.sma($scope.indicator.longMA);

		shortDates.splice(0, $scope.indicator.shortMA);
		longDates.splice(0, $scope.indicator.longMA);
		$scope.shortSmoothed = shortDates.map(function(d, idx){
			return {
				x: d,
				y: shortSmoothed[idx]
			};
		});
		$scope.longSmoothed = longDates.map(function(d, idx){
			return {
				x: d,
				y: longSmoothed[idx]
			};
		});
		makeChart($scope.priceData, $scope.shortSmoothed, $scope.longSmoothed, null, $scope.stock.ticker);
		$scope.loading = false;
	};

	$scope.backtest = function(){
		if(!$scope.priceData || !$scope.shortSmoothed || !$scope.longSmoothed){
			alert("Did you miss a step? Data is missing!");
		}
		else{
			$scope.loading = true;
			var shortSmoothed = $scope.shortSmoothed.map(function(d){
				return d.y;
			}).toVector();
			var longSmoothed = $scope.longSmoothed.map(function(d){
				return d.y;
			}).toVector();
			//data alignment
			var toTrim = $scope.indicator.longMA - $scope.indicator.shortMA;
			
			shortSmoothed.splice(0,toTrim).toVector();
			var spread = shortSmoothed.subtract(longSmoothed);
			spread.extend({
			    binary: function() {
			        return this.map(function(d){
			        	return d > 0 ? 1 : -1;
			        });
			    }
			});
			//1 when we are in the market, -1 when we are out
			signals = spread.binary();

			var rawIndex = $scope.priceData.map(function(d){
					return d.y;
				});
			var dates = $scope.priceData.map(function(d){
				return d.x;
			});
			dates.shift();
			rawIndex = rawIndex.toVector();
			var returns = rawIndex.delta();
			rawIndex.shift();
			returns = returns.divide(rawIndex).add(1);

			//align signals with market
			toTrim = returns.length - signals.length;
			dates.splice(0, toTrim);
			returns.splice(0, toTrim);
			var cumulative = rawIndex[toTrim];
			var result = _.map(returns,function(num, idx){ 
			    cumulative *= signals[idx] > 0 ? num : 1;
			    return cumulative;
			});
			$scope.strategy = dates.map(function(d, idx){
				return {
					x: d,
					y: result[idx]
				};
			});
			makeChart($scope.priceData, $scope.shortSmoothed, $scope.longSmoothed, $scope.strategy, $scope.stock.ticker);
			
			//performance stats
			$scope.indicator.performance = getAnnualizedReturn($scope.strategy);
			$scope.stock.performance = getAnnualizedReturn($scope.priceData);

			$scope.loading = false;
		}
	}
});