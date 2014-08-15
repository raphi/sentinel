var os = require('os');
var request = require('request');

// Central server that aggregates forwarder's data
var SERVER = 'http://0.0.0.0:8080'
// Collect and send data every X ms
var INTERVAL = 10000
// Identify the machine running this script
var FORWARDER_NAME = 'aws_2'


// Extract the command load average information
function broadcastLoadAvg() { 
  var loadAvg = os.loadavg();
  var load = loadAvg[0];

  console.log(load);

  forwardInfo(parseFloat(load));
}

// Send the info to the main server through HTTP request
function forwardInfo(loagAvg) {
  request.post({
    url: SERVER + '/collect',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: FORWARDER_NAME,
      load: loagAvg
    })
  }, function(error, response, body) {
    if (error) {
      console.error('Error: Main server down')
      return console.error(error);
    }
    
    console.log(FORWARDER_NAME + '(avg_load) = ' + loagAvg + ': ' + body);
  });
}

// Run this script infinitely
setInterval(broadcastLoadAvg, INTERVAL);