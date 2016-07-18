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

# Start script

```bash
cd app/
node tcservice.js
```