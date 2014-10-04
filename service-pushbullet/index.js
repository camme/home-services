// ********************************************************
// * Service to send push bullet messages to your devices *
// ********************************************************

var zmq = require('zmq');
var zonar = require('zonar');
var async = require('async');
var config = require('./config');
var PushBullet = require('pushbullet');

var pusher = new PushBullet(config.token);
var port = 6060;
var address = "tcp://0.0.0.0:" + port;
var broadcaster = zonar.create({ net: "cammes", name: "pushbullet.rep", payload: JSON.stringify({ port: port }) });
var zocket = zmq.socket('rep');

pusher.devices(function(error, response) {
    startZocket(response.devices);
});

function startZocket(devices) {

    zocket.bind(address, function(err) {

        if (err) throw err;

        console.log("PUSHBULLET publishing service started");

        broadcaster.start(function() {
            console.log("Broadcasting...");        
        });

        zocket.on('message', function(data) {

            var error = "";

            try {

                var event = JSON.parse(data.toString('utf8'));

                if (event.type == "note") {
                    async.eachSeries(devices, function(device, next) {
                        pusher.note(device.iden, event.title, event.message, function(error, response) {
                            next(err);
                        }); 
                    }, function(err) {
                        zocket.send(err ? JSON.stringify(err) : 'OK');
                        console.log("SEND", event.title, event.message);
                    });
                } else {
                    zocket.send("NOT OK, WRONG TYPE");
                }

            } catch(err) {
                console.log("Error parsing json data from zocket", err);
                error = JSON.stringify(err);
                zocket.send(error);
            }

        });    

    });

}

// Greacefully quit
process.on('SIGINT', function() {
    broadcaster.stop(function() {
        zocket.close(function() { });
        process.exit( );
    });
})
