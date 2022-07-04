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

### Example flow
The following example flow shows how to capture the certificate being used to secure your Node-RED installation (in case you have setup https):

![example flow](https://user-images.githubusercontent.com/14224149/173449679-8c1a0256-15dd-48c1-a3ae-cfbbed3bf865.png)
```
[{"id":"a4e22d4eae3350e1","type":"debug","z":"fbee74db83781e91","name":"Certificate info","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":760,"y":320,"wires":[]},{"id":"56706c9888b2a2b2","type":"inject","z":"fbee74db83781e91","name":"Inject host & port","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"host\":\"localhost\",\"port\":1880}","payloadType":"json","x":340,"y":320,"wires":[["fc71b92b91dae266"]]},{"id":"fc71b92b91dae266","type":"certificate-grabber","z":"fbee74db83781e91","timeout":"10","name":"","x":550,"y":320,"wires":[["a4e22d4eae3350e1"]]}]
```
It works like this:
1. Inject a message containing 'localhost' and port 1880.

2. The certificate grabber node wil open a TLS/SSL connection to port 1880 on localhost (where in my case Node-RED is running on https).

3. During the SSL handshake phase, the (Node-RED) server will share its public certificate with this node (that acts as a client).

4. This node will send an output message, containing certificate information in the payload.

### Output message
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

### Certificate monitoring
The *daysRemaining* field could be used for example to monitor how long your Node-RED SSL certificate is still valid:

![image](https://user-images.githubusercontent.com/14224149/175152283-cad01bf6-0ffb-4943-a445-3b5c8f868604.png)
```
[{"id":"8303ddce608f147b","type":"inject","z":"fbee74db83781e91","name":"Inject host & port","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"host\":\"localhost\",\"port\":1880}","payloadType":"json","x":280,"y":660,"wires":[["350385c35652f4e0"]]},{"id":"350385c35652f4e0","type":"certificate-grabber","z":"fbee74db83781e91","name":"","timeout":"10","x":490,"y":660,"wires":[["b0898b0e167c4b34"]]},{"id":"b0898b0e167c4b34","type":"switch","z":"fbee74db83781e91","name":"daysRemaining","property":"payload.daysRemaining","propertyType":"msg","rules":[{"t":"btwn","v":"1","vt":"num","v2":"5","v2t":"num"},{"t":"lte","v":"0","vt":"num"}],"checkall":"true","repair":false,"outputs":2,"x":700,"y":660,"wires":[["6ed1024f399f7030"],["d4fba32162b7af7e"]],"outputLabels":["going to expire","expired"]},{"id":"6ed1024f399f7030","type":"debug","z":"fbee74db83781e91","name":"Warning","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":900,"y":640,"wires":[]},{"id":"d4fba32162b7af7e","type":"debug","z":"fbee74db83781e91","name":"Problem","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":900,"y":680,"wires":[]}]
```
This flow checks the `msg.payload.daysRemaining` property: a value between 1 and 5 days will result in a warning, and a value below 0 will result in an error.  That way you have a couple of days time to make sure to order a new certificate from your CA.

### Store certificate to file
When you want to store the grabbed certificate into a file (as PEM format), that can implemented very easily using a File-Out node:

![image](https://user-images.githubusercontent.com/14224149/175068479-18ddb83b-32da-41f4-b20f-3af11b2022fd.png)
```
[{"id":"b328cde6ea2fff22","type":"inject","z":"fbee74db83781e91","name":"Inject host & port","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"host\":\"localhost\",\"port\":1880}","payloadType":"json","x":280,"y":500,"wires":[["3b663b3f52093e65"]]},{"id":"3b663b3f52093e65","type":"certificate-grabber","z":"fbee74db83781e91","name":"","timeout":"10","x":490,"y":500,"wires":[["b1c8e2e2a03a77a5"]]},{"id":"90d78e269b243a56","type":"file","z":"fbee74db83781e91","name":"","filename":"c:\\temp\\grabbedCert.crt","filenameType":"str","appendNewline":false,"createDir":false,"overwriteFile":"true","encoding":"none","x":970,"y":500,"wires":[[]]},{"id":"b1c8e2e2a03a77a5","type":"change","z":"fbee74db83781e91","name":"get PEM certificate","rules":[{"t":"set","p":"payload","pt":"msg","to":"payload.pemCertificate","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":710,"y":500,"wires":[["90d78e269b243a56"]]}]
```

## Node properties

### Timeout
After this timeout (in seconds) the node will stop trying to connect to the specified port on the specified host.  
