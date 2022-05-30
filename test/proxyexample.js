const clientProxy = require('client-http-proxy'),
      rules = clientProxy.rules;

(async function() {
    
    //create (or load) a certificate
    let cert = (await clientHttpProxy.certificateHelper.quickLoad());
    //start a rule server
    let server = clientHttpProxy.createServer(cert.buffers);
    //add a rule to rewrite all urls to go through the allorigins cors proxy
    server.addRule(rules.RewriteRule.create(url => {return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url)}, ['*']));
    //listen on port 8005, log fingerprint
    server.listen(8005, () => {
        console.log(`Listening on ${server.host}:${server.port}`)
        console.log("Fingerprint: " + cert.certificate.fingerprint)
    });
    
})();