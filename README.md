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
This node can be useful in following cases:
+ Troubleshooting TLS/SSL issues.  For example if you are not sure whether the certificate of your FTPS server is expired, so you simply want to have a look at it.
+ To monitor how long a certificate is still valid, or in how many days it will expire.

### Example flow
The following example flow shows how to capture the certificate being used to secure your Node-RED installation (in case you have setup https):

![example flow](https://user-images.githubusercontent.com/14224149/173449679-8c1a0256-15dd-48c1-a3ae-cfbbed3bf865.png)
```
[{"id":"dd032f207383a627","type":"debug","z":"fbee74db83781e91","name":"Certificate info","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":2260,"y":1540,"wires":[]},{"id":"e81159c3e99fb5f9","type":"inject","z":"fbee74db83781e91","name":"Inject host & port","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"host\":\"localhost\",\"port\":1880}","payloadType":"json","x":1840,"y":1540,"wires":[["f9e2aff0450f02ce"]]},{"id":"f9e2aff0450f02ce","type":"certificate-grabber","z":"fbee74db83781e91","name":"","host":"payload.host","hostType":"msg","port":"payload.port","portType":"msg","timeout":"10","x":2050,"y":1540,"wires":[["dd032f207383a627"]]}]
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
[{"id":"444baae6b6ddc0b7","type":"inject","z":"fbee74db83781e91","name":"Inject host & port","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"host\":\"localhost\",\"port\":1880}","payloadType":"json","x":600,"y":1620,"wires":[["b585a098132c8d9b"]]},{"id":"b585a098132c8d9b","type":"certificate-grabber","z":"fbee74db83781e91","name":"","host":"payload.host","hostType":"msg","port":"payload.port","portType":"msg","timeout":"10","x":810,"y":1620,"wires":[["28d9f5baa0619f96"]]},{"id":"28d9f5baa0619f96","type":"switch","z":"fbee74db83781e91","name":"daysRemaining","property":"payload.daysRemaining","propertyType":"msg","rules":[{"t":"btwn","v":"1","vt":"num","v2":"5","v2t":"num"},{"t":"lte","v":"0","vt":"num"}],"checkall":"true","repair":false,"outputs":2,"x":1020,"y":1620,"wires":[["7a4aefe0bdd4beac"],["ebfdce39f8c15bb7"]],"outputLabels":["going to expire","expired"]},{"id":"7a4aefe0bdd4beac","type":"debug","z":"fbee74db83781e91","name":"Warning","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":1220,"y":1600,"wires":[]},{"id":"ebfdce39f8c15bb7","type":"debug","z":"fbee74db83781e91","name":"Problem","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"payload","targetType":"msg","statusVal":"","statusType":"auto","x":1220,"y":1640,"wires":[]}]
```
This flow checks the `msg.payload.daysRemaining` property: a value between 1 and 5 days will result in a warning, and a value below 0 will result in an error.  That way you have a couple of days time to make sure to order a new certificate from your CA.

### Store certificate to file
When you want to store the grabbed certificate into a file (as PEM format), that can implemented very easily using a File-Out node:

![image](https://user-images.githubusercontent.com/14224149/175068479-18ddb83b-32da-41f4-b20f-3af11b2022fd.png)
```
[{"id":"c61fec9be9f3f9a9","type":"inject","z":"fbee74db83781e91","name":"Inject host & port","props":[{"p":"payload"},{"p":"topic","vt":"str"}],"repeat":"","crontab":"","once":false,"onceDelay":0.1,"topic":"","payload":"{\"host\":\"localhost\",\"port\":1880}","payloadType":"json","x":520,"y":1460,"wires":[["6bfc36319a9887bc"]]},{"id":"6bfc36319a9887bc","type":"certificate-grabber","z":"fbee74db83781e91","name":"","host":"payload.host","hostType":"msg","port":"payload.port","portType":"msg","timeout":"10","x":730,"y":1460,"wires":[["637dad61900e7213"]]},{"id":"5d0d2a6ae69d8c95","type":"file","z":"fbee74db83781e91","name":"","filename":"c:\\temp\\grabbedCert.crt","filenameType":"str","appendNewline":false,"createDir":false,"overwriteFile":"true","encoding":"none","x":1210,"y":1460,"wires":[[]]},{"id":"637dad61900e7213","type":"change","z":"fbee74db83781e91","name":"get PEM certificate","rules":[{"t":"set","p":"payload","pt":"msg","to":"payload.pemCertificate","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":950,"y":1460,"wires":[["5d0d2a6ae69d8c95"]]}]
```

## Node properties

### Host
The hostname or IP address to which this node should connect.  The hostname value can be specified in the config screen directly or via an input message field.

### Port
The port (of the specified host) to which this node should connect.  Because a single hostname can have multiple services running (each listening to separate ports), which might use different certificates.  The port value can be specified in the config screen directly or via an input message field.

### Timeout
After this timeout (in seconds) the node will stop trying to connect to the specified port on the specified host.  
