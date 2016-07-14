// Why Javascript?
// Atwood's Law: Any application that can be written in Javascript, will eventually be written in Javascript.
// - Jeff Atwood, July 17, 2007
//
// Copyright 2016 Christian Schäfer

// ################### dependencies #############################
var http = require('http');
var fs = require("fs");
var five = require("johnny-five");

// ################### init configuration #############################
var configJSON = fs.readFileSync("config.json");
var config = JSON.parse(configJSON);
var teamcityHost = config.teamcityHost;
var teamcityPort = config.teamcityPort;
var tcProject = config.tcProject;
var tcUser = config.teamcityUser;
var tcPW = config.teamcityPassword;
var tcPollingInterval = config.tcPollingIntervalInSeconds * 1000;

var observeSingleBuildType = config.observeSingleBuildType; // boolean that indicates if only a single buildType should be polled (instead of all BuildTypes of Project)
var tcBuildType = config.tcBuildType; // the single buildType to observe

var runningBuildsEndpoint = "";
if (tcUser == "guest"){
  runningBuildsEndpoint = '/guestAuth/app/rest/builds/?locator='+'project:' + tcProject + ',' + 'running:true';
  // override Endpoint if just a single BuildConfig should be observed instead of whole project
  if (observeSingleBuildType == true){
    runningBuildsEndpoint = '/guestAuth/app/rest/builds/?locator='+'buildType:' + tcBuildType + ',' + 'running:true';
  }
} else {
  runningBuildsEndpoint = '/app/rest/builds/?locator='+'project:' + tcProject + ',' + 'running:true';
  // override Endpoint if just a single BuildConfig should be observed instead of whole project
  if (observeSingleBuildType == true){
    runningBuildsEndpoint = '/app/rest/builds/?locator='+'buildType:' + tcBuildType + ',' + 'running:true';
  }
}

var latestBuildEndpoint = "";
if (tcUser == "guest"){
  latestBuildEndpoint = '/guestAuth/app/rest/builds/?locator='+'project:' + tcProject + ',' + 'count:1';
  if (observeSingleBuildType == true){
    latestBuildEndpoint = '/guestAuth/app/rest/builds/?locator='+'buildType:' + tcBuildType + ',' + 'count:1';
  }
} else {
  latestBuildEndpoint = '/app/rest/builds/?locator='+'project:' + tcProject + ',' + 'count:1';
  if (observeSingleBuildType == true){
    latestBuildEndpoint = '/app/rest/builds/?locator='+'buildType:' + tcBuildType + ',' + 'count:1';
  }
}

// ################### STATES #############################
var FETCHING_BUILD_CONFIGURATIONS = false;
var BUILDSTATE = -1 // 0 = red/failure, 1 = yellow/running, 2 = green/success

// ################### johnny-five / Arduino Prep #############################
var board = new five.Board();
var greenLamp,yellowLamp,redLamp;
const GREENPIN = 13;
const YELLOWPIN = 12;
const REDPIN = 11;

var runningLoop = false;

var initLamps = function(){
  greenLamp = new five.Pin(GREENPIN);
  yellowLamp = new five.Pin(YELLOWPIN);
  redLamp = new five.Pin(REDPIN);

  var runningState = 0;

  board.loop(500, function(){
    if (runningLoop == true){
      board.digitalWrite(YELLOWPIN, (runningState = runningState ? 0 : 1));
    } else {
      board.digitalWrite(YELLOWPIN, 0);
    }
  });
}

var switchOffAllLights = function(){
  greenLamp.low();
  runningLoop = false;
  redLamp.low();
}

// ################### HTTP-Config #############################
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

// ################### Animation / Visualization #############################

var animateSuccess = function(){
  console.log("SUCCESS");
  switchOffAllLights();
  greenLamp.high();
};

var animateRunning = function(){
  console.log("RUNNING");
  switchOffAllLights();
  runningLoop = true;
};

var animateFailure = function(){
  console.log("FAILURE");
  switchOffAllLights();
  redLamp.high();
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

// ################### Networking-Functions #############################

var fetchLatestBuild = function(){
  console.log("fetchLatestBuild() called");
  var httpOptions = getHttpOptions(latestBuildEndpoint);
  var request = http.request(httpOptions, function(response) {
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
    var request = http.request(httpOptions, function(response) {
        var content = "";
        // Handle data chunks
        response.on('data', function(chunk) {
            content += chunk;
        });
        // Once we're done streaming the response, parse it as json.
        response.on('end', function() {
          // console.log(content);
            var data = JSON.parse(content);
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

// ################### Lifecycle #############################
board.on("ready", function() {
  console.log("Started Script to observe Project: " + tcProject);

  // board needs to be ready before initializing components
  initLamps();

  // Repeating Poll
  setInterval(function () {
    fetchRunningBuilds();
  }, tcPollingInterval);
});
