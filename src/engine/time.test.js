
var time = require('./time');
buster.testCase('Clock', {
    'should tick': function (done) {
        var clock = new time.Clock();
        clock.ontick = function(dt){
            assert(dt >= 0.00);
            assert(dt <= clock.maxdt);
            clock.stop();
            done();
        };
        this.stub(time, 'requestAnimationFrame', function(f) {
            window.setTimeout(f, 2);
        }); 
        clock.start();
        assert.called(time.requestAnimationFrame);
    }
});

