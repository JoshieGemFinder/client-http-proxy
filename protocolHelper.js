const dictionary = {
    "ftp": 21,
    "gopher": 70,
    "http": 80,
    "https": 443,
    "ws": 80,
    "wss": 443
}

function getPort(protocol) {
    if(typeof(protocol) == 'string') {
        protocol = strip(protocol)
        return dictionary[protocol] || 80
    }
    return 80
}

function getProtocol(port) {
    if(typeof(port) == 'number') {
        for(let protocol in dictionary) {
            if(dictionary[protocol] == port) {
                return protocol
            }
        }
    }
    return null
}

function isHttp(protocol) {
    if(typeof(protocol) == 'string') {
        protocol = strip(protocol)
        return protocol == "http" || protocol == "https"
    }
    return false
}

function strip(protocol) {
    if(typeof(protocol) == 'string') {
        protocol = protocol.indexOf(":") != -1 ? protocol.substr(0, protocol.indexOf(":")) : protocol
    }
    return protocol
}

module.exports = { getPort, isHttp, strip }