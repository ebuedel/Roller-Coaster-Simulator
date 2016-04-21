var fs = require('fs');
var http = require('http');
var pouchdb = require('pouchdb');

if (process.env.VCAP_SERVICES) {
      // Running on Bluemix. Parse the process.env for the port and host that we've been assigned.
      var env = JSON.parse(process.env.VCAP_SERVICES);
      var host = process.env.VCAP_APP_HOST; 
      var port = process.env.VCAP_APP_PORT;
      console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);    
      // Also parse out Cloudant settings.
      var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
}

var port = (process.env.VCAP_APP_PORT || 1337);
var host = (process.env.VCAP_APP_HOST || '0.0.0.0');

function handlePost(req, callback) {
    var userNotSpecified = { error: 'app: User not specified.' };
    var userNotFound = { error: 'app: User not found.' };
    var fileNotFound = { error: 'app: File not found.' };
    var typeNotRecognized = { error: 'app: Type not recognized.' };
    
    var body = '';
    var obj;

    function handleEnd() {
        console.log('Request: ' + JSON.stringify(obj));

        if (typeof obj.user === 'undefined') return userNotSpecified;

        var db = new pouchdb('users');
        var remote = cloudant.url + '/users';
        var opts = {};

        db.replicate.to(remote, opts);
        db.replicate.from(remote, opts);

        if (obj.type === 'list') {
            db.get(obj.user, function (err, response) {
                console.log('list DB_RESPONSE: ' + response);
                if (response !== 'undefined')
                    return { data: Object.keys(response[obj.user]) };
                else
                    return userNotFound;
            }, function (err) {
                return { error: err }
            });
        } else if (obj.type === 'get') {
            db.get(obj.user, function (err, response) {
                console.log('get DB_RESPONSE: ' + response);
                if (response !== 'undefined') {
                    var files = response[obj.user];
                    if (obj.name in files)
                        return { data: files[obj.name] };
                    else
                        return fileNotFound;
                } else {
                    return userNotFound;
                }
            }, function (err) {
                return { error: err }
            });
        } else if (obj.type === 'set') {
            db.get(obj.user, function (err, response) {
                console.log('set DB_RESPONSE: ' + response);
                if (response !== 'undefined') {
                    var files = response[obj.user];
                    if (obj.name in files) {
                        if (typeof obj.data === 'undefined') {
                            files[obj.name] = obj.data;
                            db.put(response);
                        } else {
                            db.remove(response, handleError);
                        }
                        return {};
                    } else {
                        return fileNotFound;
                    }
                } else {
                    var files = { _id: obj.user };
                    files[obj.name] = obj.data;
                    db.put(files);
                }
            }, function (err) {
                return { error: err }
            });
        } else {
            return typeNotRecognized;
        }
    }

    req.on('data', function (data) {
        body += data;
        if (body.length > 1e5) {
            req.connection.destroy();
        }
    });

    req.on('end', function () {
        try {
            obj = JSON.parse(body);
            var response = handleEnd();
            console.log('SERVER_RESPONSE: ' + JSON.stringify(response));
            callback(response);
        } catch (err) {
            callback(handleError(err));
        }
    });
}

require('http').createServer(function(req, res) {     
    if (req.url === '/index.html' || req.url === '/') {
        fs.readFile('./public/index.html', function (err, data){
            res.end(data);
        });
        return;
    }

     if (process.env.VCAP_SERVICES) {
          var env = JSON.parse(process.env.VCAP_SERVICES);
          var host = process.env.VCAP_APP_HOST; 
          var port = process.env.VCAP_APP_PORT;

          console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);    

          var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
     }
    
    if (req.method == 'POST') {
        handlePost(req, function (responseObj) {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.write(JSON.stringify(responseObj));
            res.end();
        });
    } else {
        res.end();
    }
}).listen(port, host);
console.log("Connected to port =" + port + " host =  " + host);
