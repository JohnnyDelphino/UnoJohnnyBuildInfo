// dependencies
var https = require('https');
// requests serial or in parrallel
var async = require('async');
var util = require('util');
var fs = require("fs");

// read configuration sync
var configJSON = fs.readFileSync("config.json");
var config = JSON.parse(configJSON);
var teamcityHost = config.teamcityHost;
var teamcityPort = config.teamcityPort;
var tcProject = config.tcProject;
var tcUser = config.teamcityUser;
var tcPW = config.teamcityPassword;
var tcPollingInterval = config.tcPollingIntervalInSeconds * 1000;

var runningBuildsEndpoint = "";
if (tcUser == "guest"){
  runningBuildsEndpoint = '/guestAuth/app/rest/builds/?locator='+'project:' + tcProject + ',' + 'running:true';
} else {
  runningBuildsEndpoint = '/app/rest/builds/?locator='+'project:' + tcProject + ',' + 'running:true';
}

var latestBuildEndpoint = "";
if (tcUser == "guest"){
  latestBuildEndpoint = '/guestAuth/app/rest/builds/?locator='+'project:' + tcProject + ',' + 'count:1';
} else {
  latestBuildEndpoint = '/app/rest/builds/?locator='+'project:' + tcProject + ',' + 'count:1';
}

// STATES
var FETCHING_BUILD_CONFIGURATIONS = false;
var BUILDSTATE = -1 // 0 = red/failure, 1 = yellow/running, 2 = green/success

var getHttpOptions = function(endpoint){
  if(tcUser == "guest"){
    return {
        host: teamcityHost,
        port: teamcityPort,
        path: endpoint,
        method: 'GET',
        headers: {
          accept: 'application/json'
      }
    }
  } else {
    return {
        host: teamcityHost,
        port: teamcityPort,
        path: endpoint,
        auth: tcUser + ':' + tcPW,
        method: 'GET',
        headers: {
          accept: 'application/json'
      }
    }
  }
};

var animateSuccess = function(){
  console.log("SUCCESS");
};

var animateRunning = function(){
  console.log("RUNNING");
};

var animateFailure = function(){
  console.log("FAILURE");
};

var visualizeCurrentState = function(newState){
  console.log("visualizeCurrentState() called");
  // change BUILDSTATE if it differs from previous
  if (newState!=BUILDSTATE){
    console.log("BUILDSTATE changed");
    BUILDSTATE=newState;
    switch(BUILDSTATE) {
      // green/success
      case 2:
          animateSuccess();
          break;
      // yellow/running
      case 1:
          animateRunning();
          break;
      // red/failure
      default:
          animateFailure();
    };
  };
};

var fetchLatestBuild = function(){
  console.log("fetchLatestBuild() called");
  var httpOptions = getHttpOptions(latestBuildEndpoint);
  var request = https.request(httpOptions, function(response) {
      var content = "";
      // Handle data chunks
      response.on('data', function(chunk) {
          content += chunk;
      });
      // Once we're done streaming the response, parse it as json.
      response.on('end', function() {
          var data = JSON.parse(content);
          // check if you got one result
          if(data.count == 1){
            // console.log(util.inspect(data.build[0]));
            var build = data.build[0];

            switch (build.status) {
              case "FAILURE":
                {
                    // BUILDSTATE = 0;
                    visualizeCurrentState(0);
                }
                break;
              case "SUCCESS":
                {
                  // BUILDSTATE = 2;
                  visualizeCurrentState(2);
                }
                break;
              default:
              // ERROR
                {
                  // BUILDSTATE = 0;
                  visualizeCurrentState(0);
                }
            };
        };
      });
  });
  // Report errors
  request.on('error', function(error) {
      console.log("Error while calling endpoint.", error);
  });
  request.end();
};

var fetchRunningBuilds = function(){
  console.log("fetchRunningBuilds() called");
    var httpOptions = getHttpOptions(runningBuildsEndpoint);
    // console.log(util.inspect(httpOptions));
    var request = https.request(httpOptions, function(response) {
        var content = "";
        // Handle data chunks
        response.on('data', function(chunk) {
            content += chunk;
        });
        // Once we're done streaming the response, parse it as json.
        response.on('end', function() {
          // console.log(content);
            var data = JSON.parse(content);
            // console.log(util.inspect(data));
            var runningBuildCount = data.count;
            // check if builds are running
            if(runningBuildCount!=0){
              // BUILDSTATE = 1;
              visualizeCurrentState(1);
            } else {
              // get latestBuildStatus
              fetchLatestBuild();
            }
        });
    });
    // Report errors
    request.on('error', function(error) {
        console.log("Error while calling endpoint.", error);
    });
    request.end();
};

console.log("Started Script");

// Repeating Poll
setInterval(function () {
  fetchRunningBuilds();
}, tcPollingInterval);
