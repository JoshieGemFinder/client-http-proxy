const clientProxy = require('./../index'),
      rules = clientProxy.rules,
      url = require('url');

(async function() {
    
    let cert = (await clientProxy.certificateHelper.quickGenerate());
    
    let server = clientProxy.createServer(cert.buffers);
    
    server.addRule(rules.RedirectRule.create('https://example.com/').addMatch(function(URL, req) {
        return url.parse(URL).hostname == 'redirect.me.to'
    }));
    
    server.addRule(rules.RewriteRule.create('https://example.com/').addMatch(function(URL, req) {
        return url.parse(URL).hostname == 'rewrite.mo.ck'
    }).addMatch('*rewrite.mo.ck*'));
    
    server.listen(8005, () => {
        console.log(`Listening on ${server.host}:${server.port}`)
        console.log("Fingerprint: " + cert.certificate.fingerprint)
    });
    
})();