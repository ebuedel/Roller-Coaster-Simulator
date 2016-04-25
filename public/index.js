(function (window) {
    'use strict';

    var $, $window, $document, _, FB, JSON, Math,
        app, renderer, scene, curve, train,
        userInterface, flyControls, upVector, v1, v2, v3, v4;

    function fbAsyncInit() {
        FB.init({
            appId: '637237206431651',
            xfbml: true,
            version: 'v2.6'
        });
    };

    function isUndefined(x) {
        return typeof x === 'undefined';
    }

    function removeElement(element) {
        element.parentNode.removeChild(element);
    }

    function postJSON(object, success) {
        $.ajax({
            type: 'POST',
            url: window.location.hostname,
            data: JSON.stringify(object),
            success: success,
            contentType: "application/json",
            dataType: 'json'
        });
    }

    function checkLoginState() {
        var fbLoginStatus = $('#fb-login-status');

        FB.getLoginStatus(function (response) {
            if (response.status === 'connected') {
                FB.api('/me', function(response) {
                    $('#status').html('Thanks for logging in, ' + response.name + '!');
                    // TODO: Add sign out button.
                    // TODO: Set current user and enable all save related functionality.
                });
            } else if (response.status === 'not_authorized') {
                fbLoginStatus.text('Please log into this app.');
            } else {
                fbLoginStatus.text('Please log into Facebook.');
            }
        });
    }

    function EventMap(namespace, events) {
        events.forEach(function (e) {
            e[0].on(e[1] + '.' + namespace, e[2]);
        });

        this.dispose = function () {
            events.forEach(function (e) {
                e[0].off(e[1] + '.' + namespace);
            });
        }
    }

    function FlyControls(camera, movementSpeed) {
        var borderPercent = 1 / 50, minimumBorder = 10,
            eventMap, velocity, rotation, totalRotation, borderSize;

        function getCameraXZRotation() {
            var direction = camera.getWorldDirection().multiplyScalar(-1);
            return -Math.atan2(direction.x, direction.z);
        }

        function getBorderSize() {
            return Math.min(
                minimumBorder,
                $window.width() * borderPercent,
                $window.height() * borderPercent);
        }

        function onWindowResize() {
            borderSize = getBorderSize();
        }

        function onWindowKeyDown(e) {
            var forward = camera.getWorldDirection();

            switch (e.keyCode) {
                case 39: /* Right */ velocity.x = 1; break;
                case 37: /* Left */ velocity.x = -1; break;
                case 40: /* Down */ velocity.z = 1; break;
                case 38: /* Up */ velocity.z = -1; break;
                case 82: /* R */ velocity.y = 1; break;
                case 70: /* F */ velocity.y = -1; break;
                case 87: /* W */ velocity = forward.clone(); break;
                case 83: /* S */ velocity = forward.clone().multiplyScalar(-1); break;
                case 68: /* D */ rotation = Math.PI/180; break;
                case 65: /* A */ rotation = -Math.PI/180; break;
            }
        }

        function onWindowKeyUp(e) {
            switch (e.keyCode) {
                case 39: /* Right */ case 37: /* Left */ velocity.x = 0; break;
                case 40: /* Down */ case 38: /* Up */ velocity.z = 0; break;
                case 82: /* R */ case 70: /* F */ velocity.y = 0; break;
                case 87: /* W */ case 83: /* S */ velocity.set(0, 0, 0); break;
                case 68: /* D */ case 65: /* A */ rotation = 0; break;
            }
        }

        function onWindowMouseMove(e) {
            var x = e.pageX, y = e.pageY;
            velocity.x = x > $window.width() - borderSize ? 1 : (x < borderSize ? -1 : 0);
            velocity.z = y > $window.height() - borderSize ? 1 : (y < borderSize ? -1 : 0);
        }

        function onDocumentMouseOut(e) {
            e = e ? e : window.event;
            var from = e.relatedTarget || e.toElement;
            if (!from || from.nodeName == "HTML")
                velocity.x = velocity.z = 0;
        }

        function update() {
            v1.copy(velocity)
                .applyAxisAngle(upVector, totalRotation += rotation)
                .multiplyScalar(movementSpeed);

            camera.position.add(v1);
            camera.rotation.order = 'YXZ';
            camera.rotation.y += rotation;
        }

        function dispose() {
            eventMap.dispose();
        }

        velocity = new _.Vector3();
        rotation = 0;
        totalRotation = getCameraXZRotation();
        borderSize = getBorderSize();
        eventMap = new EventMap('flyControls', [
            [ $window, 'keydown', onWindowKeyDown ],
            [ $window, 'keyup', onWindowKeyUp ],
            [ $window, 'resize', onWindowResize ],
            [ $window, 'mousemove', onWindowMouseMove ],
            [ $document, 'mouseout', onDocumentMouseOut ]
        ]);
        this.camera = camera;
        this.update = update;
        this.dispose = dispose;
    }

    function UserInterface() {
        function onNewButtonClicked() {
            // TODO: Save the current roller coaster.
            app.createNewProject(function (name) {
                $('#project-name').text(name);
                $('#project-name-wrapper').show();
                // TODO: Clear current roller coaster.
            }, alert);
        }

        function onOpenButtonClicked() {
            var table = $('#project-list');
            table.html('<tr><th>Filename</th><th>Last Modified</th><th>Size</th></tr>');

            app.getProjectList(function (list) {
                showMetroDialog('#file-open-dialog');

                var length = list.length;

                if (length) {
                    for (var i = 0; i < length; i++) {
                        var tr = $('<tr>');
                        var td = $('<td>');
                        var a = $('<a>');
                        a.text(list[i]);
                        a.click(function () {
                            var name = this.textContent;
                            app.loadProject(name, function (value) {
                                $('#project-name').text(name);
                                $('#project-name-wrapper').show();
                                hideMetroDialog('#file-open-dialog');
                            }, alert);
                        });
                        td.append(a);
                        tr.append(td);
                        tr.append($('<td>'));
                        tr.append($('<td>'));
                        table.append(tr);
                    }
                } else {
                    var tr = $('<tr>');
                    var td = $('<td>');
                    td.text('You have not created any projects yet.');
                    tr.append(td);
                    table.append(tr);
                }
            });
        }

        function onRenameButtonClicked() {
            // TODO: Ensure that new name is not already taken.
            // TODO: Delete current roller coaster.
            // TODO: Save current roller coaster under new name.
            showMetroDialog('#file-rename-dialog');
        }

        function onDeleteButtonClicked() {
            app.deleteCurrentProject(function () {
                $('#project-name-wrapper').hide();
            }, alert);
        }

        function onUndoButtonClicked() {
            app.deleteRollerCoaster();
            curve.undo();
            app.updateRollerCoaster();
        }

        function onRedoButtonClicked() {
            app.deleteRollerCoaster();
            curve.redo();
            app.updateRollerCoaster();
        }

        function onOptionsButtonClicked() {
            showMetroDialog('#options-dialog');
        }

        function onOptionsDialogSaveButtonClicked() {
            var newValue = $('#options-dialog-antialias').is(':checked');
            if (newValue != this.currentAntialiasValue)
                createRenderer({ antialias: this.currentAntialiasValue = newValue });
            hideMetroDialog('#options-dialog');
        }

        function onPlayButtonClicked() {
            var text = $('#play-button > .text');
            text.text({ Play: 'Stop', Stop: 'Play' }[text.text()]);
            $('#play-button > .icon').toggleClass('mif-play').toggleClass('mif-stop');
            // TODO: Play the roller coaster.
        }

        function getSliderValue(selector) {
            return window.parseInt($(selector + ' > .slider-hint').text());
        }

        function onCreateButtonClicked() {
            var yaw = getSliderValue('#yaw-slider') * Math.PI / 180;
            var pitch = getSliderValue('#pitch-slider') * Math.PI / 180;
            var length = getSliderValue('#length-slider');

            app.deleteRollerCoaster();
            curve.add(pitch, yaw, length);
            app.updateRollerCoaster();
        }

        // TODO: Try to load this from localstorage.
        var antialias = this.currentAntialiasValue =
            window.screen.width * window.screen.height <= 1920 * 1080
        $('#options-dialog-antialias').prop('checked', antialias);

        $('#project-name').click(onRenameButtonClicked);
        $('#file-new-button').click(onNewButtonClicked)
        $('#file-open-button').click(onOpenButtonClicked);
        $('#file-rename-button').click(onRenameButtonClicked);
        $('#file-rename-ok-button').click(function () {});
        $('#file-delete-button').click(onDeleteButtonClicked);
        $('#edit-undo-button').click(onUndoButtonClicked);
        $('#edit-redo-button').click(onRedoButtonClicked);
        $('#options-button').click(onOptionsButtonClicked);
        $('#options-dialog-save-button').click(onOptionsDialogSaveButtonClicked);
        $('#play-button').click(onPlayButtonClicked);
        $('#create-button').click(onCreateButtonClicked);
        $('#fb-login-button').onlogin = checkLoginState;
    }

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
            vertices.push(new _.Vector3(Math.sin(a) * radius, Math.cos(a) * radius, 0));
        return vertices;
    }

    function Curve(ox, oy, oz, p, y, l, i, yi) {
        var point = new _.Vector3();
        var tangent = new _.Vector3();

        this.getPitch = function () {
            return p + yi;
        };

        this.getYaw = function () {
            return y + i + 1e-10;
        };

        this.getLength = function () {
            return l;
        };

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

    function CurveCollection(firstCurve) {
        this.length = 1;
        this.sum = firstCurve ? firstCurve.getLength() : 5;
        var point = new _.Vector3();
        var tangent = new _.Vector3();
        var curves = [ firstCurve || new Curve(2, 2, 2, 0, 0, 5, 0, 1e-10) ];
        var redoBuffer = [];

        this.add = function (p, y, l) {
            if (length !== 0) {
                redoBuffer = [];
                var lastCurve = curves[curves.length - 1];
                var last = lastCurve.getPointAt(1);
                curves.push(new Curve(last.x / 20, last.y / 20, last.z / 20, p, y, l, lastCurve.getPitch(), lastCurve.getYaw()));
                this.length++;
                this.sum += l;
                console.log(this.sum);
            }
        };
        
        this.undo = function () {
            if (curves.length > 1) {
                var c = curves.pop();
                this.sum -= c.getLength();
                redoBuffer.push(c);
                this.length--;
                console.log(this.sum);
            }
        };

        this.redo = function () {
            if (redoBuffer.length > 0) {
                var c = redoBuffer.pop();
                this.sum += c.getLength();
                curves.push(c);
                this.length++;
                console.log(this.sum);
            }
        };

        this.getPointAt = function (t) {
            var length = curves.length;
            return curves[(t == 1 ? (length - 1) : Math.floor(t * length))]
                .getPointAt(t * length - Math.floor(t * length));
        };

        this.getTangentAt = function (t) {
            var delta = 0.0001;
            return tangent.copy(this.getPointAt(Math.min(1, t + delta)))
                .sub(this.getPointAt(Math.max(0, t - delta))).normalize();
        };

        this.serialize = function () {
            var a = [];
            curves.forEach(function (c) {
                a.push([c.getPitch(), c.getYaw(), c.getLength()]);
            });
            return {
                modified: Date.now(),
                format: [ 'pitch', 'yaw', 'length' ],
                curves: a
            };
        };
    }

    CurveCollection.parse = function (obj) {
        var objFormat = obj.format;
        var objCurves = obj.curves;

        if (isUndefined(objFormat) || isUndefined(objCurves))
            return null;

        var indices = {};
        objFormat.forEach(function (s, i) {
            indices[s] = i;
        });

        var pitch = indices.pitch;
        var yaw = indices.yaw;
        var length = indices.length;

        var curves = new CurveCollection(obj.curves.shift());
        objCurves.forEach(function (c) {
            curves.add(c[pitch], c[yaw], c[length]);
        });

        return curves;
    };

    function RollerCoasterGeometry(size) {
        _.BufferGeometry.call(this);

        var color1 = new _.Vector3(0.8, 0.8, 0.8);
        var color2 = new _.Vector3(0.8, 0.8, 0);

        var triangle = [
            new _.Vector3(-2.25, 0, 0),
            new _.Vector3(0, -0.5, 0),
            new _.Vector3(0, -1.75, 0),
            new _.Vector3(0, -0.5, 0),
            new _.Vector3(2.25, 0, 0),
            new _.Vector3(0, -1.75, 0)
        ];

        var vertices = [];
        var normals = [];
        var colors = [];
        var forward = new _.Vector3();
        var right = new _.Vector3();
        var offset = new _.Vector3();
        var quaternion = new _.Quaternion();
        var prevQuaternion = new _.Quaternion();
        prevQuaternion.setFromAxisAngle(upVector, Math.PI / 2);
        var point = new _.Vector3();
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

        for (var i = 1; i < size; i++) {
            point.copy(curve.getPointAt(i / size));
            v1.set(0, 1, 0);
            forward.subVectors(point, prevPoint).normalize();
            right.crossVectors(v1, forward).normalize();
            v1.crossVectors(forward, right);
            quaternion.setFromAxisAngle(v1, Math.atan2(forward.x, forward.z));

            drawShape(triangle, color2);
            extrudeShape(circle1, offset.set(0, -1.25, 0), color2);
            extrudeShape(circle2, offset.set(2, 0, 0), color1);
            extrudeShape(circle2, offset.set(-2, 0, 0), color1);

            prevPoint.copy(point);
            prevQuaternion.copy(quaternion);
        }

        this.addAttribute('position', new _.BufferAttribute(new Float32Array(vertices), 3));
        this.addAttribute('normal', new _.BufferAttribute(new Float32Array(normals), 3));
        this.addAttribute('color', new _.BufferAttribute(new Float32Array(colors), 3));
    }

    function RollerCoasterLiftersGeometry(size) {
        _.BufferGeometry.call(this);

        var tube1 = [new _.Vector3(0, 0.5, -0.5), new _.Vector3(0, 0.5, 0.5), new _.Vector3(0, -0.5, 0)];
        var tube2 = [new _.Vector3(-0.5, 0, 0.5), new _.Vector3(-0.5, 0, -0.5), new _.Vector3(0.5, 0, 0)];
        var tube3 = [new _.Vector3(0.5, 0, -0.5), new _.Vector3(0.5, 0, 0.5), new _.Vector3(-0.5, 0, 0)];

        var vertices = [];
        var normals = [];
        var quaternion = new _.Quaternion();
        var point = new _.Vector3();
        var tangent = new _.Vector3();
        var fromPoint = new _.Vector3();
        var toPoint = new _.Vector3();

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

        for (var i = 0; i < size; i++) {
            point.copy(curve.getPointAt(i / size));
            tangent.copy(curve.getTangentAt(i / size));

            quaternion.setFromAxisAngle(upVector, Math.atan2(tangent.x, tangent.z));

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

        this.addAttribute('position', new _.BufferAttribute(new Float32Array(vertices), 3));
        this.addAttribute('normal', new _.BufferAttribute(new Float32Array(normals), 3));
    }

    function RollerCoasterShadowGeometry(size) {
        // TODO: Project shadow onto landscape.
        _.BufferGeometry.call(this);

        var vertices = [];
        var forward = new _.Vector3();
        var quaternion = new _.Quaternion();
        var prevQuaternion = new _.Quaternion().setFromAxisAngle(upVector, Math.PI / 2);
        var point = new _.Vector3();
        var prevPoint = curve.getPointAt(0).clone().setY(0);

        for (var i = 1; i < size; i++) {
            point.copy(curve.getPointAt(i / size)).setY(0);
            forward.subVectors(point, prevPoint);
            quaternion.setFromAxisAngle(upVector, Math.atan2(forward.x, forward.z));

            v1.set(-3, 0, 0).applyQuaternion(quaternion).add(point);
            v2.set(3, 0, 0).applyQuaternion(quaternion).add(point);
            v3.set(3, 0, 0).applyQuaternion(prevQuaternion).add(prevPoint);
            v4.set(-3, 0, 0).applyQuaternion(prevQuaternion).add(prevPoint);
            createQuad(vertices, v1, v2, v3, v4);

            prevPoint.copy(point);
            prevQuaternion.copy(quaternion);
        }

        this.addAttribute('position', new _.BufferAttribute(new Float32Array(vertices), 3));
    }

    function SkyGeometry(count) {
        _.BufferGeometry.call(this);

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

        this.addAttribute('position', new _.BufferAttribute(new Float32Array(vertices), 3));
    }

    function TreesGeometry(landscape) {
        _.BufferGeometry.call(this);

        var vertices = [];
        var colors = [];
        var raycaster = new _.Raycaster();
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

        this.addAttribute('position', new _.BufferAttribute(new Float32Array(vertices), 3));
        this.addAttribute('color', new _.BufferAttribute(new Float32Array(colors), 3));
    }

    function createRenderer() {
        if (!isUndefined(renderer)) removeElement(renderer.domElement);

        renderer = new _.WebGLRenderer({ antialias: false });
        renderer.setClearColor(0xd0d0ff);
        renderer.setPixelRatio(devicePixelRatio);

        $window.trigger('resize');
        $('body').append(renderer.domElement);
    }

    function App() {
        var coasterGeo,
            liftersGeo,
            shadowGeo,
            currentUser = 'TestUser',
            currentProjectName = null;

        function createEnvironment(scene) {
            // Land
            var geometry = new _.PlaneGeometry(5000, 5000, 15, 15);
            geometry.applyMatrix(new _.Matrix4().makeRotationX(-Math.PI / 2));

            for (var i = 0; i < geometry.vertices.length; i++) {
                var vertex = geometry.vertices[i];
                vertex.x += Math.random() * 100 - 50;
                vertex.y = Math.random() * Math.max(0, (vertex.distanceTo(scene.position) / 5) - 250);
                vertex.z += Math.random() * 100 - 50;
            }

            geometry.computeFaceNormals();

            var mesh = new _.Mesh(geometry, new _.MeshLambertMaterial({
                color: 0x407000,
                shading: _.FlatShading
            }));
            scene.add(mesh);

            // Trees
            scene.add(new _.Mesh(
                new TreesGeometry(mesh),
                new _.MeshBasicMaterial({
                    side: _.DoubleSide,
                    vertexColors: _.VertexColors
                })));

            // Sky
            scene.add(new _.Mesh(
                new SkyGeometry(20),
                new _.MeshBasicMaterial({
                    color: 0xffffff
                })));
        }

        function createRollerCoaster(scene) {
            var length = curve.length;
            var sum = curve.sum;
            console.log('s: ' + sum);

            scene.add(new _.Mesh(
                coasterGeo = new RollerCoasterGeometry(sum),
                new _.MeshStandardMaterial({
                    roughness: 0.1,
                    metalness: 0,
                    vertexColors: _.VertexColors
                })));

            var mesh = new _.Mesh(
                liftersGeo = new RollerCoasterLiftersGeometry(10),
                new _.MeshStandardMaterial({
                    roughness: 0.1,
                    metalness: 0
                }));
            mesh.position.y = 1;
            scene.add(mesh);

            mesh = new _.Mesh(
                shadowGeo = new RollerCoasterShadowGeometry(sum),
                new _.MeshBasicMaterial({
                    color: 0x000000,
                    opacity: 0.1,
                    depthWrite: false,
                    transparent: true
                }));
            mesh.position.y = 1;
            scene.add(mesh);
        }

        function deleteRollerCoaster() {
            coasterGeo.removeAttribute('position');
            coasterGeo.removeAttribute('normal');
            coasterGeo.removeAttribute('color');
            liftersGeo.removeAttribute('position');
            liftersGeo.removeAttribute('normal');
            shadowGeo.removeAttribute('position');
        }

        // XXX: Modifies globals: train, flyControls, ...
        function createScene() {
            train = new _.Object3D();

            var camera = new _.PerspectiveCamera(40, $window.width() / $window.height(), 1, 5000);
            camera.position.x = 0;
            camera.position.y = 300;
            camera.position.z = 300;
            camera.lookAt(new _.Vector3(0, 0, 0));

            flyControls = new FlyControls(camera, 5);

            var scene = new _.Scene();
            scene.add(train);
            scene.add(new _.HemisphereLight(0xfff0f0, 0x606066));

            createEnvironment(scene);
            createRollerCoaster(scene);

            $window.resize(function () {
                camera.aspect = $window.width() / $window.height();
                camera.updateProjectionMatrix();
                renderer.setSize($window.width(), $window.height());
            });

            return scene;
        }

        function animate(/* time */) {
            window.requestAnimationFrame(animate);

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

            flyControls.update();
            renderer.render(scene, flyControls.camera);
        }

        function saveIfNecessary(onsuccess, onerror) {
            // TODO: Only save if the length of the curve is greater than one.
            if (currentProjectName !== null) {
                saveCurrentProject(onsuccess, onerror);
            } else {
                onsuccess();
            }
        }

        function generateProjectName(prefixString, unavailableNames) {
            var n = 1;
            while (unavailableNames.indexOf(prefixString + n) !== -1) n++;
            return prefixString + n;
        }

        function createNewProject(onsuccess, onerror) {
            saveIfNecessary(function () {
                getProjectList(function (list) {
                    onsuccess(currentProjectName = generateProjectName('Untitled ', list));
                }, onerror);
            }, onerror);
        }

        function saveCurrentProject(onsuccess, onerror) {
            alert(JSON.stringify(curve.serialize()));
            postJSON({
                type: 'set',
                user: currentUser,
                key: currentProjectName,
                value: JSON.stringify(curve.serialize())
            }, function (response) {
                var error = response.error;
                if (isUndefined(error)) {
                    onsuccess();
                } else {
                    onerror(error);
                }
            });
        }

        function loadProject(name, onsuccess, onerror) {
            saveIfNecessary(function () {
                currentProjectName = name;
                postJSON({
                    type: 'get',
                    user: currentUser,
                    key: name
                }, function (response) {
                    var error = response.error;
                    if (isUndefined(error)) {
                        curve = CurveCollection.parse(response.value);
                        onsuccess();
                    } else {
                        onerror(error);
                    }
                });
            }, onerror);
        }

        function getProjectList(onsuccess, onerror) {
            postJSON({ type: 'list', user: currentUser }, function (response) {
                var error = response.error;
                if (isUndefined(error))
                    onsuccess(response.value || []);
                else if (error === 'Invalid Request: User not found.')
                    onsuccess([]);
                else
                    onerror(error)
            });
        }

        function deleteCurrentProject(onsuccess, onerror) {
            postJSON({
                type: 'set',
                user: currentUser,
                key: currentProjectName
            }, function (response) {
                var error = response.error;
                if (isUndefined(error)) {
                    currentProjectName = null;
                    onsuccess();
                } else {
                    onerror(error);
                }
            });
        }

        // TODO: Make this instance variables.
        curve = new CurveCollection();
        scene = createScene();
        userInterface = new UserInterface();
        createRenderer({ antialias: userInterface.currentAntialiasValue });

        this.createNewProject = createNewProject;
        this.saveCurrentProject = saveCurrentProject;
        this.deleteCurrentProject = deleteCurrentProject;
        this.loadProject = loadProject;
        this.getProjectList = getProjectList;
        this.deleteRollerCoaster = deleteRollerCoaster;
        this.updateRollerCoaster = function () {
            createRollerCoaster(scene);
        };

        this.run = function () {     
            window.requestAnimationFrame(animate);
            $('body').show();
        };
    }

    function importGlobals() {
        $ = window.$;
        $window = $(window);
        $document = $(window.document);
        _ = window.THREE;
        FB = window.FB;
        JSON = window.JSON;
        Math = window.Math;
    }

    function initializeGeometryPrototypes() {
        RollerCoasterGeometry.prototype =
        RollerCoasterLiftersGeometry.prototype =
        RollerCoasterShadowGeometry.prototype =
        SkyGeometry.prototype =
        TreesGeometry.prototype = _.BufferGeometry.prototype;
    }

    function onWindowLoad() {
        importGlobals();
        initializeGeometryPrototypes();

        upVector = new _.Vector3(0, 1, 0);
        v1 = new _.Vector3();
        v2 = new _.Vector3();
        v3 = new _.Vector3();
        v4 = new _.Vector3();

        app = new App();
        app.run();
    }

    function main() {
        window.fbAsyncInit = fbAsyncInit;
        window.onload = onWindowLoad;
    }

    main();
}(window));
