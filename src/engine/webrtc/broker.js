var WebSocketServer = require('ws').Server,
    _ = require('underscore');

function Broker(options){
    options = options || {};
    this.server = new WebSocketServer(_.extend({
        path: '/webrtc-broker'
    }, options.ws));
    this.clients = Object.create(null);
    this.server.on('connection', this.connect.bind(this));
}
Broker.prototype = {
    connect: function(ws) {
        var id = '';
        ws.on('message', function(data) {
            var args;
            try {
                args = JSON.parse(data);
            }
            catch(e){
                console.warn(e);
                return;
            }
            if(!args) {
                console.warn('invalid args');
                return;
            }
            var cmd = args[0];
            if(cmd === 'identify'){
                var newId = args[1], name = args[2];
                if(id !== '') {
                    console.warn(newId, 'already identified as', id);
                    return;
                }
                else if(this.clients[newId]) {
                    console.warn('id in use', newId);
                    ws.close();
                    return;
                }
                id = newId;
                this.clients[id] = {ws: ws};
            }
            else if(cmd === 'msg') {
                if(!id || !this.clients[id]){
                    console.warn('client must identify first');
                    return;
                }
                var peer = this.clients[args[1]];
                if(peer){
                    peer.ws.send(JSON.stringify([
                        'msg',
                        id,
                        args[2]
                    ]));
                }
                else {
                    ws.send(JSON.stringify(['err', 'not found', args[1]]));
                }
            }
            else {
                console.warn('invalid cmd', cmd);
            }
        }.bind(this));
        ws.on('close', function(data) {
            if(id) {
                delete this.clients[id];
            }
        }.bind(this));
    } 
};

module.exports = Broker;
