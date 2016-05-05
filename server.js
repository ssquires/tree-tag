var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');

var app = express();
app.use(express.static('public'));
app.use('/jquery', express.static(__dirname + '/jquery-ui-1.11.4.custom'));

var jsonParser = bodyParser.json();

app.get('/', function(request, response) {
   response.render('index.html'); 
});

app.get('/panodata', function(req, res) {
    panoUrl = 'http://131.215.134.227/los_angeles/streetview/ROI874.json';
    request({
        url: panoUrl,
        json: true
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(body));
            }
    });
    
});

app.listen(8080);