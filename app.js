const { startWifiServer, connectToWifiServer, startVideoServer } = require('./network');

// This function gets called when you tap "Start Broadcasting"
function runBabyMode() {
    startWifiServer(8080);
    startVideoServer(8081);
    console.log('Baby Unit broadcasting actively.');
}

// This function gets called when you tap "Connect & Watch"
function runParentMode() {
    // Instead of command line IPs, our new auto-discovery script handles it
    discoverBabyUnit((detectedIP) => {
        connectToWifiServer(detectedIP, 8080);
    });
}

// Export them so your button click layout can see them
module.exports = { runBabyMode, runParentMode };
