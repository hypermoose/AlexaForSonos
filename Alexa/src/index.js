/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

var APP_ID = "*** CHANGE TO YOUR SKILL APP ID ***";
var SONOS_URL = "*** CHANGE TO THE FULL URL FOR YOUR INTERNET VISIBLE SERVER RUNNING node-sonos-http-api***";
var AlexaSkill = require('./AlexaSkill');
var request = require('request');
 
// Set the headers
var headers = {
    'User-Agent':       'Alexa/0.0.1',
    'Content-Type':     'application/x-www-form-urlencoded'
}

/**
 * Sonos is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var Sonos = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
Sonos.prototype = Object.create(AlexaSkill.prototype);
Sonos.prototype.constructor = Sonos;

Sonos.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("Sonos onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

Sonos.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("Sonos onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = "Sonos active";
    var repromptText = "";
    response.ask(speechOutput, repromptText);
};

Sonos.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("Sonos onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

Sonos.prototype.intentHandlers = {
    // register custom intent handlers
    PresetIntent: function (intent, session, response) {
        
        var presetName = intent.slots.PresetName;
        
        if (presetName && presetName.value) {  
            
            var options = {
                url: SONOS_URL + "preset/" + presetName.value,
                method: 'GET',
                headers: headers
            }
            
            console.log("Sending request " + options.url);
            // Start the request
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    // Print out the response body
                    response.ask("Starting preset " + presetName.value, "");
                } else {
                    response.tell("Sorry, could not start preset " + presetName.value);
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid preset name");
        }
    },
    SleepTimerIntent: function (intent, session, response) {
        
        var timerLength = intent.slots.TimerLength;
        
        if (timerLength && timerLength.value) {
            
            var asSeconds = parseInt(timerLength.value, 10) * 60 * 60;
            
            var options = {
                url: SONOS_URL + "sleep/" + asSeconds.toString(),
                method: 'GET',
                headers: headers
            }
            
            console.log("Sending request " + options.url);
            // Start the request
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    // Print out the response body
                    response.tell("timer set");
                } else {
                    response.tell("Sorry, could not start timer");
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid timer length in hours");
        }
    },
    RoomVolUpIntent: function (intent, session, response) {
        
        var roomName = intent.slots.RoomName;
        
        if (roomName && roomName.value) {
            
            var options = {
                url: SONOS_URL + roomName.value + "/volume/+5",
                method: 'GET',
                headers: headers
            }
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    response.ask("","");
                } else {
                    response.tell("Sorry, could not increase the volume");
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid room name");
        }
    },
    RoomVolDownIntent: function (intent, session, response) {
        
        var roomName = intent.slots.RoomName;
        
        if (roomName && roomName.value) {
            
            var options = {
                url: SONOS_URL + roomName.value + "/volume/-5",
                method: 'GET',
                headers: headers
            }
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    response.ask("","");
                } else {
                    response.tell("Sorry, could not decrease the volume");
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid room name");
        }
    },
    PauseIntent: function (intent, session, response) {
        var options = {
            url: SONOS_URL + "pauseall",
            method: 'GET',
            headers: headers
        }
        request(options, function (error, result, body) {
            if (!error && result.statusCode == 200) {
                response.ask("", "");
            } else {
                response.tell("Sorry, could not pause");
            }
        });
    },
    ResumeIntent: function (intent, session, response) {
        var options = {
            url: SONOS_URL + "resumeall",
            method: 'GET',
            headers: headers
        }
        request(options, function (error, result, body) {
            if (!error && result.statusCode == 200) {
                response.tell("");
            } else {
                response.tell("Sorry, could not resume");
            }
        });
    },
    HelpIntent: function (intent, session, response) {
        response.ask("You can say play preset followed by the preset name", 
            "You can say play preset followed by the preset name");
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the Sonos skill.
    var sonos = new Sonos();
    sonos.execute(event, context);
};