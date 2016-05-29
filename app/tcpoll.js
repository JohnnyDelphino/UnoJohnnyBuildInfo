var https = require('https');
var five = require("johnny-five"),board = new five.Board();

// #####################  Config #################################

var teamcityHost = 'teamcity.jetbrains.com';
var teamcityPort = 443;
var runningBuildsEndpoint = '/guestAuth/app/rest/buildTypes/id:MPS_34_Distribution_Binaries/builds?locator=running:true';
var lastBuildEndpoint = '/guestAuth/app/rest/buildTypes/id:MPS_34_Distribution_Binaries/builds?locator=lookupLimit:1'; // lookupLimit limits to last x builds

// ###############################################################

var runningBuildRestOptions = {
    host: teamcityHost,
    port: teamcityPort,
    path: runningBuildsEndpoint,
    method: 'GET',
    // json:true
    headers: {
      accept: 'application/json'
  }
};

var lastBuildResultRestOptions = {
    host: teamcityHost,
    port: teamcityPort,
    path: lastBuildEndpoint,
    method: 'GET',
    // json:true
    headers: {
      accept: 'application/json'
  }
};

// Start Lifecycle
board.on("ready", function() {

  // LEDs
  var red = new five.Led(9);
  var yellow = new five.Led(8);
  var green = new five.Led(7);

  var resetLeds = function(){
    red.off();
    yellow.off();
    green.off();
  };

  var requestRunningBuilds = function(){
    var request = https.request(runningBuildRestOptions, function(response) {
        var content = "";
        // Handle data chunks
        response.on('data', function(chunk) {
            content += chunk;
        });

        // Once we're done streaming the response, parse it as json.
        response.on('end', function() {
          requestRunning = false;

            var data = JSON.parse(content);
            console.log("JSON-Response: ");
            console.log(data);

            // Case: No Running Builds
            if (data.count == 0){
              // resetLeds();
              console.log("Currently no build running");
              // request result of last build
              requestLatestBuildState();
            }
            // Case at least one running Build
            else if (data.count > 0) {
              // resetLeds();
              console.log("Currently " + data.count + " build(s) running");
              yellow.strobe();
            }
        });
    });

    // Report errors
    request.on('error', function(error) {
        requestRunning = false;
        console.log("Error while calling endpoint.", error);
        red.on();
    });

    request.end();
  };

  var requestLatestBuildState = function(){
    var requestLatestBuild = https.request(lastBuildResultRestOptions, function(lbresponse) {
      console.log("requesting last build ...");
      var latestBuildContent = "";
      // Handle data chunks
      lbresponse.on('data', function(chunk) {
          latestBuildContent += chunk;
      });
      // Once we're done streaming the response, parse it as json.
      lbresponse.on('end', function() {
        var latestBuild = JSON.parse(latestBuildContent);
        console.log("Latest Build: ");
        console.log(latestBuild);
        if (latestBuild.build[0].status == "FAILURE"){
          red.on();
        } else if (latestBuild.build[0].status == "ERROR"){
          red.strobe();
        } else if (latestBuild.build[0].status == "SUCCESS") {
          green.on();
        }
      });
    });
    // Report errors
    requestLatestBuild.on('error', function(error) {
        requestRunning = false;
        console.log("Error while calling endpoint.", error);
        red.on();
    });

    requestLatestBuild.end();
  };



  setInterval(function () {


    resetLeds();
    requestRunningBuilds();

  }, 10000);  // repeat request every 10 Sec.
});
