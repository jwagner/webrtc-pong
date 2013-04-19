
var utils = require('../util'),
    extend = utils.extend,
    assert = utils.assert;

function Renderer(scene){
    this.nodes = [];
    scene.on('add', this.add.bind(this)); 
    scene.on('remove', this.remove.bind(this)); 
}
extend(Renderer.prototype, {
    add: function(node) {
        if(!node.model) return;
        this.nodes.push(node);
    }, 
    remove: function(node) {
        if(!node.model) return;
        var index = this.nodes.indexOf(node);
        if(index < 0) return;
        this.nodes.splice(index, 1);
    },
    render: function(cameraNode) {
        assert(cameraNode.camera, 'camera node must have a camera');
        for(var i = 0; i < this.nodes.length; i++) {
            var node = this.nodes[i];
            this.renderNode(node);
        }

    },
    renderNode: function(modelNode) {
    } 
});
exports.Renderer = Renderer;


function Model(mesh, material){
    this.mesh = null;
    this.material = null;
}
exports.Model = Model;

function Material(shader){
    this.shader = shader;
    this.uniforms = {};
}
exports.Material = Material;

