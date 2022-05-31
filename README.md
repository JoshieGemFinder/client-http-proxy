# client-http-proxy  
A client-side http proxy for nodejs!  
## But what does it do?  
This functions as a http proxy that runs on your local machine, it was originally inspired by mockttp, which I ran into some issues with when I was using, so I decided to make my own  
(throughout this documentation, it is assumed that `clientHttpProxy` is the module, i.e. `const clientHttpProxy = require('client-http-proxy')`)  
  
It doesn't have quite as many features (yet), but its main ones are:  
  
## Certificate Creation  
This has in-built ssl certificate creation, using `certificateHelper`!  
`certificateHelper` has some built-in functions for you to use:  
  
[`certificateHelper.generateCACertificate()` (alias `certificateHelper.genCACert()`)](#certificatehelpergeneratecacertificateoptions)  
[`certificateHelper.getCertificateBuffers()` (alias `certificateHelper.caToBuffer()`)](#certificatehelpergetcertificatebuffersca)  
[`certificateHelper.loadOrCreateCertificate()`](#certificatehelperloadorcreatecertificateoptions)  
[`certificateHelper.quickGenerate()`](#quickGenerate)  
[`certificateHelper.quickLoad()`](#certificatehelperquickloadoptions)  
  
### certificateHelper.generateCACertificate([options])  
  
***WARNING: `async` function! Use `await` to get the return value!***  
  
Arguments:  
* `options` \<Object\>  
    * `commonName` \<string\>: the name of the certificate. (Default: `"Client Proxy Testing CA - DO NOT TRUST"`)  
    * `bits` \<int\>: the number of bits in the certificate. (Default: `2048`)  

* Returns: \<Object\>  
    * `ca` \<Object\>  
    * `cert` \<string\>: the certificate's PEM  
    * `key` \<string\>: the certificate private key's PEM  
    * `fingerprint` \<string\>: the base64-encoded sha256 fingerprint of the public key, used by browsers to ignore the fact that this certificate is self-signed and untrusted  
    * `publicKey` \<string\>: the public key's PEM  
  
Creates a self-signed certificate with the specified name and bits, pass the returned object's `ca` through `certificateHelper.getCertificateBuffers(ca)` if you want to be able to use it as the certificate for `https.createServer`  
  
#### Example  
```  
const clientProxy = require('client-proxy-server'),  
      https = require('https');  
  
//async for a top-level await  
(async function() {  
    //create the cert  
    let cert = await clientProxy.certificateHelper.generateCACertificate();  
    let options = clientProxy.certificateHelper.getCertificateBuffers(cert.ca);  
    let server = https.createServer(options, (req, res) => {  
        res.end("Hello, World!");  
    });  
    server.listen();  
})();  
```  
  
### certificateHelper.getCertificateBuffers(ca)  
  
Arguments:  
* `ca` \<Object\>: the certificate data to create buffers from  
    * `cert` \<string\>: the certificate's PEM to convert to a buffer  
    * `key` \<string\>: the certificate private key's PEM to convert to a buffer 
 
* Returns: \<Object\>  
    * `cert` \<Buffer\>: the buffer of the certificate PEM  
    * `key` \<Buffer\>: the buffer of the certificate's private key  
  
Used to create the buffers required for `https.createServer`'s `options`  
  
#### Example  
```  
const clientProxy = require('client-proxy-server'),  
      https = require('https');  
  
//async for a top-level await  
(async function() {  
    //create the cert  
    let cert = await clientProxy.certificateHelper.generateCACertificate();  
    let options = clientProxy.certificateHelper.getCertificateBuffers(cert.ca);  
    let server = https.createServer(options, (req, res) => {  
        res.end("Hello, World!");  
    });  
    server.listen();  
})();  
```  
  
### certificateHelper.loadOrCreateCertificate([options])  
  
***WARNING: `async` function! Use `await` to get the return value!***  
  
Arguments:  
* `options` \<Object\>  
    * `folder` \<String\>: The folder to look for (and save to, if neccessary) the certificate PEM files. (Default: `'./certificate'`)  
    * `generateOptions` \<Object\>: The options to generate a new certificate, if none is found. (See [`generateCACertificate([options])`](#certificatehelpergeneratecacertificateoptions))  
    * `certName` \<String\>: The name of the certificate PEM file. (Default: `'certificate.pem'`)  
    * `keyName` \<String\>: The name of the private key's PEM file. (Default: `'key.pem'`)  
    * `pubKeyName` \<String\>: The name of the public key's PEM file. (Default: `'pubkey.pem'`)  

Returns: \<Object\> (See [`generateCACertificate([options])`](#certificatehelpergeneratecacertificateoptions))  
  
This will try to locate the files specified by `certName`, `keyName`, and `pubKeyName` at the specified folder, if they aren't found, it will generate a new certificate and save it there, this can be used to load your own certificates (that maybe are trusted, so you don't have to whitelist a self-signed one), but putting the relevant files in the folder.  
  
  
#### Example  
```  
const clientProxy = require('client-proxy-server'),  
      https = require('https');  
  
//async for a top-level await  
(async function() {  
    //create the cert  
    let cert = await clientProxy.certificateHelper.loadOrCreateCertificate();  
    let options = clientProxy.certificateHelper.getCertificateBuffers(cert.ca);  
    let server = https.createServer(options, (req, res) => {  
        res.end("Hello, World!");  
    });  
    server.listen();  
})();  
```  
  
### certificateHelper.quickGenerate([options])  
  
***WARNING: `async` function! Use `await` to get the return value!***  
  
Arguments:  
* `options` \<Object\>: (See [`generateCACertificate([options])`](#certificatehelpergeneratecacertificateoptions))  
  
* Returns: \<Object\>  
    * `certificate` \<Object\>: (See [`generateCACertificate([options])`](#certificatehelpergeneratecacertificateoptions))  
    * `buffers` \<Object\>: (See [`getCertificateBuffers(ca)`](#certificatehelpergetcertificatebuffersca))  
  
A simple wrapper for `generateCACertificate` and `getCertificateBuffers`, that automatically does them both for you  
  
#### Example  
```  
const clientProxy = require('client-proxy-server'),  
      https = require('https');  
  
//async for a top-level await  
(async function() {  
    //create the cert  
    let cert = await certificateHelper.quickGenerate();  
    let server = https.createServer(cert.buffers, (req, res) => {  
        res.end("Hello, World!");  
    });  
    server.listen();  
})();  
```  
  
### certificateHelper.quickLoad([options])  
  
***WARNING: `async` function! Use `await` to get the return value!***  
  
Arguments:  
* `options` \<Object\>: (See [`loadOrCreateCertificate([options])`](#certificatehelperloadorcreatecertificateoptions))  
  
* Returns: \<Object\>  
    * `certificate` \<Object\>: (See [`generateCACertificate([options])`](#certificatehelpergeneratecacertificateoptions))  
    * `buffers` \<Object\>: (See [`getCertificateBuffers(ca)`](#certificatehelpergetcertificatebuffersca))  
  
A simple wrapper for `loadOrCreateCertificate` and `getCertificateBuffers`, that automatically does them both for you, loading any pre-stored certificates or storing one if there is none  
  
  
#### Example  
```  
const clientProxy = require('client-proxy-server'),  
      https = require('https');  
  
//async for a top-level await  
(async function() {  
    //create the cert  
    let cert = await certificateHelper.quickLoad();  
    let server = https.createServer(cert.buffers, (req, res) => {  
        res.end("Hello, World!");  
    });  
    server.listen();  
})();  
```  
  
## Proxy Server  
  
This lets you create a proxy server that runs on your own PC! The proxy can intercept outgoing http/https requests that pass through it.  
  
It will also try resolve the full url and inject it into the request, so `req.url` would be 'http://localhost/abc', instead of '/abc', this is also the case for proxied urls, to turn 'example.com/' into 'https://example.com/'  
  
Some extra attributes have been added to the servers as well, it now has a `host` and `port` value, which is assigned when `server.listen()` is called, they default to 'localhost' and 443 respectively.  
You can also call `server.isChildUrl(url)` to check whether or not the url passed is a proxy request, or requesting a page on the server. e.g. If the server is listening on `localhost:8005`, `server.isChildUrl('https://localhost:8005/xyz')` returns true, but `server.isChildUrl('https://example.com/')` returns false.  
  
There are two types of servers: [raw servers](#raw-servers), and [rule servers](#rule-servers)  
  
### But first, some utils for the journey  
  
The module provides some useful stuff:  
  
* [`clientHttpProxy.certificateHelper`](#certificate-creation) (covered above)  
* `clientHttpProxy.fancyParser` (a parser that covers some stuff)  
    * `fancyParser.url` (basically the `node:url` module but with some injected methods)  
        * `fancyParser.url.fromIncomingRequest(req, [...<url.parse options>])` (`url.parse`, but it resolves the protocol, port, and host if none is specified, e.g. `/abc` gets parsed as `http://localhost:80/abc`)  
        * `fancyParser.url.format` (a better `url.format` that will exclude certain fields if they are irrelevant. i.e. `http://localhost:80/` becomes `http://localhost/`, but `http://localhost:81/` stays the same)  
* `clientHttpProxy.passThroughRequest(request, response)` (makes the passed `request` and `response` act as if they never hit the server in the first place)  
  
### Raw Servers  
  
A bit trickier to work with, a bit more flexible, and a bit faster than a [Rule Server](#rule-servers)  
  
Raw servers are created with the `clientHttpProxy.createRawServer` method, it takes the same arguments as `https.createServer`  
  
The listener will be passed requests, as if they were the server on the other end, they can either send a response or use `clientHttpProxy.passThroughRequest` to ignore it.  
  
#### Example  
  
```  
const clientHttpProxy = require('client-http-proxy'),  
      url = clientHttpProxy.fancyParser.url;  
  
//async for top-level await  
(async function() {  
    let cert = await clientHttpProxy.certificateHelper.quickLoad();  
    //create the server  
    let server = clientHttpProxy.createRawServer(cert.buffers, function(req, res) {  
        //if they're checking out the actual page, send back the method and url, e.g. GET http://localhost:8005/  
        if(server.isChildUrl(req.url)) {  
            res.end(req.method + ' ' + req.url)  
        }  
        //if they're checking out example.com, send back 'Hello World!'  
        else if(url.parse(req.url).hostname == 'example.com') {  
            res.end('Hello World!')  
        }  
        //if not, do nothing  
        else {  
            clientHttpProxy.passThroughRequest(req, res)  
        }  
    });  
  
    //start the server  
    server.listen(8005, () => {  
        //say the server is listening  
        console.log('Listening on ' + server.host + ':' + server.port)  
        //log the certificate fingerprint, in case you need to ignore any errors  
        console.log('Certificate fingerprint: ' + cert.certificate.fingerprint)  
    });  
})();  
```  
  
### Rule Servers  
  
These are simple to work with and create, and are highly modular, although they are slower than [Raw Servers](#raw-servers), because abstraction costs.  
  
Rule Servers function a bit like Raw Servers, although you don't have to do as complex of coding (not that it was really that complex anyways)  
  
A rule server is created through `clientHttpProxy.createServer(options[, listener])`, the `options` argument is the same as `https.createServer`'s `options` argument, but it also takes a `listener`, which is a normal http listener, for when your website is accessed like a normal website would be.  
  
They function through Rules, there are three 'predefined' rules, and two 'raw' rules, the raw rules can be extended in their own classes if you want, and should be used if you want to do something specific, the predefined rules are built-in and shouldn't be extended, as their functions cannot be easily influenced.  
  
Rules can be accessed through the `clientHttpProxy.rules` object, in their class forms, and can be instantated with either the `new` keyword, or their `.create` methods, both of which have the same arguments.  
  
Rules work via matches, which can be either:  
* A string, which is an exact url match, down to even the protocol (e.g. 'http://example.com/' will only match 'http://example.com/', nothing else)  
* A string with wildcards, which is similar, except there can be wildcard characters (e.g. '\*xample.com\*' will match 'http://example.com/', 'https://example.com/abc', 'https://axample.com/xyz', or even 'http://foo.bar/xample.com/')  
* A regex, if the url matches the regex, it will be handled by the rule  
* A function, both the url and the request are passed to the function, and if the function returns true, the url will be handled, (e.g. `(url, req) => { return req.headers.host == 'example.com' || url == 'http://foo.bar/'}`)  
  
They can be added by either:  
* Passing an array of matches to the constructor, as the last argument (e.g. `IgnoreRule.create(['http://example.com/*'])`)  
* The `Rule.addMatch` function, which is similar to adding the match to the end of the constructor array  
  
The three predefined rules are:  
* `IgnoreRule` \<Rule\>: `IgnoreRule.create([matches])` anything that matches this rule will be passed through without being proxied  
* `RedirectRule` \<Rule\>: `RedirectRule.create(interpreter[, matches])` any request that matches this rule will have its url passed to the interpreter, the user is redirected to the returned url  
* `RewriteRule` \<SkippableRule\>: `RewriteRule.create(interpreter[, matches])` any request that matches this rule will have its url passed to the interpreter, the page at the returned url is served to the user, but the user is not redirected  
  
The two raw rules are:  
* `RawRule` \<Rule\>: `RawRule.create(interpreter[, matches])` any request that matches this rule will have both its request and response objects passed to the interpreter, which can be acted upon like you're the webserver  
* `SkippableRule` \<Rule\> `SkippableRule.create(interpreter[, matches])` this behaves almost exacly like a `RawRule`, however, it has the functions `setCountsAsResponse` and `getCountsAsResponse`, alongside `setStopProcessing` and `getStopProcessing`, if countsAsResponse is set to false, it will default to passing through requests, so you only need to make changes to the properties of the request, such as headers and url. If stopProcessing is set to false, other rules will take place after it. They both default to true.  
  
#### Example  
  
```  
const clientProxy = require('client-http-proxy'),  
      rules = clientProxy.rules,  
      url = clientProxy.fancyParser.url;  
  
//async for top-level await  
(async function() {  
  
    //get certificate  
    let cert = await clientProxy.certificateHelper.quickLoad();  
  
    //make server  
    let server = clientProxy.createServer(cert.buffers);  
  
    //if you go to 'redirect.me.to', you get redirected to example.com  
    server.addRule(rules.RedirectRule.create('https://example.com/').addMatch(function(URL, req) {  
        return req.headers.host == 'redirect.me.to';  
    }));  
  
    //if you visit a url with rewrite.mo.ck in it, you'll get served the page from example.com, but you'll have the same url  
    server.addRule(rules.RewriteRule.create('https://example.com/').addMatch('*rewrite.mo.ck*'));  
  
    //listen on port 8005  
    server.listen(8005, () => {  
        //log where you're listening on  
        console.log(`Listening on ${server.host}:${server.port}`)  
        //log the certificate fingerprint  
        console.log("Fingerprint: " + cert.certificate.fingerprint)  
    });  
  
})();  
```  
  
### Okay, I've set it up, but how do I make it go?  
  
If you've set up a server and have it running, you're going to need a few things:  
1. The host and port the proxy server is running on  
2. The certificate fingerprint  
3. A browser that can connect to a proxy server, and ignore specific certificate errors  
  
For this example, we'll be using Google Chrome, on a Windows computer, the server is running at localhost, on port 8005  
1. Run the server, wait for it to load, make sure the certificate fingerprint has been printed out, and you know where the server is being hosted to  
2. Navigate to the browser's installation folder (Here, it's "C:\Program Files\Google\Chrome\Application")  
3. Open command prompt  
4. Run the program from the command line with arguments (Here, the program is at "C:\Program Files\Google\Chrome\Application\chrome.exe")  
   The arguments used here are:  
    * `--proxy-server="localhost:8005"`  
    * `--ignore-certificate-errors-spki-list=<certificate fingerprint here>`  
   The full command is: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --proxy-server="localhost:8005" --ignore-certificate-errors-spki-list=<certificate fingerprint here>`  
5. You should be connected to your proxy server now, if not, try closing chrome, and running the command without it open  
  
## And Remember: If you play stupid games, you get stupid prizes  
If you go around passing random values to functions, don't be surprised when things don't work correctly, if you go and try to pass null to something that was expecting a string, it's going to break