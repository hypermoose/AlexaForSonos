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
var natural = require('natural');

// Set the headers
var headers = {
    'User-Agent': 'Alexa/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
}

// Find closest match
var findClosestStringMatch = function (str, possibles) {
  var match = null;
  var best = 0;
  
  possibles.every(function (possible) {
    var d = natural.JaroWinklerDistance(str, possible);
    if (d > best) {
      best = d;
      match = possible;
    }
    return best != 1;
  });
  
  return match;
};

// Parse zones information
var parseZones = function(zones) {
  
    var rooms = [];
    var playing = "nothing is currently playing";
  
    zones.forEach(function (zone) {
        var name = zone.coordinator.roomName;
        rooms.push(name);
    
    var members = zone.members; 
        members.forEach(function (member) {
            if (rooms.indexOf(member.roomName) == -1) {
        rooms.push(member.roomName); 
            }
        });
    var state = zone.coordinator.state.playbackState;
        if (state == "PLAYING") {
            var track = zone.coordinator.state.currentTrack;
      playing = name + " is playing " + track.title + " by " + track.artist + " at volume " + 
              zone.coordinator.groupState.volume;
        }
    });
  
    return playing;
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
      
      // Grab the presets
      var options = {
        url: SONOS_URL + "preset",
        method: 'GET',
        headers: headers
      }
      
      request(options, function (error, result, body) {
        if (!error && result.statusCode == 200) {
          var validPresets = JSON.parse(body);
          var match = findClosestStringMatch(presetName.value, validPresets);
          if (match) {
            var options = {
              url: SONOS_URL + "preset/" + match,
                method: 'GET',
                headers: headers
            }
            
            // Start the request
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    // Print out the response body
                response.ask("Starting preset " + match + " because you said " + presetName.value, "");
                } else {
                response.tell("Sorry, could not start preset " + match);
              }
            });
          } else {
            response.ask("Sorry could not find a preset called " + presetName.value);
          }
        } else {
          response.tell("Sorry, could not get the list of presets from Sonos");
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid preset name");
        }
    },
    SleepTimerIntent: function (intent, session, response) {
    
        var timerLength = intent.slots.TimerLength;
        var roomName = intent.slots.RoomName;
    
        if (timerLength && timerLength.value &&
          roomName && roomName.value) {
      
            var asSeconds = parseInt(timerLength.value, 10) * 60 * 60;
      
            var options = {
                url: SONOS_URL + roomName.value + "/sleep/" + asSeconds.toString(),
                method: 'GET',
                headers: headers
            }
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    response.ask("timer set to " + timerLength.value, "");
                } else {
                    response.tell("Sorry, could not start timer");
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid room and timer length in hours");
        }
    },
    RoomVolUpIntent: function (intent, session, response) {
    
        var roomName = intent.slots.RoomName;
    
        if (roomName && roomName.value) {
      
            var options = {
                url: SONOS_URL + roomName.value + "/volume/+10",
                method: 'GET',
                headers: headers
            }
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    var options = {
                        url: SONOS_URL + roomName.value + "/state",
                        method: 'GET',
                        headers: headers
                    }
                    request(options, function (error, result, body) {
                        if (!error && result.statusCode == 200) {
                            var state = JSON.parse(body);
                            response.ask("Volume is now " + state.volume, "");
                        } else {
                            response.tell("Sorry, could not increase the volume");
                        }
          });          
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
                url: SONOS_URL + roomName.value + "/volume/-10",
                method: 'GET',
                headers: headers
            }
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    var options = {
                        url: SONOS_URL + roomName.value + "/state",
                        method: 'GET',
                        headers: headers
                    }
                    request(options, function (error, result, body) {
                        if (!error && result.statusCode == 200) {
                            var state = JSON.parse(body);
                            response.ask("Volume is now " + state.volume, "");
                        } else {
                            response.tell("Sorry, could not decrease the volume");
                        }
          });          
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
                response.ask("Paused", "");
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
                response.ask("Resuming", "");
            } else {
                response.tell("Sorry, could not resume");
            }
        });
    },
    WhatsPlayingIntent: function (intent, session, response) {
        var options = {
            url: SONOS_URL + "zones",
            method: 'GET',
            headers: headers
        }
        request(options, function (error, result, body) {
      if (!error && result.statusCode == 200) {       
        var status = parseZones(JSON.parse(body));  
                response.ask(status, "");
            } else {
                response.tell("Sorry, could not get Sonos zones information");
            }
        });
    },
    HelpIntent: function (intent, session, response) {
        var helpMsg = "You can play presets, change volume and ask what's playing";
        response.ask(helpMsg, helpMsg);
    },
    GroupIntent: function (intent, session, response) {
        var roomName = intent.slots.RoomName;
        var groupRoomName = intent.slots.GroupRoomName;
    
        if (roomName && roomName.value &&
          groupRoomName && groupRoomName.value) {
      
            var options = {
                url: SONOS_URL + groupRoomName.value + "/add/" + roomName.value,
                method: 'GET',
                headers: headers
            }
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    response.ask(roomName.value + " added to " + groupRoomName.value, "");
                } else {
                    response.tell("Sorry, could not add " + roomName.value + " to group " + groupRoomName.value);
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid room name and group room name");
        }
    },
    UngroupIntent: function (intent, session, response) {
        var roomName = intent.slots.RoomName;
    
        if (roomName && roomName.value) {
      
            var options = {
                url: SONOS_URL + roomName.value + "/leave/",
                method: 'GET',
                headers: headers
            }
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    response.ask(roomName.value + " ungrouped", "");
                } else {
                    response.tell("Sorry, could not ungroup " + roomName.value);
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid room name");
        }
    },
    FavoriteIntent: function (intent, session, response) {
    
        var roomName = intent.slots.RoomName;
        var favoriteName = intent.slots.FavoriteName;
    
    if (!(roomName && roomName.value)) {
      roomName = { value: "living room" };
    }
    
        if (favoriteName && favoriteName.value
          && roomName && roomName.value) {
      
            // Grab the favorites
            var options = {
                url: SONOS_URL + "favorites",
                method: 'GET',
                headers: headers
            }
      
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    var validFavorites = JSON.parse(body);
                    var match = findClosestStringMatch(favoriteName.value, validFavorites);
                    if (match) {
                        var options = {
                            url: SONOS_URL + roomName.value + "/favorite/" + match,
                            method: 'GET',
                            headers: headers
                        }
            
                        // Start the request
                        request(options, function (error, result, body) {
                            if (!error && result.statusCode == 200) {
                                // Print out the response body
                                response.ask("Starting favorite " + match + " because you said " + favoriteName.value, "");
                            } else {
                                response.tell("Sorry, could not start favorite " + match);
                            }
                        });
                    } else {
                        response.ask("Sorry could not find a favorite called " + favoriteName.value);
                    }
                } else {
                    response.tell("Sorry, could not get the list of favorites from Sonos");
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid favorite name");
        }
    },
    VolumeIntent: function (intent, session, response) {
    
        var volume = intent.slots.Volume;
        var roomName = intent.slots.RoomName;
    
        if (volume && volume.value &&
          roomName && roomName.value) {
      
            var options = {
                url: SONOS_URL + roomName.value + "/volume/" + volume.value,
                method: 'GET',
                headers: headers
            }
      
            // Start the request
            request(options, function (error, result, body) {
                if (!error && result.statusCode == 200) {
                    response.ask("volume set to " + volume.value, "");
                } else {
                    response.tell("Sorry, could not set volume");
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid room and volume");
        }
    },
  StopIntent: function (intent, session, response) {
    response.tell("");
  },
  CancelIntent: function (intent, session, response) {
    response.tell("");
  },
  ThanksIntent: function (intent, session, response) {
      var myArray = ['Your welcome', 'No problem', 'Sure', "My pleasure", "It was nothing", "my pleasure", "It was nothing", "Alexa out!", "il vostro benvenuto"]; 
      var rand = myArray[Math.floor(Math.random() * myArray.length)];
      response.tell(rand);
  },
  ArtistIntent: function (intent, session, response) {

      var roomName = intent.slots.RoomName;
      var artistName = intent.slots.ArtistName;

      if (!(roomName && roomName.value)) {
          roomName = { value: "living room" };
      }

      if (artistName && artistName.value
          && roomName && roomName.value) {

          var options = {
              url: SONOS_URL + roomName.value + "/musicsearch/spotify/station/" + artistName.value,
              method: 'GET',
              headers: headers
          }

          // Start the request
          request(options, function (error, result, body) {
              if (!error && result.statusCode == 200) {
                  // Print out the response body
                  response.ask("Starting radio " + artistName.value, "");
              } else {
                  response.tell("Sorry, could not start artist " + artistName.value);
              }
          });
      } else {
          response.tell("Sorry, You must specify a valid artist name");
      }
  }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the Sonos skill.
    var sonos = new Sonos();
    sonos.execute(event, context);
};