const forge = require('node-forge'),
      path = require('path'),
      fs = require('fs'), 
      crypto = require('crypto');

const pki = forge.pki

//using a blank options is perfectly fine here
async function genCACert(options = {}) {
    options = {...{
        commonName: 'Client Proxy Testing CA - DO NOT TRUST',
        bits: 2048,
        SAN: []
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
    
    let extensions = [{ name: 'basicConstraints', cA: true }]
    
    if(options.SAN instanceof Array && options.SAN.length > 0) {
        let sanExtension = {name: 'subjectAltName', altNames: []}
        let SAN = options.SAN
        let altNames = sanExtension.altNames
        
        for(let name of SAN) {
            if(typeof(name) == 'string') {
                let type = 2
                //if is ip address
                let ipmatch = name.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}.\d{1,3}\b/)
                if(ipmatch != null) {
                    name = ipmatch[0]
                    type = 7
                }
                let extension = {type}
                switch(type) {
                    case 7:
                        extension.ip = name;
                        break;
                    default: 
                        extension.value = name;
                        break;
                }
                altNames.push(extension)
            }
        }
        
        extensions.push(sanExtension)
    }
    
    cert.setSubject([{name: 'commonName', value: options.commonName}])
    cert.setExtensions(extensions)
    
    cert.setIssuer(cert.subject.attributes)
    cert.sign(keyPair.privateKey, forge.md.sha256.create())
    
    return {
        ca: {
            key: pki.privateKeyToPem(keyPair.privateKey),
            cert: pki.certificateToPem(cert)
        },
        fingerprint: getFingerprint(keyPair.publicKey),
        publicKey: pki.publicKeyToPem(keyPair.publicKey)
    }
}

function getFingerprint(publicKey) {
    return forge.util.encode64(
        pki.getPublicKeyFingerprint(publicKey, {
            type: 'SubjectPublicKeyInfo',
            md: forge.md.sha256.create(),
            encoding: 'binary'
        })
    );
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

async function loadOrCreateCertificate(options={}) {
    let dir = path.dirname(require.main.filename)
    options = {...{
        folder: './certificate',
        generateOptions: {},
        certName: 'certificate.pem',
        keyName: 'key.pem',
        pubKeyName: 'pubkey.pem'
    }, ...options}
    
    let folder = path.resolve(dir, options.folder)
    let certpath = path.join(folder, options.certName)
    let keypath = path.join(folder, options.keyName)
    let pubkeypath = path.join(folder, options.pubKeyName)
    
    if(fs.existsSync(certpath) && fs.existsSync(keypath) && fs.existsSync(pubkeypath)) {
        let cert = fs.readFileSync(certpath, {encoding: 'UTF-8'}).toString('UTF-8')
        let key = fs.readFileSync(keypath, {encoding: 'UTF-8'}).toString('UTF-8')
        let pubkey = fs.readFileSync(pubkeypath, {encoding: 'UTF-8'}).toString('UTF-8')
        return {
            ca: {
                key: key,
                cert: cert
            },
            fingerprint: getFingerprint(pki.publicKeyFromPem(pubkey)),
            publicKey: pubkey
        }
    } else {
        let cert = await genCACert(options.generateOptions)
        try {
            if(!fs.existsSync(folder)) {
                fs.mkdirSync(folder)
            }
            fs.accessSync(folder)
            !fs.existsSync(certpath) || fs.accessSync(certpath)
            !fs.existsSync(keypath) || fs.accessSync(keypath)
            !fs.existsSync(pubkeypath) || fs.accessSync(pubkeypath)
            fs.writeFileSync(certpath, cert.ca.cert)
            fs.writeFileSync(keypath, cert.ca.key)
            fs.writeFileSync(pubkeypath, cert.publicKey)
        } catch(e) {
            console.log('An error occurred while trying to save the certificates! Do you have write permissions?')
        }
        return cert
    }
}

module.exports = {genCACert, caToBuffer, loadOrCreateCertificate}