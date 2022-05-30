const clientProxy = require('./../index'),
      rules = clientProxy.rules,
      url = require('url');

(async function() {
    
    //create (or load) a certificate
    let cert = (await clientProxy.certificateHelper.quickLoad());
    //start a rule server
    let server = clientProxy.createServer(cert.buffers);
    //add a rule to redirect all requests that have a hostname of redirect.me.to to example.com
    server.addRule(rules.RedirectRule.create('https://example.com/').addMatch(function(URL, req) {
        return url.parse(URL).hostname == 'redirect.me.to'
    }));
    //add a rule to rewrite all urls that match *wildcard.rewrite.mo.ck* or have a hostname of rewrite.mo.ck to example.com
    server.addRule(rules.RewriteRule.create('https://example.com/').addMatch(function(URL, req) {
        return url.parse(URL).hostname == 'rewrite.mo.ck'
    }).addMatch('*wildcard.rewrite.mo.ck*'));
    //listen on port 8005, log fingerprint
    server.listen(8005, () => {
        console.log(`Listening on ${server.host}:${server.port}`)
        console.log("Fingerprint: " + cert.certificate.fingerprint)
    });
    
})();