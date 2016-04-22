  // This is called with the results from from FB.getLoginStatus().
  function statusChangeCallback(response) {
    console.log('statusChangeCallback');
    console.log(response);
    // The response object is returned with a status field that lets the
    // app know the current login status of the person.
    // Full docs on the response object can be found in the documentation
    // for FB.getLoginStatus().
    if (response.status === 'connected') {
      // Logged into your app and Facebook.
      testAPI();
    } else if (response.status === 'not_authorized') {
      // The person is logged into Facebook, but not your app.
      document.getElementById('status').innerHTML = 'Please log ' +
        'into this app.';
    } else {
      // The person is not logged into Facebook, so we're not sure if
      // they are logged into this app or not.
      document.getElementById('status').innerHTML = 'Please log ' +
        'into Facebook.';
    }
  }

  // This function is called when someone finishes with the Login
  // Button.  See the onlogin handler attached to it in the sample
  // code below.
  function checkLoginState() {
    FB.getLoginStatus(function(response) {
      statusChangeCallback(response);
    });
  }

window.fbAsyncInit = function() {
  FB.init({
      appId      : '637237206431651',
      xfbml      : true,
      version    : 'v2.6'
  });
};

  (function(d, s, id){
     var js, fjs = d.getElementsByTagName(s)[0];
     if (d.getElementById(id)) {return;}
     js = d.createElement(s); js.id = id;
     js.src = "//connect.facebook.net/en_US/sdk.js";
     fjs.parentNode.insertBefore(js, fjs);
   }(document, 'script', 'facebook-jssdk'));

  // Now that we've initialized the JavaScript SDK, we call 
  // FB.getLoginStatus().  This function gets the state of the
  // person visiting this page and can return one of three states to
  // the callback you provide.  They can be:
  //
  // 1. Logged into your app ('connected')
  // 2. Logged into Facebook, but not your app ('not_authorized')
  // 3. Not logged into Facebook and can't tell if they are logged into
  //    your app or not.
  //
  // These three cases are handled in the callback function.

  /*FB.getLoginStatus(function(response) {
    statusChangeCallback(response);
  });*/

  // Load the SDK asynchronously
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "//connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

  // Here we run a very simple test of the Graph API after login is
  // successful.  See statusChangeCallback() for when this call is made.
  function testAPI() {
    console.log('Welcome!  Fetching your information.... ');
    FB.api('/me', function(response) {
      console.log('Successful login for: ' + response.name);
      document.getElementById('status').innerHTML =
        'Thanks for logging in, ' + response.name + '!';
    });
  }

(function () {
    var url = 'roller-coaster-simulator.mybluemix.net';
    var button = document.getElementsByTagName('button')[0];

    var type = document.getElementById('select');
    var user = document.getElementById('user');
    var key = document.getElementById('key');
    var value = document.getElementById('value');
    var log = document.getElementById('log');
    
    button.addEventListener('click', function () { 
        var request = new XMLHttpRequest();
        request.addEventListener('readystatechange', function () {
            if (request.readyState === 4)
                log.textContent += request.response + '\n';
        });

        request.open('POST', url, true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify({
            type: type.value,
            user: user.value,
            key: key.value,
            value: value.value
        }));
    });
}());

(function () {
    'use strict';

    var url = 'roller-coaster-simulator.mybluemix.net';
    var user = 'TestUser';
    var projectList;

    function post(object, callback) {
        var request = new XMLHttpRequest();

        request.addEventListener('readystatechange', function () {
            if (request.readyState === 4)
                callback(JSON.parse(request.response));
        });

        request.open('POST', url, true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(JSON.stringify(object));
    }

    function refresh() {
        var ul = document.getElementById('project-list');

        while (ul.firstChild)
            ul.removeChild(ul.firstChild);

        post({ type: 'list', user: user }, function (response) {
            projectList = response.value || [];
            var length = projectList.length;

            if (length) {
                for (var i = 0; i < length; i++) {
                    var li = document.createElement('li');
                    var a = document.createElement('a');
                    a.textContent = projectList[i];
                    a.addEventListener('click', function () {
                        post({ type: 'get', user: user, key: this.textContent }, function (response) {
                            if (!response.error) {
                                alert('Project Data:' + JSON.stringify(response.value));
                            } else {
                                alert(response.error);
                            }
                        });
                    });
                    li.appendChild(a);
                    li.appendChild(document.createTextNode(' ('));
                    a = document.createElement('a');
                    a.textContent = 'delete';
                    a.addEventListener('click', function () {
                        if (confirm('Are you sure?')) {
                            post({ type: 'set', user: user, key: this.previousSibling.previousSibling.textContent }, function (response) {
                                refresh();
                            });
                        }
                    });
                    li.appendChild(a);
                    li.appendChild(document.createTextNode(')'));
                    ul.appendChild(li);
                }
            } else {
                var li = document.createElement('li');
                li.textContent = 'You have not created any projects yet :(';
                ul.appendChild(li);
            }
        });
    }

    function init() {  
        refresh();

        var createNewButton = document.getElementById('create-new-button');

        createNewButton.addEventListener('click', function () {
            var n = 1;
            while (projectList.indexOf('Project' + n) !== -1) n++;
            var key = prompt('Project name:', 'Project' + n);
            var request = {
                type: 'set',
                user: user,
                key: key,
                value: JSON.stringify({ dateCreated: Date.now() })
            };

            post(request, function (response) {
                if (!response.error) {
                    refresh();
                } else {
                    alert(response.error);
                }
            });
        }); 
    }

    init();
}());
