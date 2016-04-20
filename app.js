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

function handlePost(req) {
    var userNotSpecified = { error: 'app: User not specified.' };
    var userNotFound = { error: 'app: User not found.' };
    var fileNotFound = { error: 'app: File not found.' };
    var typeNotRecognized = { error: 'app: Type not recognized.' };
    
    var body = '';
    var obj;

    function handleError(err, response) {
        if (err) return { error: err };
    }

    function handleEnd() {
        console.log(obj);

        if (typeof obj.user === 'undefined') return userNotSpecified;

        var db = new pouchdb('users');
        var remote = cloudant.url + '/users';
        var opts = {};

        db.replicate.to(remote, opts);
        db.replicate.from(remote, opts);

        if (obj.type === 'list') {
            db.get(obj.user, function (err, response) {
                if (obj.user in response)
                    return { data: Object.keys(response[obj.user]) };
                else
                    return userNotFound;
            }, handleError);
        } else if (obj.type === 'get') {
            db.get(obj.user, function (err, response) {
                if (obj.user in response) {
                    var files = response[obj.user];
                    if (obj.name in files)
                        return { data: files[obj.name] };
                    else
                        return fileNotFound;
                } else {
                    return userNotFound;
                }
            }, handleError);
        } else if (obj.type === 'set') {
            db.get(obj.user, function (err, response) {
                if (obj.user in response) {
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
                    return userNotFound;
                }
            }, function (err) {
                var files = { _id: obj.users };
                files[obj.name] = obj.data;
                db.put(files);
            });
        } else {
            return typeNotRecognized;
        }
    }

    req.on('data', function (data) {
        body += data;
    });

    req.on('end', function () {
        obj = JSON.parse(body);
        handleEnd();
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
        var obj = handlePost(req);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(JSON.stringify(obj));
        res.end();
    } else {
        res.end();
    }
}).listen(port, host);
console.log("Connected to port =" + port + " host =  " + host);
