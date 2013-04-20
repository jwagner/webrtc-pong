Peer = require('./engine/webrtc/peer')

InputHandler = require('./engine/input').Handler
Clock = require('./engine/clock').Clock

canvas = document.getElementById('c')
WIDTH = canvas.width = 640
HEIGHT = canvas.height = 480

class Rect
    constructor: (@center, @width, @height) ->
        @left = @center.x - @width*0.5
        @right = @center.x + @width*0.5
        @top = @center.y - @height*0.5
        @bottom = @center.y + @height*0.5

    recalc: ->
        @left = @center.x - @width*0.5
        @right = @center.x + @width*0.5
        @top = @center.y - @height*0.5
        @bottom = @center.y + @height*0.5


rect = (x, y, width, height) -> new Rect(v2(x, y), width, height)

# center -> new center of circle after moveing
rect_circle_collision = (rect, circle, center) ->
    new_rect = new Rect(rect.center, rect.width+circle.radius*2,
        rect.height+circle.radius*2)
    if not (center.x < new_rect.left or center.x > new_rect.right or center.y > new_rect.bottom or center.y < new_rect.top)
        # find axis of collision
        if new_rect.left < circle.center.x < new_rect.right
            'y'
        else if new_rect.top < circle.center.y < circle.center.top
            'x'
        else
            'xy'
class V2
    constructor: (@x, @y) ->

    iadd: (v) ->
        @x += v.x
        @y += v.y
        this

    set: (@x, @y) ->
        this

    add: (v) ->
        new V2(@x+v.x, @y+v.y)

    sub: (v) ->
        new V2(@x-v.x, @y-v.y)

    mul: (v) ->
        new V2(@x*v.x, @y*v.y)
 
    muls: (s) ->
        new V2(@x*s, @y*s)

    imuls: (s) ->
        @x *= s
        @y *= s
        this

    divs: (s) ->
        this.muls(1/s)

    mag: (s) ->
        sqrt(@x*@x+@y*@y)

    normalize: ->
        this.divs(this.mag())

    copy: ->
        new V2(@x, @y)

    valueOf: ->
        throw 'Tried to use V2 as scalar'

    toString: ->
        "v2(#{@x}, #{@y})"

V2.random = ->
    new V2(random()-0.5, random()-0.5).normalize()
v2 = (x, y) -> new V2(x, y)


class Circle
    constructor: (@center, @radius) ->


class Ball extends Circle
    constructor: () ->
        super(v2(WIDTH/2, HEIGHT/2), 5)
        @velocity = v2(0, 0)

class Game
    constructor: ->
        @score =
            left: 0
            right: 0
        @left = rect(10, HEIGHT/2, 10, HEIGHT/4)
        @right = rect(WIDTH-10, HEIGHT/2, 10, HEIGHT/4)
        @ball = new Ball()


clock = new Clock()
input = new InputHandler(canvas)
input.blur()
game = new Game()
log = console.log.bind(console)

if(window.location.hash)
    peer = new Peer()
    window.setTimeout((() ->
        id = window.location.hash.substr(1)
        peer.connect(id).done (connection) ->
            connection.on 'message', log
            console.log('connection ready', connection)
            window.connection = connection
            connection.send('hello from client')
    ), 2000)
else
    peer = new Peer(null, {id: 'foo'})
    peer.on('connection', (connection) ->
        connection.ready.done (connection) ->
            connection.on 'message', log
            console.log('peer connection ready', connection)
            window.connection = connection
            connection.send('hello from server')
    )
    peer.listen()
    #window.location.hash = '#' + peer.id
window.peer = peer

#send = (ws, data) ->
    #ws.send JSON.stringify(data)

#ws = new WebSocket("ws://#{window.location.host}")
#console.log 'connecting'
#ws.onmessage = (e) ->
    #[event, args...] = JSON.parse(e.data)
    #switch event
        #when 'master'
            #startServer()
        #when 'offer'
            #accept(args[0])
        #when 'submitTo'
            #startClient(args[0])


#rtc_options = { "iceServers": [{ "url": "stun:stun.example.org" }] }
#connection_options = {
      #'optional': [{ 'RtpDataChannels': true }]
    #}
#window.pc = peerConnection = new RTCPeerConnection(rtc_options, connection_options)
#log = console.log.bind(console)
#noop = () -> undefined

#startClient = (offer) ->
    #log 'client'
    #ready = () ->
        #log 'remote description set'
        #answerReady = (description) ->
            #log 'answerReady'
            #descriptionReady = () ->
                #log 'descriptionReady', description
                #send(ws, ['submitTo', description])
            #peerConnection.setLocalDescription(description, descriptionReady, log)
        #peerConnection.createAnswer(answerReady, log)
    
    #rtcdesc = new RTCSessionDescription(offer)

    #peerConnection.setRemoteDescription(rtcdesc, ready, log)


#startServer = () ->
    #log 'server'
    #ready = (description) ->
        #send(ws, ['master', description])
        #peerConnection.setLocalDescription(description)
    #peerConnection.createOffer(ready, log)

#accept = (offer) ->
    #ready = () ->
        #console.log('ready')
        #window.channel = peerConnection.createDataChannel("game", {reliable: false})
    #rtcdesc = new RTCSessionDescription(offer)
    #peerConnection.setRemoteDescription(rtcdesc, ready, log)

