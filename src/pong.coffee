_ = require('underscore')
Peer = require('./engine/webrtc/peer')

InputHandler = require('./engine/input').Handler
Clock = require('./engine/clock').Clock
fixedstep = require('./engine/clock').fixedstep

canvas = document.getElementById('c')
ctx = canvas.getContext('2d')
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

random = Math.random
v2 = (x, y) -> new V2(x, y)


class Circle
    constructor: (@center, @radius) ->


class Ball extends Circle
    constructor: () ->
        super(v2(WIDTH/2, HEIGHT/2), 8)
        @velocity = v2(0, 0)

class Game
    constructor: ->
        @score =
            left: 0
            right: 0
        @left = rect(32, HEIGHT/2, 16, HEIGHT/4)
        @right = rect(WIDTH-32, HEIGHT/2, 16, HEIGHT/4)
        @ball = new Ball()

    start: () ->
        if master
            @ball.velocity.x = (0.5+random())*200
            @ball.velocity.y = (random()-0.5)*200
            if random() > 0.5
                @ball.velocity.x *= -1
        else
            @ball.velocity.x = 0
            @ball.velocity.y = 0
        @ball.center = v2(WIDTH/2, HEIGHT/2)

    tick: (td) ->
        # walls
        if @ball.center.y < @ball.radius + 16 && @ball.velocity.y < 0 || @ball.center.y > HEIGHT - @ball.radius - 16 && @ball.velocity.y > 0
            @ball.velocity.y *= -1.1

        if @ball.center.x < 0
            @score.right++
            @start()

        if @ball.center.x > WIDTH
            @score.left++
            @start()

        if @ball.center.x - @ball.radius >= 32 && @ball.center.x - @ball.radius + @ball.velocity.x*td < 32
            if @ball.center.y - @ball.radius < @left.bottom && @ball.center.y + @ball.radius > @left.top
                @ball.velocity.x *= -1
                @ball.velocity.imuls(1.1)
                @ball.velocity.y += (@ball.center.y - @left.center.y)

        if @ball.center.x + @ball.radius <= WIDTH-32 && @ball.center.x + @ball.radius + @ball.velocity.x*td > WIDTH-32
            if @ball.center.y - @ball.radius < @right.bottom && @ball.center.y + @ball.radius > @right.top
                @ball.velocity.x *= -1
                @ball.velocity.imuls(1.1)
                @ball.velocity.y += (@ball.center.y - @right.center.y)

        @ball.center.iadd(@ball.velocity.muls(td))


clock = new Clock()
input = new InputHandler(canvas)
input.blur()
window.game = game = new Game()
master = true
log = console.log.bind(console)
connection = null
msg = null

$ = document.querySelectorAll.bind(document)

if(window.location.hash)
    master = false
    $('#invite')[0].style.display = 'none'
    peer = new Peer()
    window.setTimeout((() ->
        id = window.location.hash.substr(1)
        peer.connect(id).done (c) ->
            connection = c
            connection.on 'message', (message) ->
                msg = message
            console.log('connection ready', connection)
            window.connection = connection
            start()
            #connection.send('hello from client')
    ), 2000)
else
    peer = new Peer(null, {id: 'foo'})
    peer.on('connection', (c) ->
        c.ready.done (c) ->
            connection = c
            connection.on 'message', (message) ->
                msg = message
            console.log('peer connection ready', connection)
            window.connection = connection
            start()
            #connection.send('hello from server')
    )
    peer.listen()
    $('#invite div')[0].textContent = window.location.href + '#' + peer.id
    #window.location.hash = '#' + peer.id
window.peer = peer

net = () ->
    if master
        connection.send(JSON.stringify {
            left: game.left.center.y,
            ball: game.ball,
            score: game.score
        })
    else
        connection.send(JSON.stringify {right: game.right.center.y})
    if msg
        d = JSON.parse msg.data
        if master
            game.right.center.y = d.right
            game.right.recalc()
        else
            game.score = d.score
            game.ball.center.x = game.ball.center.x*0.8 + d.ball.center.x*0.2
            game.ball.center.y = game.ball.center.y*0.8 + d.ball.center.y*0.2
            game.ball.center.y = d.ball.center.y
            game.ball.velocity.x = d.ball.velocity.x
            game.ball.velocity.y = d.ball.velocity.y
            game.left.center.y = d.left
            game.left.recalc()
        msg = null

render = (tr) ->
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff'
    # walls
    ctx.fillRect(0, 0, canvas.width, 16)
    ctx.fillRect(0, canvas.height - 16, canvas.width, 16)
    ctx.font = '48px Geo'
    ctx.textAlign = 'center'
    ctx.fillText(game.score.left + ' : ' + game.score.right, WIDTH/2, 64)
    # ball
    b = game.ball
    ctx.fillRect(b.center.x - b.radius + b.velocity.x * tr, b.center.y - b.radius + b.velocity.y * tr, b.radius*2, b.radius*2)
    # paddles
    ctx.fillRect(p.left, p.top, p.width, p.height) for p in [game.left, game.right]

tickGame = fixedstep(1/60, game.tick.bind(game))
tickNet = fixedstep(1/20, net)
clock.ontick = (td) ->
    if master
        game.left.center.y = input.mouse.y
        game.left.recalc()
    else
        game.right.center.y = input.mouse.y
        game.right.recalc()
    tickNet(td)
    tr = tickGame(td)
    render(tr)

start = ->
    game.start()
    clock.start()

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

