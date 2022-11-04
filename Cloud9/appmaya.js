var util = require('util'), 
http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var currentTime = new Date();
    setInterval(function(){
        res.write(
            currentTime.getHours()
            + ':' + 
            currentTime.getMinutes()
            + ':' +
            currentTime.getSeconds()
        );
    },1000);
}).listen(8000);