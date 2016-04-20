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

//Insert records into the books DB
 var insert_records = function(req, res) {
    //Parse the process.env for the port and host that we've been assigned
    if (process.env.VCAP_SERVICES) {
          // Running on Bluemix. Parse the port and host that we've been assigned.
          var env = JSON.parse(process.env.VCAP_SERVICES);
          var host = process.env.VCAP_APP_HOST; 
          var port = process.env.VCAP_APP_PORT;

          console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);    
          // Also parse Cloudant settings.
          var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
    }
    
    var db = new pouchdb('books'),
     remote =cloudant.url + '/books';
    opts = {
      continuous: true
      };
     // Replicate the DB to remote
    console.log(remote);
    db.replicate.to(remote, opts);
    db.replicate.from(remote, opts);
    
    // Put 3 documents into the DB
    db.put({
          author: 'John Grisham',
          Title : 'The Firm'          
        }, 'book1', function (err, response) {
          console.log(err || response);
        });
     db.put({
          author: 'Authur C Clarke',
          Title : '2001: A Space Odyssey'         
        }, 'book2', function (err, response) {
          console.log(err || response);
        });
     db.put({
          author: 'Dan Brown',
          Title : 'Digital Fortress'          
        }, 'book3', function (err, response) {
          console.log(err || response);
        });
     res.writeHead(200, {'Content-Type': 'text/plain'});
     res.write("3 documents is inserted");
     res.end();
}; // End insert_records

function handlePost(req, res) {
    var body = '';
    var obj;

    function handleError(err, response) {
        if (err) return { error: err };
    }

    function handleEnd() {
        console.log(obj);

        var db = new pouchdb('users');
        var remote = cloudant.url + '/users';
        var opts = {};

        var userNotFound = { error: 'app: User not found.' };
        var fileNotFound = { error: 'app: File not found.' };
        var typeNotRecognized = { error: 'app: Type not recognized.' };

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
                        files[obj.name] = obj.data;
                        db.put(response);
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

// Update records in the books DB
var update_records = function(req, res) {
    if (process.env.VCAP_SERVICES) {
          // Running on Bluemix. Parse for the port and host 
          var env = JSON.parse(process.env.VCAP_SERVICES);
          var host = process.env.VCAP_APP_HOST; 
          var port = process.env.VCAP_APP_PORT;

          console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);    

          // Also parse Cloudant settings.
          var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
    }
    
    var db = new pouchdb('books'),
    remote =cloudant.url + '/books';
    opts = {
      continuous: true
      };
     //Create a collection books
    console.log(remote);
    db.replicate.to(remote, opts);
    db.replicate.from(remote, opts);
    
    // Update book3
    db.get('book3', function(err, response) {
        console.log(response);
        return db.put({
            _id: 'book3',
            _rev: response._rev,
            author: response.author,
            Title : 'The da Vinci Code',              
         });
        }, function(err, response) {
          if (err) {
            console.log("error " + err);
          } else {
            console.log("Success " + response);
          }
    });
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write("Updated the book3 document. Changed the Title from Digital Fortress to The Da Vinci Code");
    res.end();

}; //End update-records

//Delete a document from the books DB
var delete_record = function(req, res) {
    
    if (process.env.VCAP_SERVICES) {
          // Running on Bluemix. Parse for the port and host that we've been assigned.
          var env = JSON.parse(process.env.VCAP_SERVICES);
          var host = process.env.VCAP_APP_HOST; 
          var port = process.env.VCAP_APP_PORT;
          console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);    
          // Also parse out Cloudant settings.
          var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
    }
        
    var db = new pouchdb('books'),
      remote =cloudant.url + '/books';
      opts = {
        continuous: true
      };
     //Create a collection books
    db.replicate.to(remote, opts);
    db.replicate.from(remote, opts);
    
    //Deleting document book1
    db.get('book1', function(err, doc) {
        db.remove(doc, function(err, response) { 
            console.log(err || response);
        });
    });
    
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write("Deleted book1");
    res.end();
}; //End delete-records


//List Records from the books DB
var list_records = function(req, res) {
    
    if (process.env.VCAP_SERVICES) {
          // Running on Bluemix. Parse out the port and host that we've been assigned.
          var env = JSON.parse(process.env.VCAP_SERVICES);
          var host = process.env.VCAP_APP_HOST; 
          var port = process.env.VCAP_APP_PORT;
          console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);    

          // Also parse out Cloudant settings.
          var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
    }
        
    var db = new pouchdb('books'),
      remote =cloudant.url + '/books';
    opts = {
      continuous: true
     };
        
   //Create a collection books
    console.log(remote);
    db.replicate.to(remote, opts);
    db.replicate.from(remote, opts);    

    var docs = db.allDocs(function(err, response) { 
        val = response.total_rows;      
        var details = "";
        j=0;
        for(i=0; i < val; i++) {
                        
            
            db.get(response.rows[i].id, function (err,doc){
                 j++;   
                details= details + JSON.stringify(doc.Title) + " by  " +  JSON.stringify(doc.author) + "\n";
                // Kludge because of Node.js asynchronous handling. To be fixed - T V Ganesh
                if(j == val) {
                    
                    res.writeHead(200, {'Content-Type': 'text/plain'});
                    res.write(details);
                    res.end();
                    console.log(details);
                }           
               
           }); // End db.get
            
        } //End for 
    
     }); // End db.allDocs

   
  };


var port = (process.env.VCAP_APP_PORT || 1337);
var host = (process.env.VCAP_APP_HOST || '0.0.0.0');

//Create a Webserver and wait for REST API CRUD calls
require('http').createServer(function(req, res) {     
    if (req.url === '/index.html' || req.url === '/') {
        fs.readFile('./public/index.html', function (err, data){
            res.end(data);
        });
        return;
    }

    //Set up the DB connection
     if (process.env.VCAP_SERVICES) {
          // Running on Bluemix. Parse for  the port and host that we've been assigned.
          var env = JSON.parse(process.env.VCAP_SERVICES);
          var host = process.env.VCAP_APP_HOST; 
          var port = process.env.VCAP_APP_PORT;

          console.log('VCAP_SERVICES: %s', process.env.VCAP_SERVICES);    

          // Also parse out Cloudant settings.
          var cloudant = env['cloudantNoSQLDB'][0]['credentials'];
     }
    
     var db = new pouchdb('books'),
        remote =cloudant.url + '/books';      
        opts = {
          continuous: true
        };     
        console.log(remote);
        db.replicate.to(remote, opts);
        db.replicate.from(remote, opts);            
        console.log("Reached3");
        
     // Perform CRUD operations through REST APIs
        
      // Insert document
    if(req.method == 'POST') {
              //insert_records(req,res);           
        handlePost(req, res);
    }
      /*// List documents
      else if(req.method == 'GET') {   
              list_records(req,res);              
       }
       // Update a document
       else if(req.method == 'PUT') {
              update_records(req,res);
        }
        // Delete a document
         else if(req.method == 'DELETE') {
              delete_record(req,res);
        }*/      
  
}).listen(port, host);
console.log("Connected to port =" + port + " host =  " + host);
