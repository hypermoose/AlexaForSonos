# AlexaForSonos
Amazon Alexa voice layer on top of the amazing NodeJS component https://github.com/jishi/node-sonos-http-api.

## Details
This project represents the voice interaction layer for an Amazon Echo device to control your Sonos system through the node-sonos-http-api.  It requires the following things:
- An Alexa developer account and an AWS developer account.  If you dont know how to build an Alexa Hello World Skill I suggest you read this link https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit
- An Amazon Echo
- A machine capable of running node and accessible via the internet through your home network.  I use a RaspberyPi and setup a port on my router to forward traffic to node-sonos-http-api's default port of 5005.  I also use dyndns.com to give my home network a permanent host name.

Once you are all setup with devices and accounts please clone this repo and follow these steps:
- Clone and setup node-sonos-http-api on your machine and ensure that its accessible via the internet by typing http://<your host name>:5005/zones.  If it worked you should see all your Sonos devices in the resulting XML.  If not I would read more of the node-sonos-http-api's README file.
- Go to the Alexa dev site and create a new skill.  Use the files in the Alexa\speechAssets subdirectory to populate the appropriate fields in the web ui.  Use whatever invocation name you want but I use "Sonos".
- Create custom slot types called ROOMS and PRESETS.  Change the values in those slots to be the names of your Sonos devices and the PRESET names to be whatever presets you want to setup.
- Go back to your node-sonos-http-api machine and copy my presets/presets.json file to the root directory of node-sonos-http-api.  Change the json to define your presets which allow you to group different Sonos devices and then define what Sonos favorite you want to play and at what volumes.  Its a very nice feature of node-sonos-http.  Remember to restart node-sonos-http-api after changing the file
- Before you save your Alexa Skill you need to now log into the AWS portal and create a Lamba function.
- My code is in the src folder.  You will need to edit index.js to define the URL for node-sonos-http and define the Alexa Skill appid from your Alexa dev portal.
- Run npm install in the Alexa/src folder to get the request node_module copied down
- Next zip up the Alexa/src folder and upload it to the AWS portal.  don't include the src folder itself
- Lastly, udpate the Alexa Skill with the Lambda url for your new Lambda function.

PHEW, alot of work but what you should get is Alexa support for Sonos to do the following things:
- Play presets
- Turn the volume up or down by resume.
- Pause/Resume playback
- Set a sleep timer in # of hours

Would love others to improve my documentation and help expand the vocabulary.


