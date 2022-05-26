const clientProxy = require('./../index'),
      rules = clientProxy.rules;

(async function() {
    
    let cert = (await clientProxy.certificateHelper.quickLoad());
    
    let server = clientProxy.createServer(cert.buffers);
    
    server.addRule(rules.RewriteRule.create(url => {return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url)}, ['*']));
    
    server.listen(8005, () => {
        console.log(`Listening on ${server.host}:${server.port}`)
        console.log("Fingerprint: " + cert.certificate.fingerprint)
    });
    
})();