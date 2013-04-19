    
var mat4 = require('gl-matrix').mat4,
    mat3 = require('gl-matrix').mat3,
    vec3 = require('gl-matrix').vec3;

var FORWARD = vec3.clone([0, 0, -1]);

function Camera(options){
    this.position = vec3.clone(options.position || [0, 0, -1]);
    this.velocity = vec3.create();
    this.pitch = options.pitch || 0.0;
    this.yaw = options.yaw || 0.0;
    this.near = options.near || 0.1;
    this.far = options.far || 5000;
    this.fovy = options.fovy || 45;
    this.aspect = options.aspect || 16/9;
    this.forward = vec3.clone(FORWARD);

    //this._m4_0 = mat4.create();
    this._v3_0 = vec3.create();

    this.projection = mat4.create();
    this.worldView = mat4.create();
    this.worldViewProjection = mat4.create();

    this.updateProjection();
    this.update();
}
exports.Camera = Camera;
Camera.prototype = {
    updateProjection: function() {
        mat4.perspective(this.projection, this.fovy, this.aspect, this.near, this.far);
    }, 
    updateWorldView: function() {
        var wv = this.worldView;
        mat4.identity(wv);
        mat4.rotateX(wv, wv, this.pitch);
        mat4.rotateY(wv, wv, this.yaw);
        mat4.translate(wv, wv, vec3.negate(this._v3_0, this.position));
    }, 
    updateWorldViewProjection: function() {
        mat4.multiply(this.worldViewProjection, this.projection, this.worldView);
    }, 
    update: function() {
        this.updateWorldView();
        this.updateWorldViewProjection();
    }
};

var vec3_a = vec3.create(),
    mat3_a = mat3.create();

function CameraController(input, camera){
    this.input = input;
    this.camera = camera;
    this.velocity = 10.0;
}
exports.CameraController = CameraController;
CameraController.prototype = {
    tick: function(td) {
        var camera = this.camera,
            mouse = this.input.mouse,
            key = this.input.key,
            normalMatrix = mat3_a,
            direction = vec3_a;
        if((mouse.right.pressed || mouse.lock) && (mouse.xd || mouse.yd)){
            //console.log(mouse.xd, mouse.yd);
            camera.yaw += mouse.xd/this.input.width*1.1;
            camera.pitch += mouse.yd/this.input.height*1.1;
        }

        if(key.A.pressed){
            direction[0] = -1;
        }
        else if(key.D.pressed) {
            direction[0] = 1;
        }
        else {
            direction[0] = 0;
        }

        if(key.W.pressed){
            direction[2] = -1;
        }
        else if(key.S.pressed) {
            direction[2] = 1;
        }
        else {
            direction[2] = 0;
        }
        direction[1] = 0;


        mat3.fromMat4(normalMatrix, camera.worldView);
        mat3.invert(normalMatrix, normalMatrix);

        vec3.normalize(direction, direction);
        vec3.scale(direction, direction, this.velocity*td);
        vec3.transformMat3(direction, direction, normalMatrix);
        camera.velocity = direction;
        camera.forward = vec3.transformMat3(camera.forward, FORWARD, normalMatrix);
        camera.update();

    }
};

