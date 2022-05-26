# client-http-proxy
A client-side http proxy for nodejs!
## But what does it do?
This functions as a http proxy that runs on your local machine, it was originally inspired by mockttp, which I ran into some issues with when I was using, so I decided to make my own

It doesn't have quite as many features (yet), but its main ones are:

## Certificate creation
This has in-built ssl certificate creation, using `certificateHelper`!
`certificateHelper` has some built-in functions for you to use:
```
certificateHelper.generateCACertificate() (with alias generateCACertificate.genCACert())
certificateHelper.getCertificateBuffers() (with alias generateCACertificate.caToBuffer())
certificateHelper.loadOrCreateCertificate()
certificateHelper.quickGenerate()
certificateHelper.quickLoad()
```
### certificateHelper.generateCACertificate([options])

***WARNING: `async` function! Use `await` to get the return value!***

Arguments:
* `options` \<Object\>  
    * `commonName` \<string\>: the name of the certificate. (Default: `"Client Proxy Testing CA - DO NOT TRUST"`)
    * `bits` \<int\>: the number of bits in the certificate. (Default: `2048`)  
Returns: \<Object\>  
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
Returns: \<Object\>
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
    * `generateOptions` \<Object\>: The options to generate a new certificate, if none is found. (See `generateCACertificate([options])`)
    * `certName` \<String\>: The name of the certificate PEM file. (Default: `'certificate.pem'`)
    * `keyName` \<String\>: The name of the private key's PEM file. (Default: `'key.pem'`)
    * `pubKeyName` \<String\>: The name of the public key's PEM file. (Default: `'pubkey.pem'`)
Returns: \<Object\> (See `generateCACertificate([options])`)

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
* `options` \<Object\>: (See `generateCACertificate([options])`)

Returns: \<Object\>
    * `certificate` \<Object\>: (See `generateCACertificate([options])`)
    * `buffers` \<Object\>: (See `getCertificateBuffers(ca)`)

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
* `options` \<Object\>: (See `loadOrCreateCertificate([options])`)

Returns: \<Object\>
    * `certificate` \<Object\>: (See `generateCACertificate([options])`)
    * `buffers` \<Object\>: (See `getCertificateBuffers(ca)`)

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

There are two types of servers: raw servers, and rule servers

### But first, some utils for the journey

The module provides some useful stuff:



### Raw Servers

### Rule Servers

## And Remember: If you play stupid games, you get stupid prizes
If you go around passing random values to functions, don't be surprised when things don't work correctly, if you go and try to pass null to something that was expecting a string, it's going to break