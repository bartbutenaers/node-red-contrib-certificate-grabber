# node-red-contrib-certificate-grabber
A Node-RED node to capture certificates from TLS/SSL connections

## Install
Run the following npm command in your Node-RED user directory (typically ~/.node-red):
```
npm install node-red-contrib-certificate-grabber
```

## Support my Node-RED developments
Please buy my wife a coffee to keep her happy, while I am busy developing Node-RED stuff for you ...

<a href="https://www.buymeacoffee.com/bartbutenaers" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy my wife a coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

## Node usage
This node can be useful in troubleshooting TLS/SSL issues.  For example if you are not sure whether the certificate of your FTPS server is expired, so you simply want to have a look at it.

The following example flow shows how to capture the certificate being used to secure your Node-RED installation (in case you have setup https):

![example flow](https://user-images.githubusercontent.com/14224149/173449679-8c1a0256-15dd-48c1-a3ae-cfbbed3bf865.png)
```
[{"id":"a4e22d4eae3350e1","type":"debug","z":"fbee74db83781e91","name":"Certificate info","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":760,"y":320,"wires":[]},{"id":"56706c9888b2a2b2","type":"inject","z":"fbee74db83781e91","name":"Inject host & port","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"host\":\"localhost\",\"port\":1880}","payloadType":"json","x":340,"y":320,"wires":[["fc71b92b91dae266"]]},{"id":"fc71b92b91dae266","type":"certificate-grabber","z":"fbee74db83781e91","name":"","x":550,"y":320,"wires":[["a4e22d4eae3350e1"]]}]
```
It works like this:
1. Inject a message containing 'localhost' and port 1880.

2. The certificate grabber node wil open a TLS/SSL connection to port 1880 on localhost (where in my case Node-RED is running on https).

3. During the SSL handshake phase, the (Node-RED) server will share its public certificate with this node (that acts as a client).

4. This node will send an output message, containing certificate information in the payload.

## Output message
The `msg.payload` contains the following information about the certificate:
+ ***subject***:
   + ***C***: The country code of the organisation to which this certificate belongs. 
   + ***O***: The name of the organisation to which this certificate belongs.
   + ***CN***: The Common Name which is the hostname of the server to which this certificate belongs.
+ ***issuer***: The CA (certification authorithy) which signed the certificate (GlobalSign, VerySign, LetsEncrypt, ...), or it can be a self signed certificate (when it is not trusted by a CA).
+ ***subjectAlternativeName***: The SAN (Subject Alternative Name) can replace the CN, to specify multiple hostname to which this certificate belongs.  E.g. if multiple hosts have been setup (e.g. for load balancing), which all use the same certificate.
+ ***publicKey***: the public key contained in this certificate.
+ ***validFrom***: date from which the certificate is valid.
+ ***validTo***: date until which the certificate is valid.
+ ***serialNumber***: This unique number can be used e.g. to compare certificates.
+ ***derCertificate***: the X509 certificate as a raw NodeJs binary buffer (in DER format).
+ ***pemCertificate***: the X509 certificate in PEM formate.  This in fact the raw certificate now base64 encoded with some headers and footers:
   ```
   -----BEGIN CERTIFICATE-----
   <the raw certificate as base64 encoded string>
   -----BEGIN CERTIFICATE-----
   ```

Moreover the `msg.payload` contains some calculated fields for your convenience:
+ ***validFromTimestamp***: date until which the certificate is valid as a numeric timestamp.
+ ***validToTimestamp***: date from which the certificate is valid as a numeric timestamp.
+ ***daysRemaining***: the number of days that the certificate will still be valid.
+ ***daysOverdue***: the number of days that the certificate is already invalid
