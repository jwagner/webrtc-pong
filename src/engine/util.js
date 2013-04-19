    
exports.assert = function assert(assertion, message) {
    if(!assertion) console.warn(message);
};

exports.clamp = function(a, b, c) {
    return a < b ? b : (a > c ? c : a);
};

exports.extend = function extend() {
    var target = arguments[0],
        i, argument, name, f, value;
    for(i = 1; i < arguments.length; i++) {
        argument = arguments[i];
        for(name in argument) {
            target[name] = argument[name];
        }
    }
    return target;
};

