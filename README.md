# UnoJohnnyBuildInfo

My first Arduino project. Goal is to visualize (TeamCity-) Buildinformation with a traffic light.

Arduino will not be used standalone, only serial-connected (USB/Bluetooth LE)  to PC / Mac. To be able to call the Rest-API of Teamcity I decided to create the program in Javascript and run it in an NodeJS-Environment. To connect to the Arduino UNO the Johnny-Five Lib will be used.

This project will be documented (in german) and discussed on my Blog: [csdev.it](http://csdev.it).


# Install Dependencies

to try out the scripts you need to have installed Node.js and NPM. After checking out this repo move to the app-folder and install all required dependencies.

```bash
cd app/
npm install
```

# Start script

```bash
cd app/
node tcpoll.js
```