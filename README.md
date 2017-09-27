# AlexaForSonos
Amazon Alexa voice layer on top of the amazing NodeJS component https://github.com/jishi/node-sonos-http-api.

## Details
This project represents the voice interaction layer for an Amazon Echo device to control your Sonos system through the node-sonos-http-api.  It requires the following things:
- An Alexa developer account and an AWS developer account.  If you dont know how to build an Alexa Hello World Skill I suggest you read this link https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit
- An Amazon Echo
- A machine capable of running node and accessible via the internet through your home network.  I use a RaspberyPi and setup a port on my router to forward traffic to node-sonos-http-api's default port of 5005.  I also use dyndns.com to give my home network a permanent host name.

Once you are all setup with devices and accounts please git clone this repo and follow these steps to get the node component running:
- Clone and setup node-sonos-http-api on your machine and ensure that its accessible via the internet by typing http://<your host name>:5005/zones.  Follow the directions at https://github.com/jishi/node-sonos-http-api.  Make sure to install the latest version on node.js on your machine from http://nodejs.org.  Also please read the section on settings.json carefully.  You will need to setup auth for the skill to work and ideally setup the Pandora and Spotify services as well.  Skip the https and securePort settings.
- If it worked you should see all your Sonos devices in the resulting XML.  If not I would read more of the node-sonos-http-api's README file.

Now setup the Alexa skill itself:
- Go to the Alexa dev site http://developer.amazon.com and create a new skill using the same Alexa account that your device is using.  You may need to create a new developer account for that account.  Create a new Alexa Skills Kit skill.
- Keep the defaults on the Skill Information tab except make sure its a Custom interaction model and select yes for Render template.  Also use whatever invocation name you want but I use "Sonos".
- Click Save then Next
- On the Interaction Model tab, Click on the Skill Builder Beta button and then the code editor.  Copy the contents of the InteractionModel.json file into the editor and then hit Save Model and build model.
- On the Configuration tab you will need to now set it up to use an AWS lambda function.
- Before you move on you need to now log into the AWS portal at http://aws.amazon.com and create a Lamba function.  Use your Amazon developer account.
- My code is in this project's src folder.  You will need to edit index.js to define the URL for your machine running node-sonos-http and define the Alexa Skill appid from your Alexa dev portal.  Also make sure to update the username and password from the settings.json file.
- Run npm install in the Alexa/src folder to get the node_module's copied down
- Next zip up the Alexa/src folder and upload it to the AWS portal.  don't include the src folder itself
- Lastly go back to the Alexa Portal's Configuration tab and udpate the Alexa Skill with the Lambda url for your new Lambda function.
- Go back to your node-sonos-http-api machine and copy my presets/presets.json file to the root directory of node-sonos-http-api.  Change the json to define your presets which allow you to group different Sonos devices and then define what Sonos favorite you want to play and at what volumes.  Its a very nice feature of node-sonos-http.  Remember to restart node-sonos-http-api after changing the file



Would love others to improve my documentation and help expand the vocabulary.


