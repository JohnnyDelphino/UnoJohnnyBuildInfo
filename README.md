# UnoJohnnyBuildInfo

My first Arduino project. Goal is to visualize (TeamCity-) Buildinformation with a traffic light.

Arduino will not be used standalone, only serial-connected (USB/Bluetooth LE)  to PC / Mac. To be able to call the Rest-API of Teamcity I decided to create the program in Javascript and run it in an NodeJS-Environment. To connect to the Arduino UNO the Johnny-Five Lib will be used.

This project will be documented (in german) and discussed on my Blog: [csdev.it](http://csdev.it).


# Install Dependencies

To try out the scripts you need to have installed Node.js and NPM. After checking out this repo move to the app-folder and install all required dependencies.

```bash
cd app/
npm install
```

# Arduino requirements

Due to the reason the Arduino only acts passive and reacts to serial input it needs to implement the **Firmata**-Protocol. You can simply flash it from your Arduino IDE. Go to File > Examples > Firmata > StandardFirmata to open the Sourcecode. After opening flash it to your connected Arduino.

#Configuration

```json
{
  "teamcityHost" : "teamcity.jetbrains.com",
  "teamcityPort" : "443",
  "teamcityUser" : "guest",
  "teamcityPassword" : "",
  "tcProject" : "Kotlin",
  "observeSingleBuildType" : true,
  "tcBuildType" : "bt384",
  "tcPollingIntervalInSeconds" : 15
}
```

The config.json allows you to configure your individual TeamCity-Server you want to connect to. The following parameters are implemented at the moment:

* **teamcityHost** *the url of your TeamCity-Server*
* **teamcityPort** *the port of your TeamCity-Server* 
* **teamcityUser** *the user to authenticate against the TC-Server, you can put "guest" here if your TC-Config allows Guest-Access*
* **teamcityPassword** *the password of TC-User above. In case of "guest" not needed (leave empty)*
* **tcProject** *Set a TeamCity project to observe all BuildConfigurations of it*
* **observeSingleBuildType** *if you want to select a single TC-BuildConfig instead of all BuildConfigs in a project set this to true and add the BuildTypeID in the next param*
* **tcBuildType** *the BuildTypeID of the single BuildConfig you want to observe*
* **tcPollingIntervalInSeconds** *the interval in that the status is polled regularly*

# Start script

```bash
cd app/
node tcservice.js
```