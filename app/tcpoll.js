// #################### Libs  ####################################
var https = require('https');
var five = require("johnny-five"),board;

// #####################  Config #################################

var teamcityHost = 'teamcity.jetbrains.com';
var teamcityPort = 443;
var runningBuildsEndpoint = '/guestAuth/app/rest/buildTypes/id:MPS_34_Distribution_Binaries/builds?locator=running:true';
var lastBuildEndpoint = '/guestAuth/app/rest/buildTypes/id:MPS_34_Distribution_Binaries/builds?locator=lookupLimit:1'; // lookupLimit limits to last x builds

// Arduino Pins connected
var dPinRedLed = 10;
var dPinYellowLed = 9;
var dPinGreenLed = 8;

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

// init Arduino
board = new five.Board();

// Start Lifecycle
board.on("ready", function() {

  var lcd = new five.LCD({
    // LCD pin name  RS  EN  DB4 DB5 DB6 DB7
    pins: [12,11,5,4,3,2],
    rows: 2,
    cols: 16
  });


  var buildAnimation = false;
  var frame = 1;
  var frames = [":runninga:", ":runningb:"];
  // var row = 1;
  var col = 0;
  lcd.useChar("runninga");
  lcd.useChar("runningb");
  this.loop(300, function() {
    if (buildAnimation == true){
      lcd.clear().cursor(row, col).print(
        frames[frame ^= 1]
      );
      if (++col === lcd.cols) {
        col = 0;
      }
    }
  });

  lcd.clear().home();
  lcd.print("starting...");

  // LEDs
  var red = new five.Led(dPinRedLed);
  var yellow = new five.Led(dPinYellowLed);
  var green = new five.Led(dPinGreenLed);

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
              lcd.clear().home();
              lcd.print("no build running");
              // request result of last build
              requestLatestBuildState();
            }
            // Case at least one running Build
            else if (data.count > 0) {
              // resetLeds();
              console.log("Currently " + data.count + " build(s) running");
              yellow.strobe();
              lcd.clear().home();
              lcd.print("build running ...");
              buildAnimation = true;
            }
        });
    });

    // Report errors
    request.on('error', function(error) {
        requestRunning = false;
        console.log("Error while calling endpoint.", error);
        lcd.clear();
        lcd.home();
        lcd.print("REQ-ERROR");
        red.strobe();
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
          lcd.cursor(1,0);
          lcd.print("lastB: FAILURE");
          red.on();
        } else if (latestBuild.build[0].status == "ERROR"){
          red.on();
          lcd.cursor(1,0);
          lcd.print("lastB: ERROR");
        } else if (latestBuild.build[0].status == "SUCCESS") {
          green.on();
          lcd.cursor(1,0);
          lcd.print("lastB: SUCCESS");
        }
      });
    });
    // Report errors
    requestLatestBuild.on('error', function(error) {
        requestRunning = false;
        console.log("Error while calling endpoint.", error);
        red.strobe();
    });

    requestLatestBuild.end();
  };

  // Repeating Poll
  setInterval(function () {
    buildAnimation = false;
    lcd.clear();
    resetLeds();
    requestRunningBuilds();

  }, 10000);  // repeat request every 10 Sec.
});
