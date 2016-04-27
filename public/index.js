(function (window) {
    'use strict';

    var JSON = window.JSON,
        Math = window.Math,
        location = window.location,
        parseInt = window.parseInt,
        requestAnimationFrame = window.requestAnimationFrame,
        screen = window.screen,
        setInterval = window.setInterval,
        $, $document, $window, fb, _,
        upAxisVector, tmp1 ,tmp2, tmp3, tmp4;

    function isUndefined(x) {
        return typeof x === 'undefined';
    }

    function alert(caption, content) {
        $.Notify({
            caption: caption,
            content: content || ' ',
            type: 'alert'
        });
    }

    function postJSON(object, success) {
        if (location.hostname !== 'roller-coaster-simulator-vr.mybluemix.net') {
            success({ error: 'Wrong host!' });
            return;
        }

        $.ajax({
            type: 'POST',
            url: location.hostname,
            data: JSON.stringify(object),
            success: success,
            contentType: "application/json",
            dataType: 'json'
        });
    }

    function newV3(x, y, z) {
        return new _.Vector3(x, y, z);
    }

    function createQuad(vertices, tmp1, tmp2, tmp3, tmp4) {
        vertices.push(
            tmp1.x, tmp1.y, tmp1.z,
            tmp2.x, tmp2.y, tmp2.z,
            tmp4.x, tmp4.y, tmp4.z,
            tmp2.x, tmp2.y, tmp2.z,
            tmp3.x, tmp3.y, tmp3.z,
            tmp4.x, tmp4.y, tmp4.z);
    }

    function createRepeated(vertices, v, count) {
        for (var i = 0; i < count; i++)
            vertices.push(v.x, v.y, v.z);
    }

    function createCircleVertices(radius, n) {
        var vertices = [];
        for (var a = 0, inc = Math.PI * 2 / n; a < Math.PI * 2; a += inc)
            vertices.push(newV3(Math.sin(a) * radius, Math.cos(a) * radius, 0));
        return vertices;
    }

    function initializeGeometryPrototypes() {
        RollerCoasterGeometry.prototype =
        RollerCoasterLiftersGeometry.prototype =
        RollerCoasterShadowGeometry.prototype =
        SkyGeometry.prototype =
        TreesGeometry.prototype = _.BufferGeometry.prototype;
    }

    function importGlobals() {
        $ = window.$;
        $document = $(window.document);
        $window = $(window);
        _ = window.THREE;
    }

    function initializeGlobalVectors() {
        upAxisVector = newV3(0, 1, 0);
        tmp1 = newV3();
        tmp2 = newV3();
        tmp3 = newV3();
        tmp4 = newV3();
    }

    function fbAsyncInit() {
        fb = FB;
        fb.init({
            appId: '637237206431651',
            xfbml: true,
            version: 'v2.6'
        });
    }

    function onWindowLoad() {
        importGlobals();
        initializeGeometryPrototypes();
        initializeGlobalVectors();
        new App().run();
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
                case 68: /* D */ rotation = 0.05 * Math.PI/180; break;
                case 65: /* A */ rotation = 0.05 * -Math.PI/180; break;
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
            var from = e.relatedTarget || e.toElement;
            if (!from || from.nodeName == "HTML")
                velocity.x = velocity.z = 0;
        }

        function update() {
            tmp1.copy(velocity)
                .applyAxisAngle(upAxisVector, totalRotation += rotation)
                .multiplyScalar(movementSpeed);

            camera.position.add(tmp1);
            camera.rotation.order = 'YXZ';
            camera.rotation.y += rotation;
        }

        function reset() {
            velocity = newV3();
            rotation = 0;
            totalRotation = getCameraXZRotation();
        }

        function dispose() {
            eventMap.dispose();
        }

        reset();
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
        this.reset = reset;
        this.dispose = dispose;
    }

    function UserInterface(app) {
        function checkLoginState() {
            var fbLoginStatus = $('#fb-login-status');

            fb.getLoginStatus(function (response) {
                if (response.status === 'connected') {
                    fb.api('/me', function (response) {
                        var name = response.name;
                        fbLoginStatus.text('Thanks for logging in, ' + name + '!');
                        app.setCurrentUser(name);
                        // TODO: Add sign out button and save before sign-out.
                        // TODO: Enable all save related functionality.
                    });
                } else if (response.status === 'not_authorized') {
                    fbLoginStatus.text('Please log into this app.');
                } else {
                    fbLoginStatus.text('Please log into Facebook.');
                }
            });
        }

        function onNewButtonClicked() {
            app.createNewProject(function (name) {
                $('#project-name').text(name);
                $('#project-name-wrapper').show();
            }, alert);
        }

        function setProjectNameLabel(value) {
            $('#project-name').text(value);
            $('#project-name-wrapper')[!isUndefined(value) && value.length > 0 ? 'show' : 'hide']();
        }

        function onOpenButtonClicked() {
            var table = $('#project-list');
            table.html('<thead><tr><th>Filename</th><th>Last Modified</th><th>Size</th></tr></thead>');

            app.getProjectList(function (list) {
                showMetroDialog('#file-open-dialog');

                var length = list.length;
                var tbody = $('<tbody>');

                if (length) {
                    for (var i = 0; i < length; i++) {
                        var tr = $('<tr>');
                        var td = $('<td>');
                        var a = $('<a>');
                        a.text(list[i]);
                        a.click(function () {
                            var name = this.textContent;
                            app.loadProject(name, function () {
                                setProjectNameLabel(name);
                                hideMetroDialog('#file-open-dialog');
                            }, alert);
                        });
                        td.append(a);
                        tr.append(td);
                        tr.append($('<td>'));
                        tr.append($('<td>'));
                        tbody.append(tr);
                    }
                } else {
                    var tr = $('<tr>');
                    var td = $('<td>');
                    td.text('You have not created any projects yet.');
                    tr.append(td);
                    tbody.append(tr);
                }

                table.append(tbody);
            });
        }

        function onRenameButtonClicked() {
            showMetroDialog('#file-rename-dialog');
        }

        function onRenameOKButtonClicked() {
            app.renameCurrentProject($('#file-rename-text').text(), function () {
                hideMetroDialog('#file-rename-dialog');
            }, alert);
        }

        function onDeleteButtonClicked() {
            app.deleteCurrentProject(function () {
                $('#project-name-wrapper').hide();
            }, alert);
        }

        function onUndoButtonClicked() {
            app.undoCurve();
        }

        function onRedoButtonClicked() {
            app.redoCurve();
        }

        function onOptionsButtonClicked() {
            showMetroDialog('#options-dialog');
        }

        function onOptionsDialogSaveButtonClicked() {
            app.setAntialias($('#options-dialog-antialias').is(':checked'));
            app.setVRMode($('#options-dialog-enable-vr').is(':checked'));
            hideMetroDialog('#options-dialog');
        }

        function onPlayButtonClicked() {
            var text = $('#play-button > .text');
            app.setCameraMode({ Play: 'playing', Stop: 'editing' }[text.text()]);
            text.text({ Play: 'Stop', Stop: 'Play' }[text.text()]);
            $('#play-button > .icon').toggleClass('mif-play').toggleClass('mif-stop');
        }

        function getSliderValue(selector) {
            return parseInt($(selector + ' > .slider-hint').text());
        }

        function onCreateButtonClicked() {
            var x = getSliderValue('#x-slider');
            var y = getSliderValue('#y-slider');
            var z = getSliderValue('#z-slider');
            var L = getSliderValue('#length-slider');

            app.addCurve(newV3(x, y, z), L);
        }

        function show() {
            $('body').show();
        }

        this.show = show;
        this.setProjectNameLabel = setProjectNameLabel;

        this.options = {
            antialias: {
                get: function () {
                    return $('#options-dialog-antialias').is(':checked');
                },
                set: function (value) {
                    $('#options-dialog-antialias').prop('checked', value);
                }
            }
        };

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

    function Curve(V, L, P, T) {
        if (isUndefined(P)) P = newV3(0, 0, 2);
        if (isUndefined(T)) T = newV3(1, 1, .1);

        V.normalize();
        T.normalize();

        var point = newV3();
        var tangent = newV3();

        this.getVector = function () {
            return V;
        }

        this.getTangent = function () {
            return T;
        }

        this.getLength = function () {
            return L;
        }

        this.getPointAt = function (t) {
            return point.set(
                    P.x + L * t * (t*(T.x - V.x) + 2 * V.x),
                    P.y + L * t * (t*(T.y - V.y) + 2 * V.y),
                    P.z + L * t * (t*(T.z - V.z) + 2 * V.z)
                ).multiplyScalar(20);
        };

        this.getTangentAt = function (t) {
            var delta = 0.0001;

            var q1 = this.getPointAt(Math.min(1, t + delta));
            q1 = newV3(q1.x/20,q1.y/20,q1.z/20);
            var q2 = this.getPointAt(Math.max(0, t - delta));
            q2 = newV3(q2.x/20,q2.y/20,q2.z/20);

            return tangent.copy(q1.sub(q2).normalize());
        };
    }

    function CurveCollection(firstCurve) {
        this.length = 1;
        this.sum = firstCurve ? firstCurve.getLength() : 5;
        var point = newV3();
        var tangent = newV3();
        var curves = [ firstCurve || new Curve(newV3(1, 0, 0), 5) ];
        var redoBuffer = [];

        this.add = function (T, L) {
            if (length !== 0) {
                redoBuffer = [];
                var lastCurve = curves[curves.length - 1];
                var P = lastCurve.getPointAt(1);
                P = newV3(P.x / 20, P.y / 20, P.z / 20);
                var V = lastCurve.getTangentAt(1);
                curves.push(new Curve(V, L, P, T));

                lastCurve = curves[curves.length - 1];
                var Q = lastCurve.getPointAt(0);
                Q = newV3(Q.x / 20, Q.y / 20, Q.z / 20);

                this.length++;
                this.sum += L;
            }
        };
        
        this.undo = function () {
            if (curves.length > 1) {
                var c = curves.pop();
                this.sum -= c.getLength();
                redoBuffer.push(c);
                this.length--;
            }
        };

        this.redo = function () {
            if (redoBuffer.length > 0) {
                var c = redoBuffer.pop();
                this.sum += c.getLength();
                curves.push(c);
                this.length++;
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
                var t = c.getTangent();
                console.log(t);
                a.push([t.x, t.y, t.z, c.getLength()]);
            });
            console.log(JSON.stringify(a));
            return {
                lastAutoSave: Date.now(),
                curves: a
            };
        };
    }

    CurveCollection.parse = function (str) {
        var obj;

        try {
            obj = JSON.parse(str);
        } catch (error) {
            return null;
        }

        var c = obj.curves.shift();
        var curves = new CurveCollection();

        obj.curves.forEach(function (c) {
            console.log('addCurve ' + JSON.stringify([newV3(c[0], c[1], c[2]), c[3]]));
            curves.add(newV3(c[0], c[1], c[2]), c[3]);
        });

        return curves;
    };

    function RollerCoasterGeometry(curve, size) {
        _.BufferGeometry.call(this);

        var color1 = newV3(0.8, 0.8, 0.8);
        var color2 = newV3(0.8, 0.8, 0);

        var triangle = [
            newV3(-2.25, 0, 0),
            newV3(0, -0.5, 0),
            newV3(0, -1.75, 0),
            newV3(0, -0.5, 0),
            newV3(2.25, 0, 0),
            newV3(0, -1.75, 0)
        ];

        var vertices = [];
        var normals = [];
        var colors = [];
        var forward = newV3();
        var right = newV3();
        var offset = newV3();
        var quaternion = new _.Quaternion();
        var prevQuaternion = new _.Quaternion();
        prevQuaternion.setFromAxisAngle(upAxisVector, Math.PI / 2);
        var point = newV3();
        var prevPoint = curve.getPointAt(0).clone();
        var circle1 = createCircleVertices(0.6, 5);
        var circle2 = createCircleVertices(0.25, 5);

        function drawShape(shape, color) {
            var n = shape.length;

            for (var i = 0; i < n; i++) {
                tmp1.copy(shape[i]).applyQuaternion(quaternion).add(point);
                vertices.push(tmp1.x, tmp1.y, tmp1.z);
            }

            for (var j = n - 1; j >= 0; j--) {
                tmp1.copy(shape[j]).applyQuaternion(quaternion).add(point);
                vertices.push(tmp1.x, tmp1.y, tmp1.z);
            }

            tmp1.set(0, 0, -1).applyQuaternion(quaternion);
            createRepeated(normals, tmp1, n);
            tmp1.set(0, 0, 1).applyQuaternion(quaternion);
            createRepeated(normals, tmp1, n);

            createRepeated(colors, color, n * 2);
        }

        function extrudeShape(shape, offset, color) {
            var n = shape.length;
            for (var j = 0; j < n; j++) {
                var point1 = shape[j];
                var point2 = shape[(j + 1) % n];

                tmp1.copy(point1).add(offset).applyQuaternion(quaternion).add(point);
                tmp2.copy(point2).add(offset).applyQuaternion(quaternion).add(point);
                tmp3.copy(point2).add(offset).applyQuaternion(prevQuaternion).add(prevPoint);
                tmp4.copy(point1).add(offset).applyQuaternion(prevQuaternion).add(prevPoint);
                createQuad(vertices, tmp1, tmp2, tmp3, tmp4);

                tmp1.copy(point1).applyQuaternion(quaternion).normalize();
                tmp2.copy(point2).applyQuaternion(quaternion).normalize();
                tmp3.copy(point2).applyQuaternion(prevQuaternion).normalize();
                tmp4.copy(point1).applyQuaternion(prevQuaternion).normalize();
                createQuad(normals, tmp1, tmp2, tmp3, tmp4);
            }

            createRepeated(colors, color, n * 6);
        }

        for (var i = 1; i < size; i++) {
            point.copy(curve.getPointAt(i / size));
            tmp1.set(0, 1, 0);
            forward.subVectors(point, prevPoint).normalize();
            right.crossVectors(tmp1, forward).normalize();
            tmp1.crossVectors(forward, right);
            quaternion.setFromAxisAngle(tmp1, Math.atan2(forward.x, forward.z));

            if (i % 5 == 0) drawShape(triangle, color2);
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

    function RollerCoasterLiftersGeometry(curve, size) {
        _.BufferGeometry.call(this);

        var tube1 = [newV3(0, 0.5, -0.5), newV3(0, 0.5, 0.5), newV3(0, -0.5, 0)];
        var tube2 = [newV3(-0.5, 0, 0.5), newV3(-0.5, 0, -0.5), newV3(0.5, 0, 0)];
        var tube3 = [newV3(0.5, 0, -0.5), newV3(0.5, 0, 0.5), newV3(-0.5, 0, 0)];

        var vertices = [];
        var normals = [];
        var quaternion = new _.Quaternion();
        var point = newV3();
        var tangent = newV3();
        var fromPoint = newV3();
        var toPoint = newV3();

        function extrudeShape(shape) {
            for (var j = 0, n = shape.length; j < n; j++) {
                var point1 = shape[j];
                var point2 = shape[(j + 1) % n];

                tmp1.copy(point1).applyQuaternion(quaternion).add(fromPoint);
                tmp2.copy(point2).applyQuaternion(quaternion).add(fromPoint);
                tmp3.copy(point2).applyQuaternion(quaternion).add(toPoint);
                tmp4.copy(point1).applyQuaternion(quaternion).add(toPoint);
                createQuad(vertices, tmp1, tmp2, tmp3, tmp4);

                tmp1.copy(point1).applyQuaternion(quaternion).normalize();
                tmp2.copy(point2).applyQuaternion(quaternion).normalize();
                tmp3.copy(point2).applyQuaternion(quaternion).normalize();
                tmp4.copy(point1).applyQuaternion(quaternion).normalize();
                createQuad(normals, tmp1, tmp2, tmp3, tmp4);
            }
        }

        for (var i = 0; i < size; i++) {
            point.copy(curve.getPointAt(i / size));
            tangent.copy(curve.getTangentAt(i / size));

            quaternion.setFromAxisAngle(upAxisVector, Math.atan2(tangent.x, tangent.z));

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

    function RollerCoasterShadowGeometry(curve, size) {
        // TODO: Project shadow onto landscape.
        _.BufferGeometry.call(this);

        var vertices = [];
        var forward = newV3();
        var quaternion = new _.Quaternion();
        var prevQuaternion = new _.Quaternion().setFromAxisAngle(upAxisVector, Math.PI / 2);
        var point = newV3();
        var prevPoint = curve.getPointAt(0).clone().setY(0);

        for (var i = 1; i < size; i++) {
            point.copy(curve.getPointAt(i / size)).setY(0);
            forward.subVectors(point, prevPoint);
            quaternion.setFromAxisAngle(upAxisVector, Math.atan2(forward.x, forward.z));

            tmp1.set(-3, 0, 0).applyQuaternion(quaternion).add(point);
            tmp2.set(3, 0, 0).applyQuaternion(quaternion).add(point);
            tmp3.set(3, 0, 0).applyQuaternion(prevQuaternion).add(prevPoint);
            tmp4.set(-3, 0, 0).applyQuaternion(prevQuaternion).add(prevPoint);
            createQuad(vertices, tmp1, tmp2, tmp3, tmp4);

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

    function App() {
        var renderer, currentRenderer, vrEffect, vrControls,
            userInterface, flyControls, scene, train, curve,
            coasterGeo, liftersGeo, shadowGeo,
            autoSaveInterval = 1e5, lastAutoSave = 0,
            currentUser = 'TestUser', currentProjectName = null, currentAntialiasValue,
            cameraModeProperties, currentCameraMode = 'editing', last = 0, progress = 0, velocity = 0, currentCamera;

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

            scene.add(new _.Mesh(
                coasterGeo = new RollerCoasterGeometry(curve, sum * 10),
                new _.MeshStandardMaterial({
                    roughness: 0.1,
                    metalness: 0,
                    vertexColors: _.VertexColors
                })));

            var mesh = new _.Mesh(
                liftersGeo = new RollerCoasterLiftersGeometry(curve, length * 3),
                new _.MeshStandardMaterial({
                    roughness: 0.1,
                    metalness: 0
                }));
            mesh.position.y = 1;
            scene.add(mesh);

            mesh = new _.Mesh(
                shadowGeo = new RollerCoasterShadowGeometry(curve, sum * 10),
                new _.MeshBasicMaterial({
                    color: 0x000000,
                    opacity: 0.1,
                    depthWrite: false,
                    transparent: true
                }));
            mesh.position.y = 1;
            scene.add(mesh);
        }

        function removeAllCurves() {
            coasterGeo.removeAttribute('position');
            coasterGeo.removeAttribute('normal');
            coasterGeo.removeAttribute('color');
            liftersGeo.removeAttribute('position');
            liftersGeo.removeAttribute('normal');
            shadowGeo.removeAttribute('position');
        }

        function createRenderer(options) {
            if (!isUndefined(renderer)) $(renderer.domElement).remove();

            renderer = new _.WebGLRenderer(options);
            renderer.setClearColor(0xd0d0ff);
            renderer.setPixelRatio(devicePixelRatio);

            $('body').append(renderer.domElement);
        }

        function initializeVR(renderer, camera) {
            vrEffect = new _.VREffect(renderer);
            vrControls = new _.VRControls(camera);
        }

        function createScene() {
            var scene = new _.Scene();

              scene.fog = new THREE.Fog(0xcacfde, 0, 3000);

            var light = new _.HemisphereLight(0xfff0f0, 0x606066);
            light.position.set(1, 1, 1);
            scene.add(light);

            train = new _.Object3D();
            scene.add(train);

            var camera = new _.PerspectiveCamera(40, $window.width() / $window.height(), 1, 5000);
            camera.rotation.y = Math.PI;
            camera.name = 'camera';
            train.add(camera);

            var flyCamera = new _.PerspectiveCamera(40, $window.width() / $window.height(), 1, 5000);
            flyCamera.position.x = 0;
            flyCamera.position.y = 300;
            flyCamera.position.z = 300;
            flyCamera.lookAt(newV3());
            flyControls = new FlyControls(flyCamera, 0.25);

            $window.resize(function () {
                var aspect = $window.width() / $window.height();
                function resize(camera) {
                    camera.aspect = aspect;
                    camera.updateProjectionMatrix();
                }
                resize(camera);
                resize(flyCamera);
            });

            createEnvironment(scene);
            createRollerCoaster(scene);

            return scene;
        }

        function animate(time) {
            requestAnimationFrame(animate);
            var p = cameraModeProperties[currentCameraMode];
            p.update(time);
            currentRenderer.render(scene, p.getCamera());
        }

        function setCameraMode(value) {
            currentCameraMode = value;

            if (vrMode) {
                if (value === 'playing') {
                    vrEffect.setFullScreen(true);
                    currentRenderer = value ? vrEffect : renderer;
                } else if (value === 'editing') {
                    currentRenderer = renderer;
                }
            }

            last = 0, progress = 0, velocity = 0;

            if (value === 'editing') {
                flyControls.camera.rotation.y = Math.PI;
                flyControls.camera.lookAt(newV3());
            }

            $window.trigger('resize');
        }

        var vrMode = false;
        function setVRMode(value) {
            vrMode = true;
        }

        function setCurrentUser(value) {
            currentUser = value;
        }

        function saveIfNecessary(onsuccess, onerror) {
            // TODO: Only save if the length of the curve is greater than one.
            if (currentProjectName !== null && curve.length > 1) {
                saveCurrentProject(function () {
                    lastAutoSave = Date.now();
                    $.Notify({
                        caption: 'Successfully autosaved!',
                        content: ' ',
                        type: 'success'
                    });
                    onsuccess(true);
                }, onerror);
            } else {
                onsuccess(false);
            }
        }

        function autoSave() {
            saveIfNecessary(function () {
                // Success, do nothing.
            }, alert);
        }

        function generateProjectName(prefixString, unavailableNames) {
            var n = 1;
            while (unavailableNames.indexOf(prefixString + n) !== -1) n++;
            return prefixString + n;
        }

        function isProjectNameAvailable(name, onsuccess, onerror) {
            getProjectList(function (list) {
                onsuccess(list.indexOf(name) === -1);
            }, onerror);
        }

        function createNewProject(onsuccess, onerror) {
            saveIfNecessary(function (neededToSave) {
                if (neededToSave) {
                    currentProjectName = null;
                    createNewProjectIfNecessary(onsuccess, onerror);
                }
            }, onerror);
        }

        function saveCurrentProject(onsuccess, onerror) {
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

        function renameCurrentProject(name, onsuccess, onerror) {
            isProjectNameAvailable(name, function (isAvailable) {
                if (isAvailable) {
                    // TODO: Save current roller coaster under new name.
                    // TODO: If successful, delete current roller coaster in database.
                    $('file-rename-message').text(' ');
                } else {
                    $('file-rename-message').text('Sorry, that name is already being used.');
                }
            }, onerror);
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
                        removeAllCurves();
                        curve = CurveCollection.parse(response.value);
                        createRollerCoaster(scene);
                        lastAutoSave = response.value.lastAutoSave;
                        if (curve !== null)
                            onsuccess();
                        else
                            onerror('Could not load project.');
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
            if (currentProjectName === null) {
                onsuccess();
                return;
            }

            postJSON({
                type: 'set',
                user: currentUser,
                key: currentProjectName
            }, function (response) {
                var error = response.error;
                if (isUndefined(error)) {
                    removeAllCurves();
                    curve = new CurveCollection();
                    createRollerCoaster(scene);
                    currentProjectName = null;
                    onsuccess();
                } else {
                    onerror(error);
                }
            });
        }

        function createNewProjectIfNecessary(onsuccess, onerror) {
            if (currentProjectName === null) {
                getProjectList(function (list) {
                    removeAllCurves();
                    curve = new CurveCollection();
                    createRollerCoaster(scene);
                    currentProjectName = generateProjectName('Untitled ', list);
                    userInterface.setProjectNameLabel(currentProjectName);
                    onsuccess(currentProjectName);
                }, onerror);
            } else {
                onsuccess();
            }
        }

        function addCurve(T, L) {
            // XXX: Uncomment these lines before you commit!
            //createNewProjectIfNecessary(function () {
                removeAllCurves();
                curve.add(T, L);
                createRollerCoaster(scene);
            //}, alert);
        }

        function undoCurve() {
            if (currentProjectName !== null && curve !== null) {
                removeAllCurves();
                curve.undo();
                createRollerCoaster(scene);
            }
        }

        function redoCurve() {
            if (currentProjectName !== null && curve !== null) {
                removeAllCurves();
                curve.redo();
                createRollerCoaster(scene);
            }
        }

        function setAntialias(value) {
            if (value !== currentAntialiasValue)
                createRenderer({ antialiasing: currentAntialiasValue = value });
        }

        function run() {
            $window.trigger('resize');
            requestAnimationFrame(animate);
            userInterface.show();
        }

        cameraModeProperties = {
            editing: {
                getCamera: function () {
                    return flyControls.camera;
                },

                update: function () {
                    flyControls.update();
                }
            },

            playing: {
                getCamera: function () {
                    return train.getObjectByName('camera');
                },

                update: function (time) {
                    var delta = time - last;
                    last = time;
                    delta *= 100;
                    progress = (progress + velocity * delta / 1000) % 1;
                    train.position.copy(curve.getPointAt(progress));
                    train.position.y += 3;

                    var tangent = curve.getTangentAt(progress);
                    velocity = Math.max(velocity - tangent.y * 0.000030, 0.0008);
                    train.lookAt(train.position.clone().add(tangent));

                    vrControls.update();
                }
            }
        }

        curve = new CurveCollection();
        createNewProjectIfNecessary(function () { }, alert);
        scene = createScene();
        userInterface = new UserInterface(this);
        currentAntialiasValue = screen.width * screen.height <= 1920 * 1080;
        userInterface.options.antialias.set(currentAntialiasValue);
        createRenderer({ antialias: currentAntialiasValue });
        currentRenderer = renderer;
        initializeVR(renderer, flyControls.camera);

        $window.resize(function () {
            renderer.setSize($window.width(), $window.height());
            vrEffect.setSize($window.width(), $window.height());
        });

        function onFullscreenChange() {
            var fs = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
            if (!fs) {
                setCameraMode('editing');
            }
        }

        document.addEventListener("fullscreenchange", onFullscreenChange, false);
        document.addEventListener("webkitfullscreenchange", onFullscreenChange, false);
        document.addEventListener("mozfullscreenchange", onFullscreenChange, false);

        this.setCurrentUser = setCurrentUser;
        this.createNewProject = createNewProject;
        this.saveCurrentProject = saveCurrentProject;
        this.renameCurrentProject = renameCurrentProject;
        this.deleteCurrentProject = deleteCurrentProject;
        this.loadProject = loadProject;
        this.getProjectList = getProjectList;
        this.removeAllCurves = removeAllCurves;
        this.undoCurve = undoCurve;
        this.redoCurve = redoCurve;
        this.addCurve = addCurve;
        this.setAntialias = setAntialias;
        this.setCameraMode = setCameraMode;
        this.setVRMode = setVRMode;
        this.run = run;

        setInterval(autoSave, autoSaveInterval);
    }

    window.fbAsyncInit = fbAsyncInit;
    window.onload = onWindowLoad;
}(window));
