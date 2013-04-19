
var EventEmitter = require('./events').EventEmitter;
    
buster.testCase('events', {
    'should not fail with no handlers': function() {
        var emitter = new EventEmitter();
        emitter.emit('type', null);
        assert(true);
    },
    'should be emitted': function() {
        var emitter = new EventEmitter(),
            e = {test: 'test'},
            callback = this.stub();
        emitter.on('type', callback);
        emitter.emit('type', e);
        assert.calledWith(callback,e);
    },
    'can be remove': function() {
        var emitter = new EventEmitter(),
            e = {test: 'test'},
            callback = this.stub();
        emitter.on('type', callback);
        emitter.off('type', callback);
        emitter.emit('type', e);
        refute.called(callback);
    },
    'only remove a specific listener': function() {
        var emitter = new EventEmitter(),
            e = {test: 'test'},
            callback = this.stub(),
            dummy = this.stub();
        emitter.on('type', dummy);
        emitter.on('type', callback);
        emitter.off('type', dummy);
        emitter.emit('type', e);
        assert.called(callback);
        refute.called(dummy);
    },
    'registered once should only be fired once': function() {
        var emitter = new EventEmitter(),
            e = {test: 'test'},
            callback = this.stub();
        emitter.once('type', callback);
        emitter.emit('type', e);
        emitter.emit('type', e);
        assert.calledOnce(callback);
    },

});

