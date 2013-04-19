express = require('express')
Broker = require('./engine/webrtc/broker')
http = require('http')
_ = require('underscore')
browserify = require('browserify-middleware')
app = express()
webServer = http.createServer(app)

broker = new Broker(
    ws:
        server: webServer
)
browserify_options = {detectGlobals: true, insertGlobals: false, transform: ['coffeeify'], debug: false}
app.get('/pong.js', browserify('./pong.coffee', browserify_options))
app.use(express.static('public/'))
webServer.listen(8080)
