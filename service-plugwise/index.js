// ***************************************
// * Service to control plugwise circles *
// ***************************************

var zmq = require('zmq');
var zonar = require('zonar');
var async = require('async');
var plugwiseApi = require('plugwisejs');

var port = 6100;
var pubPort = 6101;
var address = "tcp://0.0.0.0:" + port;
var pubAddress = "tcp://0.0.0.0:" + pubPort;
var broadcaster = zonar.create({ net: "cammes", name: "plugwise", payload: JSON.stringify({ port: port, pubPort: pubPort }) });
var zocket = zmq.socket('rep');
var zpub = zmq.socket('pub');

var list = require('./appliances');

// first we connetc to the plugwise stick
var plugwise = plugwiseApi.init({ serialport: "/dev/ttyUSB0", log: 0 });
var cache = {};
var first = true;

function scanlist(socket, done) {
    var activeList = [];
    async.eachSeries(list, function(mac, next) {
        var appliance = plugwise(mac);
        appliance.powerinfo(function(info) {
            if (!info.error) {
                if (cache[mac] != info.watt) {
                    var message = { watt: info.watt, first: first };
                    socket.send(mac + " " + JSON.stringify(message) );
                    console.log(mac + " " + JSON.stringify(message) );
                }
                cache[mac] = info.watt;
            }
            next();
        });
    }, function(err) {
        first = false;
        setTimeout(function() {
            scanlist(socket);
        }, 1000 * 60);
        if (done) {
            done(err);
        }
    });
}

zpub.bind(pubAddress, function(err) {

    if (err) throw err;
    console.log("PLUGWISE req/rep service started");

    scanlist(zpub);

    zocket.bind(address, function(err) {

        if (err) throw err;
        console.log("PLUGWISE req/rep service started");

        broadcaster.start(function() {
            console.log("Broadcasting...");
        });

        zocket.on('message', function(message) {

            var data = message.toString().split(' ');
            var mac = data[0];
            var command = data[1];

            console.log('GOT', mac, command);

            if (command && mac) {

                var appliance = plugwise(mac);
                appliance.info(function(info) {

                    if (command == "turnon") {
                        if (!info.relay) { 
                            appliance.poweron(function() { 
                                zpub.send(mac + JSON.stringify({relay: true}));
                            });
                            zocket.send("OK"); 
                        } else {
                            zocket.send("ALREADY ON"); 
                        }
                    } else if (command == "turnoff") {
                        if (info.relay) {
                            appliance.poweroff(function() { 
                                zpub.send(mac + JSON.stringify({relay: false}));
                            });
                            zocket.send("OK"); 
                        } else {
                            zocket.send("ALREADY OFF"); 
                        }
                    } else {
                        zocket.send("NO CURRENT INFO"); 
                    }

                });

            } else {
                console.log("Error parsing json data from zocket", err);
                zocket.send("Error");
            }

        });

    });

});

// Greacefully quit
process.on('SIGINTx', function() {
    console.log("closing broadcaster");
    broadcaster.stop(function() {
        console.log("closing zmq");
        setTimeout(function() {
            process.exit();
        }, 500);
        //zocket.close(function() { });
    });
});


