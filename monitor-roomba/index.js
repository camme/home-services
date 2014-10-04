var zonar = require('zonar');
var zmq = require('zmq');
var z = zonar.create({ net : 'cammes', name: 'roomba.monitor'});
var zocketIncoming = zmq.socket('sub');
var pushbulletService;

z.start(function(){

    z.on('found.plugwise', function(service) {
        console.log("Found plugwise pub");
        zocketIncoming = zmq.socket('sub');
        zocketIncoming.on('message', incoming);
        zocketIncoming.connect('tcp://' + service.address + ":" + service.payload.pubPort);
        zocketIncoming.subscribe("000D6F0001A40726");
    });

    z.on('dropped.plugwise', function(service) {
        if (zocketIncoming) {
            zocketIncoming.close();
            zocketIncoming = null;
        }
    });



    z.on('found.pushbullet.rep', function(service) {
        pushbulletService = service;
        console.log("Found pushbullet rep");
    });

    z.on('dropped.pushbullet.rep', function(service) {
        pushbulletService = null;
        console.log("Unfound pushbullet rep");
    });

    var state = "init";


    function incoming(message) {

        var dataParts = message.toString().split(' ');
        var switchId = dataParts[0];
        var data = JSON.parse(dataParts[1]);

        var newState = state;
        if (data.watt < 2) {
            newState = "away";
        } else if (data.watt >=2 && data.watt < 6) {
            newState = "standby";
        } else if (data.watt >= 6) {
            newState = "loading";
        }

        var action = "";
        if (state == "standby" && newState == "away") {
            action = "cleaning";
        } else if (state == "away" && newState == "loading") {
            action = "recharging";
        }

        //console.log(state, newState);

        state = newState;

        var message = "";
        if (action == "cleaning") {
            message = "I'm cleaning the house!";
        } else if (action == "recharging") {
            message = "I finished cleaning.";
        }


        if (message == "") {
            return;
        }

        if (pushbulletService) {
            var pushbulletSocket = zmq.socket('req');
            pushbulletSocket.on('message', function(message) {
                pushbulletSocket.close();
            });
            pushbulletSocket.connect('tcp://' + pushbulletService.address + ":" + pushbulletService.payload.port);
            var outMessage = {
                type: 'note',
                title: 'Roomba',
                message: message
            };
            pushbulletSocket.send(JSON.stringify(outMessage));
            console.log("SEND", outMessage);
        }

    };

});


// Greacefully quit
process.on('SIGINT', function() {
    z.stop(function() {
        zocketIncoming.close(function() { });
        process.exit( );
    });
})
