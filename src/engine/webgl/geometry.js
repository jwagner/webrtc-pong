var _ = require('underscore');

function triangle(a, b, c) {
   return _.flatten([a,b,c]);
} 
exports.triangle = triangle;

function quad(a, b, c, d) {
    return _.flatten([
        a, b, c,
        b, c, d
    ]);
}
exports.quad = quad;

exports.sphere = function(resolution, radius) {
    var s = [],
        r = radius;
    function p(u, v, r){
        return [
                Math.cos(u)*Math.cos(v),
                Math.sin(v),
                Math.sin(u)*Math.cos(v)
               ];
    }
    for(var y = 0; y < resolution-1; y++) {
        for(var x = 0; x < resolution-1; x++) {
            var u0 = Math.PI*2/resolution*x,
                u1 = Math.PI*2/resolution*(x+1),
                v0 = Math.PI/resolution*(y),
                v1 = Math.PI/resolution*(y+1);
            s.push(quad([
                p(u0, v0),
                p(u1, v0),
                p(u0, v1),
                p(u1, v1),
            ]));
        }
    }
    return _.flatten(s);
};
    
exports.grid = function(size){
    var buffer = new Float32Array(size*size*6*3),
        i = 0,
        half = size * 0.5;

    for(var y = 0; y < size; y++){
        for(var x = 0; x < size; x++) {
            buffer[i++] = x/size;
            buffer[i++] = 0;
            buffer[i++] = y/size;

            buffer[i++] = x/size;
            buffer[i++] = 0;
            buffer[i++] = (y+1)/size;

            buffer[i++] = (x+1)/size;
            buffer[i++] = 0;
            buffer[i++] = (y+1)/size;

            buffer[i++] = x/size;
            buffer[i++] = 0;
            buffer[i++] = y/size;

            buffer[i++] = (x+1)/size;
            buffer[i++] = 0;
            buffer[i++] = (y+1)/size;

            buffer[i++] = (x+1)/size;
            buffer[i++] = 0;
            buffer[i++] = y/size;
        }
    }
    return buffer;
};

// convert a gl.TRIANGLES mesh into a wireframe for rendering with gl.LINES
exports.wireFrame = function(input){
    var output = new Float32Array(input.length*2),
        triangles = input.length/9;
    for(var t = 0; t < triangles; t++) {
        for(var v1 = 0; v1 < 3; v1++) {
            var v2 = (v1+1)%3;
            for(var i = 0; i < 3; i++) {
                output[t*18+v1*3+i] = input[t*9+v1*3+i];
                output[t*18+v1*3+9+i] = input[t*9+v2*3+i];
            }
        }
    }
    return output;
}; 

exports.screen_quad = function screen_quad(xscale, yscale) {
    xscale = xscale||1;
    yscale = yscale||xscale;
    return new Float32Array([
            -xscale, yscale, 0,
            -xscale, -yscale, 0,
            xscale, -yscale, 0,
            
            -xscale, yscale, 0,
            xscale, -yscale, 0,
            xscale, yscale, 0
    ]);
};

exports.cube = function cube(scale) {
    scale = scale || 1;
    return new Float32Array([
            // back
            scale, scale, scale,
            scale, -scale, scale,
            -scale, -scale, scale,
            
            scale, scale, scale,
            -scale, -scale, scale,
            -scale, scale, scale,

            // front
            -scale, scale, -scale,
            -scale, -scale, -scale,
            scale, scale, -scale,
            
            scale, scale, -scale,
            -scale, -scale, -scale,
            scale, -scale, -scale,
            // left
            -scale, scale, scale,
            -scale, -scale, -scale,
            -scale, scale, -scale,
            
            -scale, scale, scale,
            -scale, -scale, scale,
            -scale, -scale, -scale,

            // right

            scale, scale, scale,
            scale, scale, -scale,
            scale, -scale, -scale,
            
            scale, scale, scale,
            scale, -scale, -scale,
            scale, -scale, scale,

            // top
            scale, scale, scale,
            -scale, scale, scale,
            -scale, scale, -scale,

            scale, scale, -scale,
            scale, scale, scale,
            -scale, scale, -scale,

            // bottom
            -scale, -scale, -scale,
            -scale, -scale, scale,
            scale, -scale, scale,

            -scale, -scale, -scale,
            scale, -scale, scale,
            scale, -scale, -scale
        ]);
};

