var memory = require('./memory');

buster.testCase('memory.vector_arena', {
    setUp: function() {
        this.subject = memory.vector_arena(2, 2);
    },
    'should allocate new objects': function() {
        var o1 = this.subject.get(),
            o2 = this.subject.get(),
            o3 = this.subject.get();
        assert.equals(o1.length, 2);
        assert.equals(o1[0], 0);
        assert.equals(o2[0], 0);
        refute.same(o1, o2);
        assert.equals(o3, undefined);
    }, 
    'should reuse objects': function() {
        var o1 = this.subject.get();
        this.subject.free();
        var o2 = this.subject.get();
        assert.same(o1, o2);
    }
});

buster.testCase('memory.generic_arena', {
    setUp: function() {
        var i = 0;
        this.construct = function(){
            return {x: i++};
        }; 
        this.subject = memory.generic_arena(this.construct, 2);
    },
    'should allocate new objects': function() {
        var o1 = this.subject.get(),
            o2 = this.subject.get(),
            o3 = this.subject.get();
        assert.equals(o1.x, 0);
        assert.equals(o2.x, 1);
        assert.equals(o3, undefined);
    }, 
    'should reuse objects': function() {
        var o1 = this.subject.get();
        this.subject.free();
        var o2 = this.subject.get();
        assert.same(o1, o2);
    }
});
buster.testCase('memory.pool', {
    setUp: function() {
        var i = 0;
        this.construct = function(){
            return {x: i++};
        }; 
        this.subject = memory.pool(this.construct);
    },
    'should allocate new objects': function() {
        var o1 = this.subject.get(),
            o2 = this.subject.get();
        assert.equals(o1.x, 0);
        assert.equals(o2.x, 1);
    }, 
    'should reuse objects': function() {
        var o1 = this.subject.get();
        this.subject.put(o1);
        var o2 = this.subject.get();
        assert.same(o1, o2);
    }
});
