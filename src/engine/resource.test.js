var resource = require('./resource'),
    q = require('q'),
    _ = require('underscore');

function FakeFetcher(resources){
    this.resources = resources;
}
FakeFetcher.prototype.fetch = function(description) {
    return q.fcall(function() {
        if(!(description.name in this.resources))
            throw new Error('fail.');
        return this.resources[description.name];
    }.bind(this)); 
}; 


buster.testCase('resource.Manager', {
    setUp: function() {
        this.subject = new resource.Manager({
            hello: 'hello world',
            fail: false
        });
    },
    'should process inputs': function(done) {
        this.subject.process = function(i, success, error) {
            assert.equals(i, 'hello world');
            success('processed');
        }; 
        this.spy(this.subject, 'process');
        this.subject.get('hello', function(value) {
            assert.calledWith(this.subject.process, 'hello world');
            assert.equals(value, 'processed');
            assert.equals(this.subject.values.hello, 'processed');
            done();
        }.bind(this)); 
    },
    'should fail if input is missing': function(done) {
        this.subject.getPromise('missing').then(function(){}, function(error) {
            assert(!this.subject.values.missing);
            done();
        }.bind(this)).done(); 
    } 

});

buster.testCase('resource.Loader', {
    'can be created': function(){
        assert(new resource.Loader().resources);
    },
    'loads bundle': function(done){
        var fetcher = new FakeFetcher({
                'bundles/all.json': {
                    resources: [
                        {name: 'test0', id: '123', type: 'text', size: 100},
                        {name: 'test1', id: '456', type: 'json', size: 200}
                    ]
                },
                test0: 'value0',
                test1: {json: true}
            }),
            loader = new resource.Loader(fetcher);
        this.spy(fetcher, 'fetch');
        loader.loadBundle('all').then(function() {
            assert.equals(loader.resources.test0, 'value0');
            assert.equals(loader.resources.test1.json, true);
            done();
        }); 
    },
    'handles failures': function(done){
        var fetcher = new FakeFetcher({
                'bundles/all.json': {
                    resources: [
                        {name: 'test0', id: '123', type: 'text', size: 100},
                        {name: 'test1', id: '456', type: 'json', size: 200}
                    ]
                },
                test1: {json: true}
            }),
            loader = new resource.Loader(fetcher);
        loader.loadBundle('all').then(function() {}, function(){
            assert(!loader.resources.test0);
            done();
        }); 
    }
});
