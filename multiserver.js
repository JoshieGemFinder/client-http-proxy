//Stolen 💀💀💀
//(because i needed  to change a few things)
//https://github.com/mscdex/httpolyglot/

const http = require('http'),
      https = require('https'),
      util = require('util'),
      net = require('net'),
      httpConnectionListener = http._connectionListener;

function onError() {}

var connectionListener;
//check if old node version:
if(/^v0\.10\./.test(process.version)) {
    connectionListener = function(socket) {
        let self = this

        // Ignore any errors before detection
        socket.on('error', onError)

        socket.ondata = function(d, start, end) {
            let firstByte = d[start]
            socket.removeListener('error', onError)
            if (firstByte < 32 || firstByte >= 127) {
                socket.ondata = null
                self._tlsHandler(socket)
                socket.push(d.slice(start, end))
            } else {
                self.__httpSocketHandler(socket)
                socket.ondata(d, start, end)
            }
        }
    }
} else {
    connectionListener = function(socket) {
        let self = this
        let data
        data = socket.read(1)
        if (data == null) {
            socket.removeListener('error', onError)
            socket.on('error', onError)

            socket.once('readable', function() {
                self._connListener(socket)
            })
        } else {
            socket.removeListener('error', onError)
            
            let firstByte = data[0]
            socket.unshift(data)
            if (firstByte < 32 || firstByte >= 127) {
                // tls/ssl
                this._tlsHandler(socket)
            } else {
                this.__httpSocketHandler(socket)
            }
        }
    }
}

function MultiServer(options, requestListener) {
    if(!(this instanceof MultiServer)) {
        return new MultiServer(options, requestListener)
    }
    
    if (typeof(options) == 'function') {
        requestListener = options;
        options = undefined
    }
    
    if (typeof(options) == 'object') {
        this.removeAllListeners('connection')

        https.Server.call(this, options, requestListener)

        let connev = this._events.connection
        if (typeof(connev) == 'function') {
            this._tlsHandler = connev
        } else {
            this._tlsHandler = connev[connev.length - 1]
        }
        this.removeListener('connection', this._tlsHandler)

        this._connListener = connectionListener
        this.on('connection', connectionListener)

        // copy from http.Server
        this.timeout = 2 * 60 * 1000
        this.allowHalfOpen = true
        this.httpAllowHalfOpen = false
    } else {
        http.Server.call(this, requestListener)
    }
}
util.inherits(MultiServer, https.Server)

MultiServer.prototype.setTimeout = function(msecs, callback) {
    this.timeout = msecs
    if (callback) {
        this.on('timeout', callback)
    }
}

function isNum(n) {
    return typeof(n) == 'number' || n instanceof Number
}

function isStr(s) {
    return typeof(s) == 'string' || s instanceof String
}

let oldListen = MultiServer.prototype.listen

MultiServer.prototype.listen = function(port, host, callback) {
    this.port = isNum(port) ? port : (isNum(host) ? host : 443)
    this.host = isStr(host) ? host : (isStr(port) ? port : 'localhost')
    let cb = callback
    if(typeof(cb) != 'function') {
        if(typeof(port) == 'function') {
            cb = port
        } else if(typeof(host) == 'function') {
            cb = host
        }
    }
    oldListen.call(this, this.port, this.host, cb)
}

MultiServer.prototype.isChildUrl = function(URL) {
    if(this.listening && typeof(URL) == 'string') {
        let url = require('url').parse(URL);
        return url.host == null || (url.hostname == this.host && (url.port == null || url.port == this.port))
    }
    return false;
}

MultiServer.prototype.__httpSocketHandler = httpConnectionListener

exports.MultiServer = MultiServer

exports.createServer = function(options, requestListener) {
    return new MultiServer(options, requestListener)
}