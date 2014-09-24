// ********************************************************
// * Service to send push bullet messages to your devices *
// ********************************************************

var zmq = require('zmq');
var zonar = require('zonar');
var config = require('./config');
var PushBullet = require('pushbullet');

var pusher = new PushBullet(config.token);
var port = 6000;
var address = "tcp://0.0.0.0:" + port;
var broadcaster = zonar.create({ net: "cammes", name: "pushbullet.pub", payload: JSON.stringify({ port: port }) });
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
                    devices.forEach(function(device) {
                        pusher.note(device.iden, event.title, event.message, function(error, response) {
                            zocket.send(err ? JSON.stringify(err) : '');
                        }); 
                    });
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
