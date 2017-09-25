/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

var APP_ID = "*** CHANGE TO YOUR SKILL APP ID ***";
var SONOS_HOST = "*** CHANGE TO THE HOSTNAME AND PORT FOR YOUR INTERNET VISIBLE SERVER RUNNING node-sonos-http-api, eg: myserver.com:5005 ***";
var SONOS_USERNAME = "*** CHANGE TO YOUR NODE-SONOS-HTTP_API USERNAME ***";
var SONOS_PASSWORD = "*** CHANGE TO YOUR NODE-SONOS-HTTP_API PASSWORD ***";
var SONOS_URL = "http://" + SONOS_HOST + "/"
var AlexaSkill = require('./AlexaSkill');
var request = require('request');
var natural = require('natural');
var deasync = require('deasync');

// Set the headers
var headers = {
    'User-Agent': 'Alexa/0.0.1',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Authorization': "Basic " + new Buffer(SONOS_USERNAME + ":" + SONOS_PASSWORD).toString("base64")
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

var getPlayingCoordinator = function() {
    var options = {
      url: SONOS_URL + "zones",
      method: 'GET',
      headers: headers
            }

    var getBody = deasync(function(options, cb) {
      request(options, function (error, result, body) {
        if (error || result.statusCode != 200) { cb(error, null) }
        cb(null, body);
        });
    });

    try
    {
      var body = getBody(options);
      var zones = JSON.parse(body);  
      var coordinator = null;
      zones.forEach(function (zone) {
    var state = zone.coordinator.state.playbackState;
        if (state == "PLAYING") {
          coordinator = zone.coordinator;
        }
    });

      return coordinator;
    }
    catch (err) {
      return undefined;
    }
}

// Parse zones information
var getWhatsPlaying  = function() {
  
  var playing = { say: "nothing is currently playing" };
  var coordinator = getPlayingCoordinator();
  if (coordinator === undefined) {
    playing = { say: "unable to get zone information from Sonos" };
  } else if (coordinator != null) {
    var track = coordinator.state.currentTrack;
    var playing = {
      say: coordinator.roomName + " is playing " + track.title + " by " + track.artist + " at volume " + 
      coordinator.groupState.volume,
      title: track.title,
      artist: track.artist,
      room: coordinator.roomName,
      art: track.absoluteAlbumArtUri,
      station: track.stationName
    }
  }
  
    return playing;
} 

var doesDeviceSupportDisplay = function(context) {
  if (context && context.System && context.System.device && context.System.device.supportedInterfaces && context.System.device.supportedInterfaces.Display) {
    return true;
  } else {
    return false;
  }
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

var areSlotsAllFilledIn = function(slots) {
  var rc = true;

  if (slots) {
    for (var property in slots) {
      slot = slots[property];
      if (!slot.value || slot.value == "") {
        rc = false;
      } else if (slot.confirmationStatus && slot.confirmationStatus == "DENIED") {
        rc = false; 
      }
    }
  }

  return rc;
}


Sonos.prototype.eventHandlers.onDialog = function (intent, dialogState, session, response) {
  console.log("Sonos onDialog state: " + dialogState + " for intent " + intent.name);

  if (dialogState != "COMPLETED") {

    if (dialogState == "STARTED") {

      if (intent.slots && intent.slots.RoomName && !intent.slots.RoomName.value) {
        console.log("RoomName currently: " + JSON.stringify(intent.slots.RoomName));
        console.log("checking for default room based on whats playing");
        var playingCoordinator = getPlayingCoordinator();
        if (playingCoordinator) {
          console.log("setting default room to " + playingCoordinator.roomName);
          intent.slots.RoomName.value = playingCoordinator.roomName.toLowerCase();

          // This is what we should do but can't 
          // response.sendDirectives("Dialog.ConfirmSlot", "RoomName", intent);
          //return true;
        }
      }

      if (areSlotsAllFilledIn(intent.slots)) {  // Ignore complete dialogs with started state, stupid Amazon
        return false;
      }
    }

    response.sendDirectives("Dialog.Delegate");
    return true;

  } else {

    if (intent.confirmationStatus && intent.confirmationStatus == "DENIED") {
      response.ask("ok, anything else?", "");
      return true;
    }
    return false;
  }
}

Sonos.prototype.intentHandlers = {
    // register custom intent handlers
  PresetIntent: function (intent, session, context, response) {
    
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
  SleepTimerIntent: function (intent, session, context, response) {
    
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
  RoomVolUpIntent: function (intent, session, context, response) {
    
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
              response.ask(roomName.value + " volume is now " + state.volume, "");
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
  RoomVolDownIntent: function (intent, session, context, response) {
    
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
              response.ask(roomName.value + " volume is now " + state.volume, "");
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
  NextSongIntent: function (intent, session, context, response) {
    
    var roomName = intent.slots.RoomName;
    
    if (roomName && roomName.value) {
      
      var options = {
        url: SONOS_URL + roomName.value + "/next",
        method: 'GET',
        headers: headers
      }
      request(options, function (error, result, body) {
        if (!error && result.statusCode == 200) {
          response.ask("ok");
        } else {
          response.tell("Sorry, I can't skip songs right now");
        }          
      });
    } else {
      response.tell("Sorry, You must specify a valid room name");
    }
  },
  PauseIntent: function (intent, session, context, response) {
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
  ResumeIntent: function (intent, session, context, response) {
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
  WhatsPlayingIntent: function (intent, session, context, response) {
    var whatsPlaying = getWhatsPlaying();

    if (whatsPlaying.artist) {

      if (doesDeviceSupportDisplay(context)) {
        var directives = [{
          type: "Display.RenderTemplate",
          template: {
            type: "BodyTemplate2",
            token: "BR549",
            backButton: "VISIBLE",
            title: "Sonos",
            image: {
              contentDescription: "Album cover",
              sources: [{
                url: whatsPlaying.art
              }]
            },
            textContent: {
              primaryText: {
                type: "RichText",
                text: '<font size="7"><b>' + whatsPlaying.artist + "</b></font>"
              },
              secondaryText: {
                type: "RichText",
                text: '<font size="5">' + whatsPlaying.title + "</font>"
              },
              tertiaryText: {
                type: "RichText",
                text: "<br/><br/>" + whatsPlaying.room
              }
            }
          }
        }];

        response.askWithDirectives(whatsPlaying.say, "", directives);
      } else {
        response.ask(whatsPlaying.say, "");
        }
            } else {
      response.ask(whatsPlaying.say, "");
            }
    },
  HelpIntent: function (intent, session, context, response) {
        var helpMsg = "You can play presets, change volume and ask what's playing";
        response.ask(helpMsg, helpMsg);
    },
  GroupIntent: function (intent, session, context, response) {
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
  UngroupIntent: function (intent, session, context, response) {
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
  FavoriteIntent: function (intent, session, context, response) {
    
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
  VolumeIntent: function (intent, session, context, response) {
    
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
          response.ask(roomName.value + " volume set to " + volume.value, "");
                } else {
                    response.tell("Sorry, could not set volume");
                }
            });
        } else {
            response.tell("Sorry, You must specify a valid room and volume");
        }
    },
  StopIntent: function (intent, session, context, response) {
    response.tell("");
  },
  CancelIntent: function (intent, session, context, response) {
    response.tell("");
  },
  ThankYouIntent: function (intent, session, context, response) {
      var myArray = ['Your welcome', 'No problem', "My pleasure", "It was nothing", "Alexa out!", "prego"]; 
      var rand = myArray[Math.floor(Math.random() * myArray.length)];
      response.tell(rand);
  },
  ArtistIntent: function (intent, session, context, response) {
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
                  response.ask("Starting radio " + artistName.value + " in " + roomName.value, "");
              } else {
                  response.tell("Sorry, could not start artist " + artistName.value);
              }
          });
      } else {
          response.tell("Sorry, You must specify a valid artist name");
      }
  },
  StationIntent: function (intent, session, context, response) {
      var roomName = intent.slots.RoomName;
      var stationName = intent.slots.StationName;

      if (!(roomName && roomName.value)) {
          roomName = { value: "living room" };
      }

      if (stationName && stationName.value
          && roomName && roomName.value) {

          var options = {
              url: SONOS_URL + roomName.value + "/pandora/play/" + stationName.value,
              method: 'GET',
              headers: headers
  }

          // Start the request
          request(options, function (error, result, body) {
              if (!error && result.statusCode == 200) {
                  // Print out the response body
                  response.ask("Starting Pandora station " + stationName.value + " in " + roomName.value, "");
              } else {
                  response.tell("Sorry, could not start Pandora station " + stationName.value);
              }
          });
      } else {
          response.tell("Sorry, You must specify a valid Pandora station");
      }
  },
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the Sonos skill.
    var sonos = new Sonos();
    sonos.execute(event, context);
};