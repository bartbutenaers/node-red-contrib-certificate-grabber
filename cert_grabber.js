/**
 * Copyright 2022 Bart Butenaers
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
 module.exports = function (RED) {
    const tls = require('tls');

    function CertificateGrabberNode(config) {
        RED.nodes.createNode(this, config);
        // When the following options are undefined, assume that they are being passed via the payload
        // (for backwards compatibility with nodes before 1.0.2)
        this.host = config.host || 'payload.host';
        this.port = config.port || 'payload.port';
        this.hostType = config.hostType || 'msg';
        this.portType = config.portType || 'msg';
        
        this.timeout = config.timeout;
        
        const node = this;
        
        node.on('input', function(msg) {
            if(node.tlsSocket) {
                node.warn("The previous connection is still active", msg);
                return;
            }

            let host;

            if(node.hostType == 'msg') {
                host =  RED.util.getMessageProperty(msg, node.host);
            }
            else { // 'str'
                host = node.host
            }

            if(host == undefined) {
                node.warn("A hostname (or IP address) is required");
                return;
            }

            let port;

            if(node.portType == 'msg') {
                port =  RED.util.getMessageProperty(msg, node.port);
            }
            else { // 'str'
                port = node.port
            }

            port = parseInt(port); // Returns NaN if not a number

            if(!port == undefined) {
                node.warn("A port number is required", msg);
                return;
            }

            if(isNaN(port) || parseInt(port) < 1 || parseInt(port) > 65535) {
                node.warn("The port should be an integer number between 1 and 65535", msg);
                return;
            }

            var options = {
                host: host,
                port: parseInt(port),
                // Pass SNI hostname to the server to avoid "unrecognized name" response
                servername: host,
                checkServerIdentity: () => undefined,
                rejectUnauthorized: false
            }

            try {
                node.tlsSocket = tls.connect(options, function () {
                    // Get the certificate in DER format
                    let certificate = node.tlsSocket.getPeerCertificate();
                    
                    msg.payload = {};
                    msg.payload.subject = certificate.subject;
                    msg.payload.issuer = certificate.issuer;
                    msg.payload.subjectAlternativeName = certificate.subjectaltname;
                    msg.payload.publicKey = certificate.pubkey;
                    msg.payload.validFrom = certificate.valid_from;
                    msg.payload.validTo = certificate.valid_to;
                    msg.payload.serialNumber = certificate.serialNumber;
                    msg.payload.derCertificate = certificate.raw;

                    // Convert the raw certificate (in DER format) to PEM format (see https://stackoverflow.com/a/48309802)
                    let prefix = '-----BEGIN CERTIFICATE-----\n';
                    let postfix = '-----END CERTIFICATE-----';
                    msg.payload.pemCertificate = prefix + certificate.raw.toString('base64').match(/.{0,64}/g).join('\n') + postfix;
                    
                    msg.payload.validToTimestamp = new Date(certificate.valid_to).getTime();
                    msg.payload.validFromTimestamp = new Date(certificate.valid_from).getTime();
                    
                    let now = new Date().getTime();
                    let daysRemaining = Math.round((msg.payload.validToTimestamp - now) / 8.64e7);

                    msg.payload.daysRemaining = Math.max(0, daysRemaining);
                    msg.payload.daysOverdue = Math.max(0, -daysRemaining);

                    node.send(msg);
                   
                    node.tlsSocket.destroy();
                    node.tlsSocket = null;
                })
            }
            catch(err) {
                node.error("Cannot connect: " + err, msg);
                node.tlsSocket.destroy;
                node.tlsSocket = null;
                return;
            }

            if(node.timeout > 0) {
                node.tlsSocket.setTimeout(node.timeout * 1000);
            }
            
            node.tlsSocket.once('timeout', () => {
                node.error("Cannot get certificate due to timeout", msg);
                if(node.tlsSocket) {
                    node.tlsSocket.destroy;
                    node.tlsSocket = null;
                }
            })

            node.tlsSocket.on('error', (error) => {
                node.error("Cannot get certificate due to error: " + error, msg);
                if(node.tlsSocket) {
                    // [ERR_TLS_CERT_ALTNAME_INVALID] Hostname/IP does not match certificate's altnames: Host: zdns.cn. is not in the cert's altnames: DNS:*.fkw.com, DNS:fkw.com
                    // unable to verify the first certificate or UNABLE_TO_VERIFY_LEAF_SIGNATURE
                    node.tlsSocket.destroy;
                    node.tlsSocket = null;
                }
            })
        });

        node.on('close', function() {
            if(node.tlsSocket) {
                node.tlsSocket.destroy;
                node.tlsSocket = null;
            }
        });
    }
        
    RED.nodes.registerType('certificate-grabber', CertificateGrabberNode);
}
