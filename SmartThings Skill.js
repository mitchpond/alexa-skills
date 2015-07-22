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
var DB_ARN = "arn:aws:dynamodb:us-east-1:138291740905:table/STBridgeUserData";
var http = require('https');
var aws = require('aws-sdk');
var crypto = require('crypto');
var db = new aws.DynamoDB();

exports.handler = function(event, context) {
    try {
        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.42d34e9a-b984-4e0d-a09d-419d4a7a85b9") {
            context.fail("Invalid Application ID");
        }

        //test encryption
        var cryptedToken = encryptString(API_TOKEN);

        var uid = event.session.user.userId ? event.session.user.userId : 'testUser'; //TODO: remove before publishing
        console.log('Looking up data for uid: ' + uid);
        db.getItem({
            "Key": {
                "UserID": {
                    "S": uid
                }
            },
            "TableName": "STBridgeUserData"
        }, function(err, data) {
            if (err) console.error(err);
            else {
                console.log(data);
                //console.log("Hash: " + crypto.createHash('md5').update(data).digest('hex'));
                onNewSession(event, context);
            }
        });
    }
    catch (e) {
        console.error(e);
    }
};

/**
 * Handle new session
 */
function onNewSession(event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

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
            console.log("Called Lambda function with intent: " + event.request.intent.name);
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
}

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
    listSTDevices(callback);
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
        listSTDevices(callback);
    }
    else if ("GetThingStateIntent" === intentName) {
        getDeviceState(intent, callback);
    }
    else if ("SetDimmerLevelIntent" === intentName) {
        setDimmerLevel(intent, session, callback);
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

function listSTDevices(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Discovered SmartThings Devices";
    var speechOutput = "";
    var repromptText = "";
    var shouldEndSession = true;

    var optionsget = {
        host: API_HOST,
        path: API_ENDPOINT + "/getSwitches",
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
}

/**
 * Issues the command to SmartThings to change the state of the requested device
 */
function setSTDeviceState(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    var intentDevice = intent.slots.Device.value;
    var intentState = intent.slots.State.value;

    console.log("Device: " + intentDevice);
    console.log("State : " + intentState);


    var optionsget = {
        host: API_HOST,
        path: API_ENDPOINT + "/switch/" + encodeURIComponent(intentDevice) + "/" + encodeURIComponent(intentState),
        method: 'GET',
        port: 443,
        headers: {
            'Authorization': 'Bearer ' + API_TOKEN
        }
    };

    var req = http.request(optionsget, function(response) {
        console.log('HTTPS request result: Code: ' + response.statusCode + ' Message: ' + response.statusMessage);
        response.on('data', function(d) {
            console.log(d);
            if (d) speechOutput = "Sent " + intentState + " command to " + intentDevice;
            else speechOutput = "Sorry, something went wrong when trying to set the state of " + intentDevice;
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
        response.on('error', function(e) {
            console.error('Returned error value (inner method): ' + e);
            speechOutput = "Sorry, I couldn't find the device " + intentDevice + ".";
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    });
    req.on('error', function(e) {
        console.error('Returned error value (outer method): ' + e);
        speechOutput = "Sorry, I couldn't find the device " + intentDevice + ".";
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
    req.end();
}

/**
 * Issues the command to SmartThings to change the state of the requested device
 */
function setDimmerLevel(intent, session, callback) {
    var cardTitle = intent.name;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = true;
    var speechOutput = "";

    var intentDevice = intent.slots.Device.value;
    var intentLevel = intent.slots.Level.value;

    console.log("Device: " + intentDevice);
    console.log("Level : " + intentLevel);


    var optionsget = {
        host: API_HOST,
        path: API_ENDPOINT + "/dimmer/" + encodeURIComponent(intentDevice) + "/" + encodeURIComponent(intentLevel),
        method: 'GET',
        port: 443,
        headers: {
            'Authorization': 'Bearer ' + API_TOKEN
        }
    };

    var req = http.request(optionsget, function(response) {
        console.log('HTTPS request result: Code: ' + response.statusCode + ' Message: ' + response.statusMessage);
        response.on('data', function(d) {
            console.log(d.toString());
            if (d) speechOutput = "Sent level " + intentLevel + " command to " + intentDevice;
            else speechOutput = "Sorry, something went wrong when trying to set the level of " + intentDevice;
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
        response.on('error', function(e) {
            console.error('Returned error value (inner method): ' + e);
            speechOutput = "Sorry, I couldn't find the device " + intentDevice + ".";
            callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    });
    req.on('error', function(e) {
        console.error('Returned error value (outer method): ' + e);
        speechOutput = "Sorry, I couldn't find the device " + intentDevice + ".";
        callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
    req.end();
}

function getDeviceState(intent, callback) {
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
            if (dev.state.length > 0) speechOutput = "Currently, " + dev.name + " is " + dev.state;
            else speechOutput = "Sorry, I couldn't find the device " + intentDevice + ".";
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

// =============================================================================

// Retrieve the user's API token and endpoint from the database
// Initiate OAuth process if this is a new user
function getUserCredentials(user, callback) {

}

function encryptString(string) {
    var cipher = crypto.createCipher('aes-256-cbc', CLIENT_SECRET);
    var result = cipher.update(string, 'utf8', 'hex');
    return result += cipher.final('hex');
}

function decryptString(string) {
    var decipher = crypto.createDecipher('aes-256-cbc', CLIENT_SECRET);
    var result = decipher.update(string, 'hex', 'utf8');
    return result += decipher.final('utf8');
}