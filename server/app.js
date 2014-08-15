var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var elasticsearch = require('elasticsearch');
var es = new elasticsearch.Client({
  host: 'localhost:9200'
});


// Constants
var SERVER_PORT = 8080
var AVERAGE_LOAD_ALERT = 2
var CHECK_LOAD_INTERVAL = 60000
var MACHINES_PATTERN = 'aws_2'


// Serve static files
app.use(express.static(__dirname + '/public/'));

// Use body parser to extract JSON
app.use(bodyParser.json());

// Collect fowarder's info and save it in ElasticSearch
app.post('/collect', function(req, res, next) {
	console.log(req.body);

	es.index({
  		index: 'datadog',
  		type: 'server_stats',
  		body: req.body
	}, function (error, response) {
		if (error) {
			console.error(error);
		} else {
			broadcastNewEvent(response._id);
		}
	});

	res.send(200);
	next();
});

// Broadcast machines stats to connected clients every X millisecond and check for alerts
setInterval(broadcastLoadAverageStats, CHECK_LOAD_INTERVAL);

// Handle a client's connection
io.on('connection', function (socket) {
	console.log('new user connected: ' + socket.id);

	broadcastLoadAverageStats();

	socket.on('get_init_data', function() {

		// ES search query: get all events for this specific index & type from the last 10 minutes
		es.search({
			index: 'datadog',
	  		type: 'server_stats',
	  		size: 500,
	  		fields: ['name', 'load', '_timestamp'],
	  		sort: '_timestamp',
	  		body: {
				query: {
					filtered: {
				    	filter: {
				        	range: {
				            	_timestamp: {
				                	gt: 'now-10m'
				               }
				            }
				         }
				      }
				   }
	  		}
		}).then(function(res) {
			handle_es_initial_dataset(socket, res);
		}, function(err) {
			console.trace(err.message);
		});
	});

});

// Format the ES results to an array of array of x & y coordinates
function handle_es_initial_dataset(socket, res) {
	var hits = res.hits.hits;
	var servers_stats = {};

	for (var i = 0; i < hits.length; i++) {
		var server_stat = hits[i].fields;

		if (!servers_stats[server_stat.name])
			servers_stats[server_stat.name] = [];

		servers_stats[server_stat.name].push({ y: server_stat.load[0], x: server_stat._timestamp });
	};

	// Send the formated data to the user
	socket.emit('initial_data', servers_stats);
	console.log(hits.length + ' data points sent');
}

// Search in ES the document by id 'doc_id' and broadcast the formated event to connected client for real-time events
function broadcastNewEvent(doc_id) {
	es.get({
		index: 'datadog',
  		type: 'server_stats',
  		fields: ['name', 'load', '_timestamp'],
  		id: doc_id
	}, function(error, result) {
		if (error) {
			console.error(error);
		} else {
			// Broadcast new server info to connected clients for real time events
			io.emit('real_time_event', { x:result.fields._timestamp, y:result.fields.load[0] });
			console.log('broadcasting new event');
		}
	});
}

// Get stats on server loads for the past 2mn
function broadcastLoadAverageStats() {
	es.search({
		size: 0,
		index: 'datadog',
	  	type: 'server_stats',
	  	body: {
		  	'query': {
			    'filtered': {
			    	'query' : {
			            'term' : { 'name' : MACHINES_PATTERN }
			        },
			        'filter': {
			            'range': {
			                '_timestamp': {
			                    'gt': 'now-2m'
			                }
			            }
			        }
			    }
			},
			'aggregations': {
			    'load_stats': {
			    	'stats': { 'field': 'load' }
			    }
			}	
	  	}
	}, function(error, result) {
		if (error) {
			console.error(error);
		} else {
			// Broadcast new server info to connected clients for real time events
			io.emit('stats_avg_load', result.aggregations.load_stats);
			console.log('broadcasting average load stats for machines: ' + MACHINES_PATTERN);
			checkLoadAverage(result.aggregations.load_stats.avg);
		}
	});
}

var overload = false;

// Check the average load value and broadcast alerts if needed
function checkLoadAverage(averageLoad) {
	if (averageLoad > AVERAGE_LOAD_ALERT) {
		io.emit('alert', { averageLoad:averageLoad, date:Date.now(), type:'danger' });
		console.log('high load alert sent: avg: ' + averageLoad);
		overload = true;
	} else if (overload) {
		overload = false;
		io.emit('alert', { averageLoad:averageLoad, date:Date.now(), type:'info' });
		console.log('recovery high load alert sent: avg: ' + averageLoad);
	}
}

// Start the server
server.listen(SERVER_PORT);
console.log('Server started on port ' + SERVER_PORT);