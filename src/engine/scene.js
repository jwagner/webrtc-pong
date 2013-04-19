
var extend = require('underscore').extend,
    glm = require('gl-matrix'),
    mat4 = glm.mat4,
    vec3 = glm.vec3,
    quat = glm.quat,
    EventEmitter = require('./events').EventEmitter;

function Scene(){
    this.children = [];
}
Scene.prototype = {
    add: function(node) {
        this.children.push(node);
        return this;
    } 
};

function Node() {
}

exports.Scene = Scene;
