
// **************************************
// * Service to read tellstick switches *
// **************************************

var zmq = require('zmq');
var zonar = require('zonar');
var moment = require('moment');
var tellstick = require('tellstickjs').init();

var port = 6000;
var address = "tcp://0.0.0.0:" + port;
var broadcaster = zonar.create({ net: "cammes", name: "tellstick.pub", payload: JSON.stringify({ port: port }) });
var zocket = zmq.socket('pub');

zocket.bind(address, function(err) {

    if (err) throw err;

    console.log("TELLSTICK pub service started");

    broadcaster.start(function() {
        console.log("Broadcasting...");
    });

    tellstick.on('turnon', tellstickTrigger);
    tellstick.on('turnoff', tellstickTrigger);

    function tellstickTrigger(data) {

        data = data.constructor == Array ? data : [data];
        data.forEach(function(item) {

            if (item.protocol == "arctech") {
                var unit = item.unit;
                var command = item.method;
                zocket.send(unit + " " + command);

                var time = moment().format("DD/MM HH:SS");
                console.log("Tellstick [%s]> %s %s", time, unit, command);
            }

        });

    }

});

// Greacefully quit
process.on('SIGINT', function() {
    broadcaster.stop(function() {
        zocket.close(function() { });
        process.exit( );
    });
});

