var zonar = require('zonar');
var zmq = require('zmq');
var moment = require('moment');

var z = zonar.create({ net : 'cammes', name: 'control.switch'});
var zocketIncoming = zmq.socket('sub');
var zocketOutgoing = zmq.socket('req');
var config = require('./config');
var outgoingService;

var switchList = config.list;

z.start(function(){

    z.on('found.plugwise', function(service) {
        console.log("Found plugwise rep");
        outgoingService = service;
    });

    z.on('found.tellstick.pub', function(service) {
        console.log("Connected to tellstick service");
        zocketIncoming = zmq.socket('sub');
        zocketIncoming.on('message', incoming);
        zocketIncoming.connect('tcp://' + service.address + ":" + service.payload.port);
        zocketIncoming.subscribe("");
    });

    function incoming(message) {

        var data = message.toString().split(' ');
        var switchId = data[0];
        var command = data[1];

        if (outgoingService) {

            zocketOutgoing = zmq.socket('req');
            zocketOutgoing.on('message', function(message) {
                console.log("Got back '%s'", message.toString());
                zocketOutgoing.close();
            });
            zocketOutgoing.connect('tcp://' + outgoingService.address + ":" + outgoingService.payload.port);

            var time = moment().format("DD/MM HH:SS");
            console.log("Switch [%s]> %s %s", time, switchId, command);

            var mac = switchList[switchId];
            if (mac) {
                var message = mac + " " + command;
                zocketOutgoing.send(message);
                console.log(switchId + " -> " + message);
            }

        } else {
            console.log("No plugwise service");
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
