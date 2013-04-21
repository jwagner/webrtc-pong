var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

var assert = require('assert'),
    q = require('q'),
    _ = require('underscore'),
    EventEmitter = require('../events').EventEmitter,
    log = console.log.bind(console),
    rtc_options = {
        "iceServers": [
            // see http://www.html5rocks.com/en/tutorials/webrtc/basics/
            { "url": "stun:stun.l.google.com:19302" }
        ]
    },
    media_constraints = {
          'optional': [{ 'RtpDataChannels': true }]
    };

function Peer(brokerURL, options){
    EventEmitter.call(this);

    brokerURL = brokerURL || 'ws://' + window.location.host + '/webrtc-broker';
    options = options || {};
    this.broker = new Broker(brokerURL, options);
    this.id = this.broker.id;
    this.broker.on('message', this.onBrokerMessage.bind(this));

    this.connections = Object.create(null);
    this.listening = false;
}
module.exports = Peer;
_.extend(Peer.prototype, EventEmitter.prototype, {
    onBrokerMessage: function(event) {
        var sender = event.from,
            msg = event.data,
            cmd = msg[0];

        if(cmd === 'offer'){
            if(this.listening){
                this.accept(sender, msg[1]);
            }
            else {
                console.warn('got unexpected offer', sender, msg);
            }
        }
        if(cmd === 'candidate'){
            if(sender in this.connections) {
                this.connections[sender].addCandidate(msg[1]);
            }
            else {
                console.warn('got candidate from unknown sender', sender);
            }
        }
    }, 
    getConnection: function(id) {
        var c = this.connections[id] = new Connection();
        c.on('candidate', this.broker.sendCandidate.bind(this.broker, id));
        return c;
    }, 
    connect: function(id) {
        var connection = this.getConnection(id);
        return this.broker.ready
                .then(function() {
                    return connection.createOffer();
                }.bind(this))
                .then(function(description) {
                    this.broker.sendMessage(id, ['offer', description]);
                    return this.broker.waitForAccept(id);
                }.bind(this))
                .then(function(msg) {
                    assert.equal(msg[0],'accept', 'peer must accept');
                    return connection.connect(msg[1]);
                }).thenResolve(connection.ready);
    },
    listen: function() {
        this.listening = true;
        return this.broker.ready;
    },
    accept: function(id, offer) {
        var connection = this.getConnection(id);
        connection.acceptOffer(offer)
            .then(function(answer) {
                this.broker.sendMessage(id, ['accept', answer]);
            }.bind(this))
            .done(function() {
                this.emit('connection', connection);
            }.bind(this));
    }
});

function Connection(){
    EventEmitter.call(this);

    var pc = this.pc = new RTCPeerConnection(rtc_options, media_constraints);
    pc.ondatachannel = this.onDataChannel.bind(this);
    pc.onicecandidate = this.emit.bind(this, 'candidate');

    this.readyDeferred = q.defer();
    this.ready = this.readyDeferred.promise;
}
_.extend(Connection.prototype, EventEmitter.prototype, {
    addCandidate: function(description) {
        if(!description) return;
        //console.log(description.candidate);
        var candidate = new RTCIceCandidate(description);
        this.pc.addIceCandidate(candidate);
    }, 
    onDataChannel: function(e) {
        this.dc = e.channel;
        this.once('open', this.readyDeferred.resolve.bind(this.readyDeferred, this));
        this.once('error', this.readyDeferred.reject.bind(this.readyDeferred));
        this.dc.onopen = this.emit.bind(this, 'open');
        this.dc.onmessage = this.emit.bind(this, 'message');
        this.dc.onerror = this.emit.bind(this, 'error');
    }, 
    acceptOffer: function(offer) {
        var rtcdesc = new RTCSessionDescription(offer),
            pc = this.pc;
        return q.promise(pc.setRemoteDescription.bind(pc, rtcdesc))
            .then(function() {
                return q.promise(pc.createAnswer.bind(pc));
            }) 
            .then(function(answer) {
                return q.promise(pc.setLocalDescription.bind(pc, answer)).
                        thenResolve(answer);
            });
    },
    connect: function(description) {
        var rtcdesc = new RTCSessionDescription(description),
            pc = this.pc;
        return q.promise(pc.setRemoteDescription.bind(pc, rtcdesc))
            .then(function() {
                return this;
            }.bind(this));
    },
    createOffer: function () {
        this.dc = this.pc.createDataChannel("unreliable", {reliable: false});
        this.onDataChannel({channel: this.dc});

        var pc = this.pc;
        return q.promise(pc.createOffer.bind(pc))
                    .then(function(description){
                        return q.promise(pc.setLocalDescription.bind(pc, description)).
                            thenResolve(description);
                    });
    },
    send: function(data) {
        this.dc.send(data);
    }
});

function Broker(url, options){
    EventEmitter.call(this);

    options = options || {};
    this.id = options.id || ~~(Math.random()*100000000);

    this.ws = new WebSocket(url);
    var readyDeferred = q.defer();
    this.ready = readyDeferred.promise.then(function() {
        this.identify();
    }.bind(this));
    this.ws.onopen = function() {
        readyDeferred.resolve(true);
    };
    this.ws.onerror = function(e) {
        readyDeferred.reject(e);
    };

    this.ws.onmessage = this.onmessage.bind(this);

    this.waitingForAccept = Object.create(null);
}
_.extend(Broker.prototype, EventEmitter.prototype, {
    identify: function(args) {
        this.send(['identify', this.id]);
    },
    send: function(args) {
        var json = JSON.stringify(args);
        log('Broker.send', json);
        this.ws.send(json);
    },
    sendMessage: function(to, data) {
        this.send(['msg', to, data]);
    },
    sendCandidate: function(id, e) {
        if(!e.candidate) return;
        this.sendMessage(id, ['candidate', e.candidate]);
    }, 
    waitForAccept: function(id) {
        var waiting = this.waitingForAccept;
        waiting[id] = q.defer();
        // add timeout?
        return waiting[id].promise
            .fin(function() {
                delete waiting[id];
            });
    },
    onmessage: function(e) {
        log('Broker.onmessage', e.data);
        var msg = JSON.parse(e.data),
            type = msg[0];
        if(type === 'err'){
            console.warn('Broker error', msg);
            this.emit('error', msg);
        }
        else if(type === 'msg') {
            var sender = msg[1],
                data = msg[2];

            if(data[0] === 'accept' && sender in this.waitingForAccept){
                this.waitingForAccept[sender].resolve(data);
            }

            this.emit('message', {from: sender, data: data});
        }
        else {
            console.warn('Unknown Broker message', e.data);
        }
    }
});


