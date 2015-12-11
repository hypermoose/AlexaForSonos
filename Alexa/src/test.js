'use strict';

var Index = require('./Index');

var presetEvent = {
	session: {
		application: {
			applicationId: "Fake"
		}
	},
	request: {
		type: "IntentRequest",
		requestId: "Fake",
		intent: {
      name: "FavoriteIntent",
			slots: {
				RoomName: {
          value: "Office"
				},
        GroupRoomName: {
          value: "Living Room"
				},
				TimerLength: {
					value: "1"
				},
				Volume: {
          value: "18"
				},
				FavoriteName: {
          value: "John Williams"
				},
      }
		}
	}
};

var Context = function () {
};

Context.prototype.fail = function(e) {
	console.log("Fail: " + e);
}

Context.prototype.succeed = function(msg) {
  console.log("Output: " + msg.response.outputSpeech.text);
}


var context = new Context();
Index.handler(presetEvent, context);
