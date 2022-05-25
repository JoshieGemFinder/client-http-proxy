
const url = require('url');

function makeHandler(inherits) {
    let handler = {
        set(target, prop, reciever) {
            return false;
        },
        deleteProperty(obj, key) {
            return false;
        },
        ownKeys(obj) {
            let keys = []
            for(let key of Reflect.ownKeys(inherit)) {
                if(!keys.includes(key)) {
                    keys.push(key)
                }
            }
            for(let key of Reflect.ownKeys(obj)) {
                if(!keys.includes(key)) {
                    keys.push(key)
                }
            }
            return keys
        }
    }
    if(inherits != null) {
        handler = {...handler, 
            get(obj, key) {
                return key in obj ? obj[key] : inherits[key];
            }
        }
    }
    return handler
}

function toLowerCase(val) {
    return (typeof(val) == 'string' || (val instanceof String)) ? val.toLowerCase() : val
}

const fancyParser = {}

const fancyUrl = new Proxy({
    fromIncomingMessage: function fromIncomingMessage(req, ...options) {
        let parsed = url.parse(req.url, ...options)
        let https = req.socket.encrypted == true || parsed.protocol == 'https:'
        let defaultProtocol = https ? 'https:' : 'http:'
        let defaultPort = https ? '443' : '80'
        
        let host = req.headers.host
        let splitHost = host.indexOf(':') != -1 ? [host.substring(0, host.lastIndexOf(':')), host.substring(host.lastIndexOf(':')+1)] : [host, defaultPort]
        
        parsed.protocol = parsed.protocol || defaultProtocol
        parsed.slashes = true
        parsed.hostname = parsed.hostname || splitHost[0]
        parsed.port = parsed.port || splitHost[1]
        
        if(parsed.host == null || (parsed.host.indexOf(':') == -1 && parsed.host == splitHost[0])) {
            if(splitHost[1] == defaultPort) {
                parsed.host = splitHost[0]
            } else {
                parsed.host = splitHost.join(':')
            }
        }
        
        parsed.href = fancyUrl.format(parsed)
        
        return parsed
    },
    format: function format(urlObject) {
        let out = ''
        
        let defaultPort = toLowerCase(urlObject.protocol) == 'https:' || toLowerCase(urlObject.protocol) == 'https' || toLowerCase(urlObject.port) == '443' ? '443' : '80'
        
        let defaultProtocol = defaultPort == '80' ? 'http:' : (defaultPort == '443' ? 'https:' : null)
        
        out = (toLowerCase(urlObject.protocol) || defaultProtocol || '') + (urlObject.slashes == true ? '//' : '') + (urlObject.auth != null ? urlObject.auth + '@' : '')
        
        let host = toLowerCase(urlObject.host)
        
        let hostname = toLowerCase(urlObject.hostname) || (typeof(host) == 'string' && host.lastIndexOf(':') != -1 ? host.substring(0, host.lastIndexOf(':')) : host) 
        let port = toLowerCase(urlObject.port) || (typeof(host) == 'string' && host.lastIndexOf(':') != -1 ? host.substring(host.lastIndexOf(':') + 1) : defaultPort)
        
        out = out + hostname + (typeof(port) == 'string' && port != defaultPort ? ':' + port : '') + (urlObject.path || '') + (urlObject.hash || '')
        
        return out
    }
}, makeHandler(url))

fancyParser.toLowerCase = toLowerCase
fancyParser.url = fancyUrl
fancyParser.fancyUrl = fancyUrl

module.exports = new Proxy(fancyParser, makeHandler())