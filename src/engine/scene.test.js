
var scene = require('./scene');
buster.testCase('scene.Node', {
    children: {
        setUp: function() {
            this.root = new scene.Root();
            this.parent = new scene.Node();
            this.parent.id = 'parent';
            this.child = new scene.Node();
            this.child.id = 'child';
            this.parent.add(this.child);
            this.root.add(this.parent);
        }, 
        '//have parent': function() {
            assert.same(this.root, this.parent.parent);
            assert.same(this.parent, this.child.parent);
        },
        '//have root': function() {
            assert.same(this.root, this.parent.root);
            assert.same(this.root, this.child.root);
        },
        '//are indexed by id': function() {
            assert.same(this.root.byId.parent, this.parent);
            assert.same(this.root.byId.child, this.child);
        }, 
        '//can be removed': function() {
            this.root.remove(this.parent);
            assert.same(null, this.parent.root);
            assert.same(null, this.parent.parent);
            assert.same(null, this.child.root);
            assert.same(this.parent, this.child.parent);
        } 
    }
});
