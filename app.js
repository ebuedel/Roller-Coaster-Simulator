'use strict';

var fs = require('fs');
var http = require('http');
var pouchdb = require('pouchdb');

function isString(x) {
    return typeof x === 'string';
}

function isUndefined(x) {
    return typeof x === 'undefined';
}

function handlePostRequest(requestObject, callback, handleError) {
    var typeNotRecognized = { error: 'Type not recognized.' };
    var userNotSpecified = { error: 'User not specified.' };
    var userNotFound = { error: 'User not found.' };
    var keyNotSpecified = { error: 'Key not specified.' };
    var keyNotFound = { error: 'Key not found.' };

    var type = requestObject.type;
    var user = requestObject.user;
    var key = requestObject.key;
    var value = requestObject.value;

    var handlers = {
        list: function (error, userData) {
            return callback(!isUndefined(userData) ? { value: Object.keys(userData.pairs || {}) } : userNotFound);
        },

        get: function (error, userData) {
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
            if (!isString(key) || !key.length) {
                callback(keyNotSpecified);
            } else if (!isUndefined(userData)) {
                if (value.length) {
                    userData.pairs[key] = value;
                    db.put(userData);
                } else {
                    delete userData.pairs[key];
                    if (Object.keys(userData.pairs).length)
                        db.put(userData);
                    else
                        db.remove(userData, handleError);
                }
                callback({});
            } else {
                var pairs = {};
                pairs[key] = value;
                db.put({ _id: user, pairs: pairs });
                callback({});
            }
        }
    }

    var handler = handlers[type];

    if (!handler) {
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
        db.get(user, handler, handleError);            
    }
}

function handleRequest(request, response) {
    var handlers = {
        GET: function (request, response) {
            if (request.url === '/' || request.url === '/index.html') {
                fs.readFile('./public/index.html', function (err, data) {
                    response.end(data);
                });
            } else {
                response.writeHead(404, {'Content-Type': 'text/plain'});
                response.write('404 - File not Found');
                response.end();
            }
        },

        POST: function (request, response) {
            var body = '';

            request.on('data', function (data) {
                body += data;
                if (body.length > 1e5) {
                    request.connection.destroy();
                }
            });

            request.on('end', function () {
                function handleError(error) {
                    console.log(error);
                }

                try {
                    var obj = JSON.parse(body);
                    handlePostRequest(obj, function (responseObj) {
                        response.writeHead(200, {'Content-Type': 'application/json'});
                        response.write(JSON.stringify(responseObj));
                        response.end();
                    }, handleError);
                } catch (err) {
                    handleError(err);
                }
            });
        }
    };

    return handlers[request.method](request, response);
}

(function () {
    var port = (process.env.VCAP_APP_PORT || 1337);
    var host = (process.env.VCAP_APP_HOST || '0.0.0.0');

    http.createServer(handleRequest).listen(port, host);

    console.log("Connected to port = " + port + " host = " + host);    
}());
