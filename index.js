const http = require('http'),
      https = require('https'),
      net = require('net'),
      url = require('url'),
      multiserver = require('./multiserver'),
      protocolHelper = require('./protocolHelper'),
      caLib = require('./caLib'),
      rules = require('./rules'),
      fancyParser = require('./fancyParser');

const certificateHelper = {
    generateCACertificate: caLib.genCACert,
    genCACert: caLib.genCACert,
    getCertificateBuffers: caLib.caToBuffer,
    caToBuffer: caLib.caToBuffer,
    loadOrCreateCertificate: caLib.loadOrCreateCertificate,
    quickGenerate: async function quickGenerate(options = {}) {
        let certificate = (await caLib.genCACert(options));
        let buffers = caLib.caToBuffer(certificate.ca);
        return {
            buffers,
            certificate
        };
    },
    quickLoad: async function quickGenerate(options = {}) {
        let certificate = (await caLib.loadOrCreateCertificate(options));
        let buffers = caLib.caToBuffer(certificate.ca);
        return {
            buffers,
            certificate
        };
    }
}

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

function generateTextRes(line, headers) {
    let out = line + '\r\n'
    let keys = Object.keys(headers)
    let outhead = []
    for(let header of keys) {
        let val = headers[header]
        if(!Array.isArray(val)) {
            outhead.push(header + ': ' + val) 
        } else {
            for(let v of val) {
                outhead.push(header + ': ' + v)
            }
        }
    }
    return out + outhead.join('\r\n') + '\r\n\r\n'
}

function generateTextResponse(res) {
    return generateTextRes('HTTP/' + res.httpVersion + ' ' + res.statusCode + ' ' + res.statusMessage, res.headers)
}

function createMultiServer(options, listener) {
    
    if(typeof(options) == 'function') {
        let oldOp = options
        if(typeof(listener) == 'object') {
            options = listener
        } else {
            options = {}
        }
        listener = oldOp
    }
    
    let server = multiserver.createServer(options, function(req, res) {
        req.url = fancyParser.url.format(fancyParser.url.fromIncomingMessage(req))
        listener(req, res)
    })
    
    server.on('connect', (req, socket, head) => {
        try {
            let conn = net.connect(server.port, server.host, () => {
                socket.write(`HTTP/${req.httpVersion} 200 Connection Established\r\n\r\n`, "UTF-8", () => {
                    conn.pipe(socket)
                    socket.pipe(conn)
                })
            })
            
            conn.on('error', e => {
                console.log("conn error: ")
                console.log(e)
                if(socket && !socket.destroyed) { socket.end() }
            })
            
            socket.on('error', e => {
                console.log("socket error: ")
                console.log(e)
                if(socket && !socket.destroyed) { socket.end() }
            })
        } catch(e) {
            console.log("CONNECT error")
            console.log(e)
            if(socket && !socket.destroyed) { socket.end() }
        }
    })
    
    server.on('upgrade', (req, socket, head) => {
        let URL = fancyParser.url.fromIncomingMessage(req)
        let headers = req.headers
        if(typeof(headers.connection) == 'string' && headers.connection.toLowerCase() == 'upgrade') {
            let upgrade = typeof(headers.upgrade) == 'string' ? headers.upgrade : null
            if(upgrade != null) {
                if(upgrade.toLowerCase() == 'websocket') {
                    //remove timeout and stuff
                    socket.setTimeout(0)
                    socket.setNoDelay(true)
                    socket.setKeepAlive(true, 0)
                    
                    //if a head packet has been sent, put it back at the start of the socket stream, so it can be read again
                    if(head != null && head.length > 0) { socket.unshift(head) }
                    
                    //get the port
                    let lib = (URL.encrypted ? https : http)
                    
                    let options = {...fancyParser.url.urlToHttpOptions(URL), ...{
                        method: req.method,
                        headers
                    }}
                    
                    //remove the protocol to avoid errors
                    delete options.protocol
                    
                    let request = lib.request(options, (res) => {
                        if(!res.upgrade) {
                            //if it isn't going to be upgraded, stop acting like a websocket and start acting like a normal http(s) request
                            socket.write(generateTextResponse(res));
                            res.pipe(socket);
                        }
                    })
                    
                    request.on('upgrade', function(res, resSocket, resHead) {
                        
                        //same as before
                        resSocket.setTimeout(0)
                        resSocket.setNoDelay(true)
                        resSocket.setKeepAlive(true, 0)
                        
                        request.on('error', function(e) {
                            if(!socket.destroyed) { socket.destroy() }
                        })
                        
                        socket.on('error', function (e) {
                            resSocket.end();
                        })
                        
                        //same as before
                        if(resHead != null && resHead.length > 0) { resSocket.unshift(resHead) }
                        
                        //write the successful websocket upgrade text
                        socket.write(generateTextRes('HTTP/1.1 101 Switching Protocols', res.headers));
                        
                        //pipe it through
                        resSocket.pipe(socket)
                        socket.pipe(resSocket)
                    })
                    
                    //actually send the request
                    request.end()
                } else {
                    socket.end()
                }
            } else {
                socket.end()
            }
        } else {
            socket.end()
        }
    })
    
    return server;
}

function passThroughRequest(req, res) {
    let URL = fancyParser.url.fromIncomingMessage(req)
    let options = {
        rejectUnauthorized: false,
        method: req.method,
        headers: req.headers,
        agent: false
    }
    options = {...url.urlToHttpOptions(URL), ...options}
    let lib = http
    if(options.port == 443 || protocolHelper.strip(URL.protocol) == 'https') {
        lib = https
    }
    let request = lib.request(options, response => {
        res.writeHead(response.statusCode, response.headers)
        response.pipe(res, {end: true})
    })
    
    req.pipe(request, {end: true});
    
    req.on('aborted', () => {req.unpipe(request); request.abort()})
    
    req.on('error', e => {
        if(e.message.includes('ECONNRESET')) {
            console.log('Client unexpectedly closed the passThrough request! (' + req.url + ')')
        } else {
            console.log('An unexpected error occurred during passThrough! It came from the client.')
            console.log('This shouldn\'t happen, did your request close abruptly?')
            console.log(e)
        }
    })
    
    request.on('error', e => {
        if(e.message.includes('ECONNRESET')) {
            console.log('Server unexpectedly closed the passThrough request! (' + req.url + ')')
        } else if(e.message.includes('ETIMEDOUT')) {
            console.log('Request Timed Out! (' + req.url + ')')
        } else {
            console.log('An unexpected error occurred during passThrough! It came from the server.')
            console.log('This shouldn\'t happen, did your request close abruptly?')
            console.log(e)
        }
        if(!res.socket.destroyed) { res.socket.destroy() }
    })
}

exports.passThroughRequest = passThroughRequest

exports.createRawServer = function createRawServer(options, listener) {
    
    let server = createMultiServer(options, listener)
    
    //there was some code here, but it got moved
    
    return server;
}

exports.createServer = function createServer(options, relativeListener) {
    relativeListener = relativeListener || function(req, res) {
        res.end(req.method + " " + url.parse(req.url).pathname + ". Looks like someone forgot to put a listener for relative urls!")
    }
    
    let rules = [];
    
    let server = createMultiServer(options, (req, res) => {
        if(server.isChildUrl(req.url)) {
            relativeListener(req, res)
        } else {
            for(let rule of rules) {
                if(rule.matches(req.url, req)) {
                    rule.apply(req, res)
                    if(rule.countsAsResponse) {
                        return;
                    }
                    if(rule.stopsProccessing) {
                        break;
                    }
                }
            }
            passThroughRequest(req, res)
        }
    });
    
    return new Proxy({
        addRule: (rule) => { rules.push(rule) },
        server: server
    }, {
        get(obj, key) {
            if(key in obj) {
                return Reflect.get(obj, key)
            }
            return Reflect.get(server, key)
        },
        set(obj, key, value) {
            return Reflect.set(server, key, value)
        }
    });
}

exports.rules = rules

exports.certificateHelper = certificateHelper;

exports.fancyParser = fancyParser