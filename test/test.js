const clientProxy = require('client-http-proxy'),
      url = require('url');

(async function() {
    
    //create (or load) a certificate
    let cert = (await clientProxy.certificateHelper.quickLoad());
    //start a raw server, with the specified listener
    let server = clientProxy.createRawServer(cert.buffers, function(req, res) {
        let parsed = url.parse(req.url)
        if(server.isChildUrl(req.url)) {
            res.end('Hello World! at ' + url.parse(req.url).pathname)
        } else if(parsed.hostname == 'example.com') {
            clientProxy.passThroughRequest(req, res)
        } else if(parsed.hostname == 'mock.site') {
            res.end('Hello from Mock Site!');
        } else {
            res.end(req.url);
        }
    });
    //listen on port 8005, log fingerprint
    server.listen(8005, () => {
        console.log(`Listening on ${server.host}:${server.port}`)
        console.log("Fingerprint: " + cert.certificate.fingerprint)
    });
    
})();