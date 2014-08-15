var request = require('request');
var exec = require('child_process').exec;

// Central server that aggregates forwarder's data
var SERVER = 'http://0.0.0.0:8080'
// Collect and send data every X ms
var INTERVAL = 10000
// Identify the machine running this script
var FORWARDER_NAME = 'aws_2'


// Extract the command load average information
function loadAvgCallback(error, stdout, stderr) { 
  if (error)
    return console.error(error);

  var res = stdout.split(' ');

  forwardInfo(parseFloat(res[1]));
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
  }, function(error, response, body){
    if (error) {
      console.error('Error: Main server down')
      return console.error(error);
    }
    
    console.log(FORWARDER_NAME + '(avg_load) = ' + loagAvg + ': ' + body);
  });
}

// Run this script infinitely
setInterval(function() {
  exec('sysctl -n vm.loadavg', loadAvgCallback);
}, INTERVAL);