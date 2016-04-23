addEventListener('load', function () {
    'use strict';

    var url = document.location.hostname;
    var user = 'TestUser';
    var projectList;
    var $ = THREE, renderer, scene, camera, curve, train;
    var last = 0, velocity = 0, progress = 0;
    var currentCurves = 0;
    var coaster = [];

    function checkLoginState() {
        var status = document.getElementById('status');

        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                console.log('Welcome!  Fetching your information.... ');
                FB.api('/me', function(response) {
                    console.log('Successful login for: ' + response.name);
                    document.getElementById('status').innerHTML =
                    'Thanks for logging in, ' + response.name + '!';
                });
            } else if (response.status === 'not_authorized') {
                status.textContent = 'Please log into this app.';
            } else {
                status.textContent = 'Please log into Facebook.';
            }
        });
    }

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

    // Temporary vectors
    var v1 = new $.Vector3();
    var v2 = new $.Vector3();
    var v3 = new $.Vector3();
    var v4 = new $.Vector3();

    function createQuad(vertices, v1, v2, v3, v4) {
        vertices.push(
            v1.x, v1.y, v1.z,
            v2.x, v2.y, v2.z,
            v4.x, v4.y, v4.z,
            v2.x, v2.y, v2.z,
            v3.x, v3.y, v3.z,
            v4.x, v4.y, v4.z);
    }

    function createRepeated(vertices, v, count) {
        for (var i = 0; i < count; i++)
            vertices.push(v.x, v.y, v.z);
    }

    function createCircleVertices(radius, n) {
        var vertices = [];
        for (var a = 0, inc = Math.PI * 2 / n; a < Math.PI * 2; a += inc)
            vertices.push(new $.Vector3(Math.sin(a) * radius, Math.cos(a) * radius, 0));
        return vertices;
    }

    function Curve(ox, oy, oz, p, y, l, i, yi) {
        var point = new $.Vector3();
        var tangent = new $.Vector3();

        this.getPointAt = function (t) {
            return point.set(
                ox + 2.*t*(1. - 1.*t + t*Math.cos(0.5*y))*Math.cos(yi)*
                Math.sin(0.5*y) - 1.*l*t*Math.sin(yi) +
                t*Math.cos(i)*(l / Math.tan(yi) +
                    2.*(1. - 1.*t + t*Math.cos(0.5*y))*Math.sin(0.5*y))*
                Math.sin(yi) - 1.*l*t*Math.sin(i)*Math.tan(0.5*p) +
                l*Math.pow(t,2)*Math.sin(i)*Math.tan(0.5*p),
                oy + t*Math.cos(yi)*(l*Math.sin(i) +
                    2.*(1. - 1.*t + t*Math.cos(0.5*y))*Math.sin(0.5*y)) +
                t*(-1.*l + 2.*(1. - 1.*t + t*Math.cos(0.5*y))*Math.sin(i)*
                   Math.sin(0.5*y))*Math.sin(yi) +
                l*t*Math.cos(i)*Math.tan(0.5*p) -
                1.*l*Math.pow(t,2)*Math.cos(i)*Math.tan(0.5*p),
                oz + 2.*t*(1. - 1.*t + t*Math.cos(0.5*y))*Math.cos(yi)*
                Math.sin(0.5*y) - 1.*l*t*Math.sin(yi)
                ).multiplyScalar(20);
        };

        this.getTangentAt = function (t) {
            var delta = 0.0001;

            return tangent.copy(this.getPointAt(Math.min(1, t + delta)))
            .sub(this.getPointAt(Math.max(0, t - delta))).normalize();
        };
    }

    function EntireCurve() {
        var allCurves = [];

        var point = new $.Vector3();
        var tangent = new $.Vector3();

        this.curves = (function () {
            //coaster.push({1, 1, 1, 0, 0, 10, 0, Math.PI / 6});

            var c = new Curve(5, 5, 5, 0, 0, 10, 0, Math.PI / 6);
            var lastPoint = c.getPointAt(1);
            allCurves.push(c);
            
            for (var i = 0; i < currentCurves; i++) {
                var d = new Curve(lastPoint.x / 20, lastPoint.y / 20, lastPoint.z / 20, 0, 0, 4, 0, 0.1);
                lastPoint = d.getPointAt(1);
                allCurves.push(d);
            }

            return allCurves;
        }());

        this.getPointAt = function (t) {
            var numCurves = this.curves.length;

            return this.curves[(t == 1 ? (numCurves - 1) : Math.floor(t * numCurves))].getPointAt(t * numCurves - Math.floor(t * numCurves));
        };

        this.getTangentAt = function (t) {
            var delta = 0.0001;

            return tangent.copy(this.getPointAt(Math.min(1, t + delta)))
            .sub(this.getPointAt(Math.max(0, t - delta))).normalize();
        }
    }

    function RollerCoasterGeometry(size) {
        $.BufferGeometry.call(this);

        var color1 = new $.Vector3(0.8, 0.8, 0.8);
        var color2 = new $.Vector3(0.8, 0.8, 0);

        var triangle = [
        new $.Vector3(-2.25, 0, 0),
        new $.Vector3(0, -0.5, 0),
        new $.Vector3(0, -1.75, 0),
        new $.Vector3(0, -0.5, 0),
        new $.Vector3(2.25, 0, 0),
        new $.Vector3(0, -1.75, 0)
        ];

        var vertices = [];
        var normals = [];
        var colors = [];
        var up = new $.Vector3(0, 1, 0);
        var forward = new $.Vector3();
        var right = new $.Vector3();
        var offset = new $.Vector3();
        var quaternion = new $.Quaternion();
        var prevQuaternion = new $.Quaternion();
        prevQuaternion.setFromAxisAngle(up, Math.PI / 2);
        var point = new $.Vector3();
        var prevPoint = curve.getPointAt(0).clone();
        var circle1 = createCircleVertices(0.6, 5);
        var circle2 = createCircleVertices(0.25, 5);

        function drawShape(shape, color) {
            var n = shape.length;

            for (var i = 0; i < n; i++) {
                v1.copy(shape[i]).applyQuaternion(quaternion).add(point);
                vertices.push(v1.x, v1.y, v1.z);
            }

            for (var j = n - 1; j >= 0; j--) {
                v1.copy(shape[j]).applyQuaternion(quaternion).add(point);
                vertices.push(v1.x, v1.y, v1.z);
            }

            v1.set(0, 0, -1).applyQuaternion(quaternion);
            createRepeated(normals, v1, n);
            v1.set(0, 0, 1).applyQuaternion(quaternion);
            createRepeated(normals, v1, n);

            createRepeated(colors, color, n * 2);
        }

        function extrudeShape(shape, offset, color) {
            var n = shape.length;
            for (var j = 0; j < n; j++) {
                var point1 = shape[j];
                var point2 = shape[(j + 1) % n];

                v1.copy(point1).add(offset).applyQuaternion(quaternion).add(point);
                v2.copy(point2).add(offset).applyQuaternion(quaternion).add(point);
                v3.copy(point2).add(offset).applyQuaternion(prevQuaternion).add(prevPoint);
                v4.copy(point1).add(offset).applyQuaternion(prevQuaternion).add(prevPoint);
                createQuad(vertices, v1, v2, v3, v4);

                v1.copy(point1).applyQuaternion(quaternion).normalize();
                v2.copy(point2).applyQuaternion(quaternion).normalize();
                v3.copy(point2).applyQuaternion(prevQuaternion).normalize();
                v4.copy(point1).applyQuaternion(prevQuaternion).normalize();
                createQuad(normals, v1, v2, v3, v4);
            }

            createRepeated(colors, color, n * 6);
        }

        for (var i = 1; i <= size; i++) {
            point.copy(curve.getPointAt(i / size));
            up.set(0, 1, 0);
            forward.subVectors(point, prevPoint).normalize();
            right.crossVectors(up, forward).normalize();
            up.crossVectors(forward, right);
            quaternion.setFromAxisAngle(up, Math.atan2(forward.x, forward.z));

            drawShape(triangle, color2);
            extrudeShape(circle1, offset.set(0, -1.25, 0), color2);
            extrudeShape(circle2, offset.set(2, 0, 0), color1);
            extrudeShape(circle2, offset.set(-2, 0, 0), color1);

            prevPoint.copy(point);
            prevQuaternion.copy(quaternion);
        }

        this.addAttribute('position', new $.BufferAttribute(new Float32Array(vertices), 3));
        this.addAttribute('normal', new $.BufferAttribute(new Float32Array(normals), 3));
        this.addAttribute('color', new $.BufferAttribute(new Float32Array(colors), 3));
    }

    function RollerCoasterLiftersGeometry(size) {
        $.BufferGeometry.call(this);

        var tube1 = [new $.Vector3(0, 0.5, -0.5), new $.Vector3(0, 0.5, 0.5), new $.Vector3(0, -0.5, 0)];
        var tube2 = [new $.Vector3(-0.5, 0, 0.5), new $.Vector3(-0.5, 0, -0.5), new $.Vector3(0.5, 0, 0)];
        var tube3 = [new $.Vector3(0.5, 0, -0.5), new $.Vector3(0.5, 0, 0.5), new $.Vector3(-0.5, 0, 0)];

        var vertices = [];
        var normals = [];
        var quaternion = new $.Quaternion();
        var up = new $.Vector3(0, 1, 0);
        var point = new $.Vector3();
        var tangent = new $.Vector3();
        var fromPoint = new $.Vector3();
        var toPoint = new $.Vector3();

        function extrudeShape(shape) {
            for (var j = 0, n = shape.length; j < n; j++) {
                var point1 = shape[j];
                var point2 = shape[(j + 1) % n];

                v1.copy(point1).applyQuaternion(quaternion).add(fromPoint);
                v2.copy(point2).applyQuaternion(quaternion).add(fromPoint);
                v3.copy(point2).applyQuaternion(quaternion).add(toPoint);
                v4.copy(point1).applyQuaternion(quaternion).add(toPoint);
                createQuad(vertices, v1, v2, v3, v4);

                v1.copy(point1).applyQuaternion(quaternion).normalize();
                v2.copy(point2).applyQuaternion(quaternion).normalize();
                v3.copy(point2).applyQuaternion(quaternion).normalize();
                v4.copy(point1).applyQuaternion(quaternion).normalize();
                createQuad(normals, v1, v2, v3, v4);
            }
        }

        for (var i = 1; i <= size; i++) {
            point.copy(curve.getPointAt(i / size));
            tangent.copy(curve.getTangentAt(i / size));

            quaternion.setFromAxisAngle(up, Math.atan2(tangent.x, tangent.z));

            if (point.y > 100) {
                fromPoint.set(-7.5, -3.5, 0).applyQuaternion(quaternion).add(point);
                toPoint.set(7.5, -3.5, 0).applyQuaternion(quaternion).add(point);
                extrudeShape(tube1);

                fromPoint.set(-7, -3, 0).applyQuaternion(quaternion).add(point);
                toPoint.set(-7, -point.y, 0).applyQuaternion(quaternion).add(point);
                extrudeShape(tube2);

                fromPoint.set(7, -3, 0).applyQuaternion(quaternion).add(point);
                toPoint.set(7, -point.y, 0).applyQuaternion(quaternion).add(point);
                extrudeShape(tube3);
            } else {
                fromPoint.set(0, -2, 0).applyQuaternion(quaternion).add(point);
                toPoint.set(0, -point.y, 0).applyQuaternion(quaternion).add(point);
                extrudeShape(tube3);
            }
        }

        this.addAttribute('position', new $.BufferAttribute(new Float32Array(vertices), 3));
        this.addAttribute('normal', new $.BufferAttribute(new Float32Array(normals), 3));
    }

    function RollerCoasterShadowGeometry(size) {
        $.BufferGeometry.call(this);

        var vertices = [];
        var up = new $.Vector3(0, 1, 0);
        var forward = new $.Vector3();
        var quaternion = new $.Quaternion();
        var prevQuaternion = new $.Quaternion().setFromAxisAngle(up, Math.PI / 2);
        var point = new $.Vector3();
        var prevPoint = curve.getPointAt(0).clone().setY(0);

        for (var i = 1; i <= size; i++) {
            point.copy(curve.getPointAt(i / size)).setY(0);
            forward.subVectors(point, prevPoint);
            quaternion.setFromAxisAngle(up, Math.atan2(forward.x, forward.z));

            v1.set(-3, 0, 0).applyQuaternion(quaternion).add(point);
            v2.set(3, 0, 0).applyQuaternion(quaternion).add(point);
            v3.set(3, 0, 0).applyQuaternion(prevQuaternion).add(prevPoint);
            v4.set(-3, 0, 0).applyQuaternion(prevQuaternion).add(prevPoint);
            createQuad(vertices, v1, v2, v3, v4);

            prevPoint.copy(point);
            prevQuaternion.copy(quaternion);
        }

        this.addAttribute('position', new $.BufferAttribute(new Float32Array(vertices), 3));
    }

    function SkyGeometry(count) {
        $.BufferGeometry.call(this);

        var vertices = [];

        while (count--) {
            var x = Math.random() * 8000 - 4000;
            var y = Math.random() * 500 + 500;
            var z = Math.random() * 8000 - 4000;
            var size = Math.random() * 400 + 200;

            vertices.push(x - size, y, z - size);
            vertices.push(x + size, y, z - size);
            vertices.push(x - size, y, z + size);

            vertices.push(x + size, y, z - size);
            vertices.push(x + size, y, z + size);
            vertices.push(x - size, y, z + size);
        }

        this.addAttribute('position', new $.BufferAttribute(new Float32Array(vertices), 3));
    }

    function TreesGeometry(landscape) {
        $.BufferGeometry.call(this);

        var vertices = [];
        var colors = [];
        var raycaster = new $.Raycaster();
        raycaster.ray.direction.set(0, -1, 0);

        for (var i = 0; i < 2000; i++) {
            var x = Math.random() * 5000 - 2500;
            var z = Math.random() * 5000 - 2500;
            raycaster.ray.origin.set(x, 500, z);
            var intersections = raycaster.intersectObject(landscape);
            if (intersections.length === 0)
                continue;
            var y = intersections[0].point.y;
            var height = Math.random() * 50 + 5;

            var angle = Math.random() * Math.PI * 2;
            vertices.push(x + Math.sin(angle) * 10, y, z + Math.cos(angle) * 10);
            vertices.push(x, y + height, z);
            vertices.push(x + Math.sin(angle + Math.PI) * 10, y, z + Math.cos(angle + Math.PI) * 10);

            angle += Math.PI / 2;
            vertices.push(x + Math.sin(angle) * 10, y, z + Math.cos(angle) * 10);
            vertices.push(x, y + height, z);
            vertices.push(x + Math.sin(angle + Math.PI) * 10, y, z + Math.cos(angle + Math.PI) * 10);

            var random = Math.random() * 0.1;
            for (var j = 0; j < 6; j++)
                colors.push(0.2 + random, 0.4 + random, 0);
        }

        this.addAttribute('position', new $.BufferAttribute(new Float32Array(vertices), 3));
        this.addAttribute('color', new $.BufferAttribute(new Float32Array(colors), 3));
    }

    function createEnvironment() {
        // Land
        var geometry = new $.PlaneGeometry(5000, 5000, 15, 15);
        geometry.applyMatrix(new $.Matrix4().makeRotationX(-Math.PI / 2));

        for (var i = 0; i < geometry.vertices.length; i++) {
            var vertex = geometry.vertices[i];
            vertex.x += Math.random() * 100 - 50;
            vertex.y = Math.random() * Math.max(0, (vertex.distanceTo(scene.position) / 5) - 250);
            vertex.z += Math.random() * 100 - 50;
        }

        geometry.computeFaceNormals();

        var mesh = new $.Mesh(geometry, new $.MeshLambertMaterial({
            color: 0x407000,
            shading: $.FlatShading
        }));
        scene.add(mesh);

        // Trees
        scene.add(new $.Mesh(
            new TreesGeometry(mesh),
            new $.MeshBasicMaterial({
                side: $.DoubleSide,
                vertexColors: $.VertexColors
            })));

        // Sky
        scene.add(new $.Mesh(
            new SkyGeometry(20),
            new $.MeshBasicMaterial({
                color: 0xffffff
            })));
    }

    function createRollerCoaster() {
        scene.add(new $.Mesh(
            new RollerCoasterGeometry(35),
            new $.MeshStandardMaterial({
                roughness: 0.1,
                metalness: 0,
                vertexColors: $.VertexColors
            })));

        var mesh = new $.Mesh(
            new RollerCoasterLiftersGeometry(10 + currentCurves * 10),
            new $.MeshStandardMaterial({
                roughness: 0.1,
                metalness: 0
            }));
        mesh.position.y = 1;
        scene.add(mesh);

        mesh = new $.Mesh(
            new RollerCoasterShadowGeometry(20),
            new $.MeshBasicMaterial({
                color: 0x000000,
                opacity: 0.1,
                depthWrite: false,
                transparent: true
            }));
        mesh.position.y = 1;
        scene.add(mesh);
    }

    function onResize() {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    }

    var cameraVelocity = new $.Vector3(); 
    var cameraRotation = 0;
    var quaternion = new $.Quaternion();

    function updateCamera() {
        var tmp = cameraVelocity.clone().normalize().multiplyScalar(10);
        camera.position.add(tmp);
        camera.rotation.order = 'YXZ';
        camera.rotation.y += cameraRotation;
    }

    function animate(time) {
        requestAnimationFrame(animate);
/*
        var delta = time - last;
        last = time;

        progress = (progress + velocity * delta / 1000) % 1;
        train.position.copy(curve.getPointAt(progress));
        train.position.y += 3;

        var tangent = curve.getTangentAt(progress);
        velocity = Math.max(velocity - tangent.y * 0.000030, 0.0008);
        train.lookAt(train.position.clone().add(tangent));
        */
        updateCamera();
        renderer.render(scene, camera);
    }

    function onKeyDown(e) {
        var fwd = camera.getWorldDirection();
        cameraVelocity.set(0, 0, 0);
        switch (e.keyCode) {
            // Height
            case 82: /* R */ cameraVelocity.y = 1; break;
            case 70: /* F */ cameraVelocity.y = -1; break;

            // Zoom In/Out
            case 87: /* W */ cameraVelocity.add(fwd); break;
            case 83: /* S */ cameraVelocity.sub(fwd); break;

            // Rotate Left/Right
            case 68: /* D */ cameraRotation = Math.PI/360; break;
            case 65: /* A */ cameraRotation = -Math.PI/360; break;

            // Panning
            case 39: /* Right */ cameraVelocity.x = 1; break;
            case 37: /* Left */ cameraVelocity.x = -1; break;
            case 40: /* Down */ cameraVelocity.z = 1; break;
            case 38: /* Up */ cameraVelocity.z = -1; break;

            //temporarily add new straight piece
            case 74:        break;
        }
    }

    function onKeyUp(e) {
        switch (e.keyCode) {
            case 82: /* R */ case 70: /* F */
            cameraVelocity.y = 0; break;

            // Zoom In/Out
            case 87: /* W */ case 83: /* S */
            cameraVelocity.set(0, 0, 0); break;

            // Rotation Left/Right
            case 68: /* D */ case 65: /* A */
            cameraRotation = 0; break;

            // Panning
            case 39: /* Right */ case 37: /* Left */
            cameraVelocity.x = 0; break;
            case 40: /* Down */ case 38: /* Up */
            cameraVelocity.z = 0; break;
        }
    }

    function initialize() {
        RollerCoasterGeometry.prototype =
        RollerCoasterLiftersGeometry.prototype =
        RollerCoasterShadowGeometry.prototype =
        SkyGeometry.prototype =
        TreesGeometry.prototype = $.BufferGeometry.prototype;

        renderer = new $.WebGLRenderer({ antialias: false });
        renderer.setClearColor(0xd0d0ff);
        renderer.setPixelRatio(devicePixelRatio);
        scene = new $.Scene();
        camera = new $.PerspectiveCamera(40, innerWidth / innerHeight, 1, 5000);
        camera.position.x = 1000;
        camera.position.y = 1000;
        camera.position.z = 1000;
        train = new $.Object3D();
        camera.lookAt(train.position);
        scene.add(train);
        scene.add(new $.HemisphereLight(0xfff0f0, 0x606066));
        curve = new EntireCurve();

        createEnvironment();
        createRollerCoaster();
        onResize();

        var loginButton = document.getElementsByTagName('fb:login-button');
        loginButton.onlogin = checkLoginState;

        var domElement = renderer.domElement;
        var style = domElement.style;

        style.position = 'fixed';
        style.top = style.left = '0';
        style.background = 'black';

        document.body.appendChild(renderer.domElement);
        requestAnimationFrame(animate);
        addEventListener('resize', onResize);
        addEventListener('keydown', onKeyDown);
        addEventListener('keyup', onKeyUp);
    }

    initialize();
});
