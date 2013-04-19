function vector_arena(vectorSize, size){
        var floatBuffer = new Float32Array(vectorSize*size),
            arena = [],
            o = 0;
        for(var i = 0; i < size; i++) {
            arena.push(floatBuffer.subarray(i*vectorSize, i*vectorSize+vectorSize));
        }
        return {
            get: function() {
                return arena[o++];
            },
            free: function() {
                o = 0;
            }
        };
}
exports.vector_arena = vector_arena;

function generic_arena(constructor, size){
        var arena = [],
            o = 0;
        for(var i = 0; i < size; i++) {
            arena.push(constructor());
        }
        return {
            get: function() {
                return arena[o++];
            },
            free: function() {
                o = 0;
            }
        };
}
exports.generic_arena = generic_arena;

function pool(constructor){
    var p = [],
        i = 0;
    return {
        get: function() {
            if(i === p.length){
                p.push(constructor());
            }
            return p[i++];
        },
        put: function(o) {
            p[i--] = o;
        }
    };
}
exports.pool = pool;
