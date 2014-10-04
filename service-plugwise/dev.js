var plugwiseApi = require('../../plugwisejs/plugwise');

// first we connetc to the plugwise stick
var plugwise = plugwiseApi.init({ 
    serialport: "/dev/ttyUSB0",
    log: 2
});
var mac = '000D6F0000D33887';
//var mac = '000D6F0001A40726';
var appliance = plugwise(mac);
appliance.info(function(info) {

    console.log(info);

    if (true) {
        console.log("Try to turn on");
        appliance.poweron(function() { 
            console.log("ON");
        });
    } else {
        console.log("Try to turn off");
        appliance.poweroff(function() { 
            console.log("OFF");
        });
    }

});
