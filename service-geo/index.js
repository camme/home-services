var zmq = require('zmq');
var zonar = require('zonar');
var moment = require('moment');
var config = require('./config');

var port = 6077;
var address = "tcp://0.0.0.0:" + port;
var broadcaster = zonar.create({ net: "cammes", name: "geo.pub", payload: JSON.stringify({ port: port }) });
var zocket = zmq.socket('pub');

var OpenPaths = require('openpaths').OpenPaths;
var openPaths = new OpenPaths(config.openpaths.key, config.openpaths.secret);

zocket.bind(address, function(err) {

    if (err) throw err;

    console.log("GEO pub service started");

    broadcaster.start(function() {
        console.log("Broadcasting geo...");
    });

    setInterval(requestUserPosition, 1000 * 30);

    function requestUserPosition() {
        openPaths.getLocations(function(error, data, response){
            var jsonData = null;
            try{
                jsonData = JSON.parse(data);
            } 
            catch(error) {
                console.log("ERR %s", error, data);
            }
            processUserPosition(jsonData);
        });
    }

    function processUserPosition(data) {
        if (data && data.length >= 0) {
            var location = data.pop();
            var message = {
                type: 'geolocation',
                latitude: location.lat,
                longitude: location.lon,
                timestamp: location.t
                //accuracy: data.data.accuracy,
                //kind: data.data.kind
            };

            var time = moment().format("DD/MM HH:SS");
            console.log("Geo [%s]> %s, %s", time, location.lat, location.lon);
            zocket.send('camilo ' + JSON.stringify(message));
        }
        else {
            console.log("error with google lat data:", data);
        }
    }

    requestUserPosition();

});

// Greacefully quit
process.on('SIGINT', function() {
    broadcaster.stop(function() {
        zocket.close(function() { });
        process.exit( );
    });
});
