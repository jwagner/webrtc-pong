var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

var assert = require('assert'),
    q = require('q'),
    log = console.log.bind(console),
    rtc_options = { "iceServers": [{ "url": "stun:stun.example.org" }] },
    connection_options = {
          'optional': [{ 'RtpDataChannels': true }]
    };

function promise(f, args){
    f = f.bind.apply(f, args);
    return q.promise(f.bind(args)); 
}


function Peer(brokerURL, options){
    brokerURL = brokerURL || 'ws://' + window.location.host + '/webrtc-broker';
    options = options || {};
    this.ws = new WebSocket(brokerURL);
    var wsOpenDeferred = q.defer();
    this.ready = wsOpenDeferred.promise.then(function() {
        this._identify();
    }.bind(this));
    this.ws.onopen = function() {
        wsOpenDeferred.resolve(true);
    };
    this.ws.onerror = function(e) {
        console.warn(e);
        wsOpenDeferred.reject(e);
    };
    this.ws.onmessage = this._brokerMessage.bind(this);

    this.connections = Object.create(null);
    this.waiting = Object.create(null);
    this.onconnect = log;
    this.error = (function(e) {
        console.warn(e);
    }).bind(this);
    this.id = options.id || ~~(Math.random()*100000000);
    this.state = '';
}
Peer.prototype = {
    _identify: function(args) {
        this._brokerSend(['identify', this.id]);
    },
    _brokerSend: function(args) {
        log('brokerSend', args);
        this.ws.send(JSON.stringify(args));
    },
    _brokerMessage: function(e) {
        var args = JSON.parse(e.data),
            event = args[0];
        log('brokerMessage', args);
        if(event === 'err'){
            console.warn('Broker error', args);
        }
        else if(event === 'msg') {
            var sender = args[1],
                msg = args[2],
                cmd = msg[0];
                if(cmd === 'offer'){
                    assert(this.state === 'LISTEN', 'is listening for offers');
                    this.accept(sender, msg[1]);
                }
                if(cmd === 'candidate'){
                    if(sender in this.connections)
                        this.connections[sender].onIceCandidate(msg[1]);
                }
                else if(sender in this.waiting){
                    this.waiting[sender].resolve(msg);
                }
        }
    },
    _brokerSendCandidate: function(id, e) {
        if(!e.candidate) return;
        this._brokerSend(['msg', id, ['candidate', e.candidate]]);
    }, 
    _waitForBrokerMessageFrom: function(id) {
        this.waiting[id] = q.defer();
        // add timeout?
        return this.waiting[id].promise.fin(function() {
            delete this.waiting[id];
        }.bind(this));
    },
    connect: function(id) {
        this.state = 'CONNECTING';
        var connection = this.connections[id] = new Connection(this._brokerSendCandidate.bind(this, id));
        return this.ready
                .then(function() {
                    return connection.createOffer();
                }.bind(this))
                .then(function(description) {
                    this._brokerSend(['msg', id, ['offer', description]]);
                    return this._waitForBrokerMessageFrom(id);
                }.bind(this))
                .then(function(msg) {
                    assert(msg[0] === 'accept', 'peer must accept');
                    return connection.connect(msg[1]);
                });
    },
    listen: function() {
        this.state = 'LISTEN';
        return this.ready;
    },
    accept: function(id, offer) {
        var connection = this.connections[id] = new Connection(this._brokerSendCandidate.bind(this, id));
        connection.acceptOffer(offer)
            .then(function(answer) {
                this._brokerSend(['msg', id, ['accept', answer]]);
                return connection.waitForChannel();
            }.bind(this))
            .then(function(channel) {
                this.onconnect(channel);
            }.bind(this)).done();
    } 
};

function Connection(onice){
    var pc = this.pc = new RTCPeerConnection(rtc_options, connection_options);
    pc.ondatachannel = this.onDataChannel.bind(this);
    pc.onicecandidate = onice;
        this.state = '';
}
Connection.prototype = {
    onIceCandidate: function(description) {
        if(!description) return;
        console.log(description.candidate);
        var candidate = new RTCIceCandidate(description);
        this.pc.addIceCandidate(candidate);
    }, 
    onDataChannel: function(e) {
        log(e);
        this.dc = e.channel;
        this.dc.onopen = log;
        this.dc.onmessage = log;
        this.dc.onerror = log;

        if(this.waitForChannel) {
            this.waitForChannel.resolve(e.channel);
        }
    }, 
    waitForChannel: function() {
        this.waitingForChannel = q.defer();
        return this.waitingForChannel.promise;
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
            }.bind(this))
            .thenResolve(this); 
    },
    createOffer: function () {
        this.state = 'CONNECTING';
        this.dc = this.pc.createDataChannel("unreliable", {reliable: false});
        this.dc.onopen = log;
        this.dc.onmessage = log;
        this.dc.onerror = log;

        var pc = this.pc;
        return q.promise(pc.createOffer.bind(pc))
                    .then(function(description){
                        return q.promise(pc.setLocalDescription.bind(pc, description)).
                            thenResolve(description);
                    });
    }
};
module.exports = Peer;
