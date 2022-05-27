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
        /*let URL = url.parse(req.url)
        URL.protocol = URL.protocol || (((req.socket.encrypted != undefined && req.socket.encrypted == true) || (req.socket.encrypted == undefined && req.socket.localPort == 443)) ? 'https:' : 'http:')
        if(URL.host == null) {
            let host = req.headers.host
            let splithost = host.indexOf(':') != -1 ? host.split(':') : [host, protocolHelper.strip(URL.protocol) == 'http' ? 80 : 443]
            URL.host = splithost.join(':')
            URL.hostname = URL.hostname || splithost[0]
            URL.port = URL.port || splithost[1]
        }
        URL.port = URL.port || protocolHelper.strip(URL.protocol) == 'http' ? 80 : 443
        URL.host = URL.host.indexOf(':') != -1 ? URL.host : URL.host + ':' + URL.port.toString()*/
        req.url = fancyParser.url.format(fancyParser.url.fromIncomingMessage(req))//url.format(URL)
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
    
    return {
        listen: server.listen.bind(server),
        addRule: (rule) => { rules.push(rule) },
        get host() { return server.host },
        get port() { return server.port },
        server: server
    };
}

exports.rules = rules

exports.certificateHelper = certificateHelper;

exports.fancyParser = fancyParser