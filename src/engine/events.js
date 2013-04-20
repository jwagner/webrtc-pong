/* heavily inspired by node's events.js
* important differences:
*
* no error special case
*
* off vs removeListener
*
* to remove an event that has been added via once
* remove the handler returned by once
* */
exports.EventEmitter = function EventEmitter(){
    this._events = {};
};
exports.EventEmitter.prototype = {
    emit: function (type, event) {
        if(type in this._events){
            var events = this._events[type];
            for(var i = 0; i < events.length; i++) {
                events[i](event);
            }
        }
        return this;
    },
    on: function(type, listener) {
        if(!(type in this._events)){
            this._events[type] = [listener];
        }
        else {
            this._events[type].push(listener);
        }
        return this;
    }, 
    once: function(type, listener) {
        var this_ = this;
        function once(e){
            this_.off(type, once);
            listener.call(this, e);
        }
        this.on(type, once);
        return once;
    }, 
    off: function (type, listener) {
        var events = this._events[type];
        if(events === undefined) return this;
        var index = events.indexOf(listener);
        if(index === -1) return this;
        events.splice(index, 1);
        return this;
    }
};

