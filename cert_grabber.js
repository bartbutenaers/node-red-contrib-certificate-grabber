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
        
        const node = this;
        
        node.on('input', function(msg) {
            var options = {
                host: msg.payload.host,
                port: msg.payload.port,
                checkServerIdentity: () => undefined,
                rejectUnauthorized: false
            }
                
            var tlsSocket = tls.connect(options, function () {
                // Get the certificate in DER format
                let certificate = tlsSocket.getPeerCertificate();
                
                msg.payload = {};
                msg.payload.subject = certificate.subject;
                msg.payload.issuer = certificate.issuer;
                msg.payload.subjectAlternativeName = certificate.subjectaltname;
                msg.payload.publicKey = certificate.pubkey;
                msg.payload.validFrom = certificate.valid_from;
                msg.payload.validTo = certificate.validTo;
                msg.payload.serialNumber = certificate.valid_to;
                msg.payload.derCertificate = certificate.raw;
                msg.payload.pemCertificate = certificate.raw;

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
               
                tlsSocket.destroy();
            })

            tlsSocket.setTimeout(1500);
            
            tlsSocket.once('timeout', () => {
                node.warn("Cannot get certificate due to timeout");
                tlsSocket.destroy;
            })

            tlsSocket.on('error', (error) => {
               node.error("Cannot get certificate due to error: " + error);
               // [ERR_TLS_CERT_ALTNAME_INVALID] Hostname/IP does not match certificate's altnames: Host: zdns.cn. is not in the cert's altnames: DNS:*.fkw.com, DNS:fkw.com
               // unable to verify the first certificate or UNABLE_TO_VERIFY_LEAF_SIGNATURE
            })
        });

        node.on('close', function() {
        });
    }
        
    RED.nodes.registerType('certificate-grabber', CertificateGrabberNode);
}
