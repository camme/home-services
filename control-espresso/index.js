var zonar = require('zonar');
var zmq = require('zmq');
var moment = require('moment');
var config = require('./config');

var z = zonar.create({ net : 'cammes', name: 'control.espresso'});
var zocketOutgoing = zmq.socket('req');
var outgoingService;

var mac = config.espresso;
var currentState = "";

console.log('\033[2J');

z.start(function(){

    z.on('found.plugwise', function(service) {
        console.log("Found plugwise service");
        outgoingService = service;
    });

    z.on('dropped.plugwise', function(service) {
        console.log("Dropped plugwise service");
        delete outgoingService;
    });


    function react() {

        if (outgoingService) {

            var now = new Date();

            var newState = currentState;

            //console.log(now.getDay(), now.getHours());

            if (now.getDay() >= 6 && now.getDay() <= 7) {
                if (now.getHours() > 8) {
                    newState = "turnon";
                }
            }

            if (newState != currentState) {

                var time = moment().format("DD/MM HH:SS");
                console.log("Espresso [%s]> new state: %s ", time, newState);

                currentState = newState;

                zocketOutgoing = zmq.socket('req');
                zocketOutgoing.on('message', function(message) {
                    console.log("Got back '%s'", message.toString());
                    zocketOutgoing.close();
                });
                zocketOutgoing.connect('tcp://' + outgoingService.address + ":" + outgoingService.payload.port);

                var message = mac + " turnon";
                zocketOutgoing.send(message);

            }

        } else {
            var time = moment().format("DD/MM HH:SS");
            console.log("Espresso [%s]> no plugwise service", time);
        }
        setTimeout(react, 1000 * 60);

    };

    react();

});


// Greacefully quit
process.on('SIGINT', function() {
    z.stop(function() {
        process.exit( );
    });
})
