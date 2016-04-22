//aregerg

'use strict';

var fs = require('fs');
var http = require('http');
var pouchdb = require('pouchdb');
pouchdb.plugin(require('pouchdb-upsert'));

process.env.VCAP_SERVICES = JSON.stringify({
    "cloudantNoSQLDB": [
      {
         "name": "Cloudant NoSQL DB-8z",
         "label": "cloudantNoSQLDB",
         "plan": "Shared",
         "credentials": {
            "username": "f6afa7c1-0c96-4b4b-82e0-e649b8b1d6c5-bluemix",
            "password": "807fc03f1359a1aeb7f0338d623cab60bc3d2eda1154b250244033d8c6814c27",
            "host": "f6afa7c1-0c96-4b4b-82e0-e649b8b1d6c5-bluemix.cloudant.com",
            "port": 443,
            "url": "https://f6afa7c1-0c96-4b4b-82e0-e649b8b1d6c5-bluemix:807fc03f1359a1aeb7f0338d623cab60bc3d2eda1154b250244033d8c6814c27@f6afa7c1-0c96-4b4b-82e0-e649b8b1d6c5-bluemix.cloudant.com"
         }
      }
   ]
});

function handlePostRequest(requestObject, callback) {
    function isString(x) { return typeof x === 'string'; }

    function isUndefined(x) { return typeof x === 'undefined'; }

    function handler(error, response) {
        if (error) {
            console.log(error);
            //callback(error);
        } else {
            //callback({});
        }
    }

    function update(data) {
        if (isUndefined(data.revisions))
            data.revisions = 0;
        data.revisions++;

        return function () {
            return data;
        }
    }

    var typeNotRecognized = { error: 'Invalid Request: Type not recognized.' };
    var userNotSpecified = { error: 'Invalid Request: User not specified.' };
    var userNotFound = { error: 'Invalid Request: User not found.' };
    var keyNotSpecified = { error: 'Invalid Request: Key not specified.' };
    var keyNotFound = { error: 'Invalid Request: Key not found.' };

    var type = requestObject.type;
    var user = requestObject.user;
    var key = requestObject.key;
    var value = requestObject.value;

    var handlers = {
        list: function (error, userData) {
            if (error) console.log(error);
            return callback(!isUndefined(userData) ? { value: Object.keys(userData.pairs || {}) } : userNotFound);
        },

        get: function (error, userData) {
            if (error) console.log(error);
            if (isUndefined(userData)) {
                callback(userNotFound);
            } else if (!isString(key) || !key.length) {
                callback(keyNotSpecified);
            } else {
                var pairs = userData.pairs;
                callback(key in pairs ? { value: pairs[key] } : keyNotFound);
            }
        },

        set: function (error, userData) {
            if (error) console.log(error);
            if (!isString(key) || !key.length) {
                callback(keyNotSpecified);
                return;
            } else if (!isUndefined(userData)) {
                delete userData._rev;

                if (key in userData.pairs) {
                    if (!isUndefined(value) && value.length) { // Replace the existing value with a new value.
                        userData.pairs[key] = value;
                        db.upsert(userData._id, update(userData), handler);
                    } else { // Delete the existing value.
                        delete userData.pairs[key];
                        if (Object.keys(userData.pairs).length) { // Remove key.
                            db.upsert(userData._id, update(userData), handler);
                        } else { // Delete the user if there are no remaining keys.
                            db.upsert(userData._id, update(userData), handler);

                            // This doesn't seem to work. Don't know why.
                            //db.remove(userData, handler);
                        }
                    }
                } else if (!isUndefined(value) && value.length) { // Create a new key-value pair.
                    userData.pairs[key] = value;
                    db.upsert(user, update(userData), handler);
                }
            } else if (!isUndefined(value) && value.length) { // Create a new user with one key-value pair.
                var pairs = {};
                pairs[key] = value;
                var userData = { _id: user, pairs: pairs };
                db.upsert(user, update(userData), handler);
            }

            callback({});
        }
    }

    var handler = handlers[type];

    if (isUndefined(handler)) {
        callback(typeNotRecognized);
    } else if (!isString(user) || !user.length) {
        callback(userNotSpecified);
    } else {
        var services = JSON.parse(process.env.VCAP_SERVICES);
        var cloudant = services.cloudantNoSQLDB[0].credentials;
        var db = new pouchdb('users');
        var remote = cloudant.url + '/users';
        var opts = {};

        db.replicate.to(remote, opts);
        db.replicate.from(remote, opts);
        db.get(user, handler, handler);         
    }
}

function handleRequest(request, response) {
    var maxPostSize = 1e5;
    var mimeTypes = {
        html: 'text/html',
        js: 'text/javascript',
        css: 'text/css'
    };

    var handlers = {
        GET: function (request, response) {
            var filename = request.url;
            /*if (filename == '/') filename = '/index.html';
            filename = './public' + filename;

            var stats;

            try {
                stats = fs.lstatSync(filename);
            } catch (error) {
                response.writeHead(404, {'Content-Type': 'text/plain'});
                response.write('404 Not Found\n');
                response.end();
                return;
            }

            if (stats.isFile()) {
                var type = mimeTypes[filename.split(".").pop()];
                response.writeHead(200, {'Content-Type': type} );
                fs.readFile(filename, function (error, data) {
                    response.end(data);
                });
            }*/
            filename ='http://rawgit.com/roth28/roller-coaster-simulator/master' + filename; 
            http.get(filename, function (httpresponse) {
                var body = '';
                var code = httpresponse.headers[0];
                var type = httpresponse.headers['content-type'];

                httpresponse.setEncoding('utf8');
                httpresponse.on('data', function (data) {
                    body += data;
                });

                httpresponse.on('end', function() {
                    response.writeHead(httpresponse.statusCode, {'Content-Type': type});
                    response.write(body);
                    response.end();
                });
            });
        },

        POST: function (request, response) {
            var body = '';

            request.on('data', function (data) {
                body += data;
                if (body.length > maxPostSize) {
                    request.connection.destroy();
                }
            });

            request.on('end', function () {
                try {
                    var obj = JSON.parse(body);
                    handlePostRequest(obj, function (responseObj) {
                        response.writeHead(200, {'Content-Type': 'application/json'});
                        response.write(JSON.stringify(responseObj));
                        response.end();
                    });
                } catch (error) {
                    console.log(error);
                }
            });
        }
    };

    handlers[request.method](request, response);
}

(function () {
    var port = (process.env.VCAP_APP_PORT || 1337);
    var host = (process.env.VCAP_APP_HOST || '0.0.0.0');

    http.createServer(handleRequest).listen(port, host);

    console.log("Connected to port = " + port + " host = " + host);    
}());
