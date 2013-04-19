    
var context = require('./context');
buster.testCase('context', {
    'can be initialized': function() {
        var canvas = document.createElement('canvas'),
            gl = context.initialize(canvas);
        assert(gl instanceof window.WebGLRenderingContext);
    } 
});

