const forge = require('node-forge')
const crypto = require('crypto')
const pki = forge.pki

//using a blank options is perfectly fine here
async function genCACert(options = {}) {
    options = {...{
        commonName: 'Client Proxy Testing CA - DO NOT TRUST',
        bits: 2048
    }, ...options}
    
    let keyPair = await new Promise((res, rej) => {
        pki.rsa.generateKeyPair({ bits: options.bits }, (error, pair) => {
            if (error) rej(error);
            else res(pair)
        })
    })
    
    let cert = pki.createCertificate()
    cert.publicKey = keyPair.publicKey
    cert.serialNumber = crypto.randomUUID().replace(/-/g, '')
    
    cert.validity.notBefore = new Date()
    cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1)
    cert.validity.notAfter = new Date()
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
    
    cert.setSubject([{name: 'commonName', value: options.commonName}])
    cert.setExtensions([{ name: 'basicConstraints', cA: true }])
    
    cert.setIssuer(cert.subject.attributes)
    cert.sign(keyPair.privateKey, forge.md.sha256.create())
    
    return {
        ca: {
            key: pki.privateKeyToPem(keyPair.privateKey),
            cert: pki.certificateToPem(cert)
        },
        fingerprint: forge.util.encode64(
            pki.getPublicKeyFingerprint(keyPair.publicKey, {
                type: 'SubjectPublicKeyInfo',
                md: forge.md.sha256.create(),
                encoding: 'binary'
            })
        )
    }
}

//you need to put the output from genCACert() through this if you want to use it for a https server
/* e.g
let cert = genCACert()
let buffers = caToBuffer(cert.ca)
let options = {}
options.key = buffers.key
options.cert = buffers.cert
let server = https.createServer(options, <listener here>)
*/
function caToBuffer(ca) {
    return {
        key: Buffer.from(ca.key),
        cert: Buffer.from(ca.cert)
    }
}

module.exports = {genCACert, caToBuffer}