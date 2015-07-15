/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * For additional samples, visit the Alexa Skills Kit developer documentation at
 * https://developer.amazon.com/appsandservices/solutions/alexa/alexa-skills-kit/getting-started-guide
 */

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
var CLIENT_ID = "396680e2-fe30-4a8d-8eab-9bbed5b68907";
var CLIENT_SECRET = "840fa3db-91ff-436f-b476-ff7d969500a0";
var API_TOKEN = "5be2014a-1bf8-4339-978b-48ee223eef5f";
var API_HOST = "graph.api.smartthings.com";
var API_ENDPOINT = "/api/smartapps/installations/116b66db-226c-4f7e-90e7-14b751688b65";
var http = require('https');

exports.handler = function(event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);
        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.[unique-value-here]") {
             context.fail("Invalid Application ID");
         }
        */


        if (event.session.new) {
            onSessionStarted({
                requestId: event.request.requestId
            }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        }
        else if (event.request.type === "IntentRequest") {
            console.log("Called Lambda function with intent: "+event.request.intent.name);
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        }
        else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    }
    catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId + ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("ChangeThingStateIntent" === intentName) {
        setSTDeviceState(intent, session, callback);
    }
    else if ("ListMyDevicesIntent" === intentName) {
        getWelcomeResponse(callback);
    }
    else if ("HelloBridgetIntent" === intentName) {
        helloBridgetResponse(callback);
    }
    else if ("GetThingStateIntent" === intentName) {
        getDeviceStateResponse(intent, callback);
    }
    else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId + ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Discovered SmartThings Devices";
    var speechOutput = "";

    var optionsget = {
        host: API_HOST,
        path: API_ENDPOINT + '/getSwitches',
        method: 'GET',
        port: 443,
        headers: {
            'Authorization': 'Bearer ' + API_TOKEN
        }

    };
    var req = http.request(optionsget, function(response) {
        console.log(response.statusCode + ':- Instance state response code.');
        response.on('data', function(d) {
            speechOutput = "Available SmartThings devices that I can control are: ";
            JSON.parse(d.toString()).forEach(function(entry) {
                speechOutput += entry.name + ", ";
            });
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    });
    req.end();
    req.on('error', function(e) {
        console.error(e);
    });
    //console.log("Trying REST Endpoint request...");
    //http.get("https://graph.api.smartthings.com/api/smartapps/installations/0fbdeadf-2cc9-4cec-8310-251404d31358/getSwitches?access_token=5be2014a-1bf8-4339-978b-48ee223eef5f", function(res){console.log("Got response: "+res.statusCode);});

    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "";
    var shouldEndSession = true;

    //callback(sessionAttributes,
    //         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
function setSTDeviceState(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    speechOutput = "Once implemented, I will be able to control your SmartThings devices. This is a work in progress!";

    /*if (favoriteColorSlot) {
        favoriteColor = favoriteColorSlot.value;
        sessionAttributes = createFavoriteColorAttributes(favoriteColor);
        speechOutput = "I now know your favorite color is " + favoriteColor + ". You can ask me "
                + "your favorite color by saying, what's my favorite color?";
        repromptText = "You can ask me your favorite color by saying, what's my favorite color?";
    } else {
        speechOutput = "I'm not sure what your favorite color is, please try again";
        repromptText = "I'm not sure what your favorite color is, you can tell me your "
                + "favorite color by saying, my favorite color is red";
    }*/

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function helloBridgetResponse(callback) {
    var speechOutput = "Hello Bridget! How are you today?";
    var repromptText = "I'm glad to hear that!";
    var shouldEndSession = true;

    callback({}, buildSpeechletResponse("Greetings Bridget!", speechOutput, repromptText, shouldEndSession));
}

function getDeviceStateResponse(intent, callback) {
    var cardTitle = intent.name;
    var speechOutput = "";
    var sessionAttributes = {};
    var repromptText = "";
    var shouldEndSession = true;
    var intentDevice = intent.slots.Device.value;
    console.log("Getting state for: " + intent.slots.Device.value);
    console.log("Request URI: https://" + API_HOST + API_ENDPOINT + '/getState/' + encodeURIComponent(intentDevice));
    var optionsget = {
        host: API_HOST,
        path: API_ENDPOINT + '/getState/' + encodeURIComponent(intentDevice),
        method: 'GET',
        port: 443,
        headers: {
            'Authorization': 'Bearer ' + API_TOKEN
        }

    };
    var req = http.request(optionsget, function(response) {
        console.log(response.statusCode + ':- Instance state response code.');
        response.on('data', function(d) {
            var dev = JSON.parse(d.toString());
            console.log(dev);
            if (dev.state.length > 0) speechOutput += "Currently, " + dev.name + " is " + dev.state;
            else speechOutput += "Sorry, I couldn't find the device " + intentDevice + ".";
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    });
    req.end();
    req.on('error', function(e) {
        console.error(e);
        speechOutput = "Sorry, I couldn't find the device " + intentDevice + ".";
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
}

function getColorFromSession(intent, session, callback) {
    var cardTitle = intent.name;
    var favoriteColor;
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    if (session.attributes) {
        favoriteColor = session.attributes.favoriteColor;
    }

    if (favoriteColor) {
        speechOutput = "Your favorite color is " + favoriteColor + ", goodbye";
        shouldEndSession = true;
    }
    else {
        speechOutput = "I'm not sure what your favorite color is, you can say, my favorite color " + " is red";
    }

    // Setting repromptText to null signifies that we do not want to reprompt the user.
    // If the user does not respond or says something that is not understood, the session
    // will end.
    callback(sessionAttributes,
        buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}