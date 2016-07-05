'use strict';
var st = require('st')
var http = require('http')

http.createServer(
    st({
        path  : "/home/gxy/frc5522.com",
        index : "index.html",
        cache : false
    })
).listen(80)
http.createServer(function (req, res) {
    if (req.method === "POST"
        && req.url === "/reload") {
        res.end();
        process.exit(0);
    };
}).listen(3000)


