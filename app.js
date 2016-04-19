/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
var cradle = require('cradle');

var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
console.log('sqldb is: ' + vcapServices.cloudantNoSQLDB);
console.log('Everything is: ' + JSON.stringify(vcapServices));

//var connection = new(cradle.Connection)('887ef523-362d-4ad0-95d3-6fcfe60e4774-bluemix.cloudant.com', 443, { auth: { username: '887ef523-362d-4ad0-95d3-6fcfe60e4774-bluemix', password: '5f2846b2987b9ee2c26ed33bcac9c8129eb6647dd924f47ec7169ae2cf2b52d9'}
//});

//console.log(JSON.stringify(connection));

//var db = connection.database('testing');
//db.create(function(err){
    //error
//    console.log("error in db.create");
//});

/*db.save('someNewEntry', {
    force: 'someValue',
    name: 'someName'
}, function (err, res) {
    //nothing for now
});*/

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
