/**
 *  Echo Endpoint Server
 *
 *  Copyright 2015 Mitch Pond
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 *
 */
 
definition(
    name: "Echo Endpoint Server",
    namespace: "mitchpond",
    author: "Mitch Pond",
    description: "Exposes endpoints for use with Amazon Echo",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png",
    iconX3Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png",
    oauth: [displayName: "Echo Endpoint Server", displayLink: ""])


preferences {
	section ("Choose devices to use with Alexa...") {
        input "switches", "capability.switch", title: "Which switches?", multiple: true, required: false
        input "dimmers", "capability.switchLevel", title: "Which dimmers?", multiple: true, required: false
        input "contact", "capability.contactSensor", title: "Which contact sensors?", multiple: true, required: false
    }
    section ("Misc. Settings") {
        input "maxLevDist", "number", title: "Name matching threshold", description: "5"
    }
}

mappings {
    path("/getSwitches/:device")		{action: [GET: "getSwitchState"]}
    path("/switch/:device/:command")	{action: [GET: "setSwitchState"]}
    path("/getState/:device")			{action: [GET: "getDeviceState"]}
    path("/dimmer/:device/:level")		{action: [GET: "setDimmerLevel"]}
    path("/say")                        {action: [PUT: "doHelloHome"]}
    path("/devices")					{action: [GET: "listDevices"]}	
    path("/devices/getDevice")          {action: [PUT: "getDeviceState"]}
    path("/devices/updateDevice")       {action: [PUT: "updateDeviceState"]}
}

def installed() {
	log.debug "Installed with settings: ${settings}"

	initialize()
    
}

def updated() {
	log.debug "Updated with settings: ${settings}"

	unsubscribe()
	initialize()
}

def initialize() {
	// TODO: subscribe to attributes, devices, locations, etc.
} 

// TODO: implement event handlers

def listSwitches() {
	def response = []
    switches.each {
        response << [name: it.displayName, state: it.currentValue("switch")]
    }
    return response
}

def listDevices(){
    def response = []
    def allDevices = collectDevices();
    allDevices.each {
    	response << [name: it.label, state: [switch: it.switchState?.value, level: it.levelState?.value, contact: it.contactState?.value] ]
    }
    return response
}

def getSwitchState() {
	def device = switches.find({params.device.toLowerCase() == it.label.toLowerCase()})
    def response = []
    
    return [name: device.displayName, state:device.currentValue("switch") ]
}

def setSwitchState() {
	def device = switches.find({params.device.toLowerCase() == it.label.toLowerCase()}) ?: dimmers.find({params.device.toLowerCase() == it.label.toLowerCase()}) ?: null
    if (device) {
    	def cmd = params.command
    	(cmd == 'on') ? device?.on() : (cmd == 'off') ? device?.off() : [name: 'test', result: 'failure']
    	return [name: device.displayName, state:device.currentValue("switch") ]}
    else httpError(404, 'Device '+params.device+' not found')
}

def setDimmerLevel() {
	def device = dimmers.find({params.device.toLowerCase() == it.label.toLowerCase()})
    def level = Integer.parseInt(params.level)
    (level >= 0 && level <= 100) ? device?.setLevel(level) : [name: 'test', result: 'failure']
    return [name: device.displayName, state:device.currentValue("level") ]
}

def getDeviceState() {
	def deviceName = request.JSON?.device; //params.device
	def allDevices = collectDevices();
	
    def myDevice = allDevices.find({it?.label?.equalsIgnoreCase(deviceName.toLowerCase())})
    try {
	    def deviceState = []
        deviceState << myDevice.switchState 
        deviceState << (myDevice.levelState ? [value: "${myDevice.levelState.value}%"] : myDevice.levelState)
        deviceState << myDevice.contactState
        def result = []
        result += deviceState*.value
        return [name: myDevice.label, state: result]
    }
    catch(e){return}
}

def updateDeviceState() {
    def device = request.JSON?.device;
    def command = request.JSON?.command;
    log.debug "Got request: "+device+" "+command;
    def myDevice = getClosestDeviceMatch(device);
    log.debug myDevice?.hasCommand(command)
    myDevice?.hasCommand(command) ? myDevice."$command"() : []
    
}

def doHelloHome(reqPhrase) {
    log.debug("Got Hello Home request from Alexa: "+reqPhrase);
    def phrases = getClosestPhraseMatchSet(reqPhrase);
    location.helloHome?.execute(phrases.min{it.value}.key)
}

//find the closest match between the given string and the installed devices
def getClosestDeviceMatch(text){
    def device = getClosestDeviceMatchSet(text).min{it.value}
    return device.key //{device.value <= maxLevDist.value ? device.key : null};
}

def getClosestDeviceMatchSet(text){
    getClosestMatchSet(text, collectDevices());
}

//find the closest match between the given string and the available Hello Home phrases
def getClosestPhraseMatch(text){
    return getClosestDeviceMatchSet(text);
}

def getClosestPhraseMatchSet(text){
	getClosestMatchSet(text, location.helloHome?.getPhrases());
}

//returns a Map of object:score mappings based on the labels of the passed objects and the string 'text'
def getClosestMatchSet(text, objects){
    def resultMap = [:];
    objects.each {
        resultMap << [(it): getLevDist(normalizeString(text),normalizeString(it.label))];
    }
    return resultMap;
}

//get Levenshtein distance. Source: https://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#Groovy
def getLevDist(String str1, String str2) {
    def str1_len = str1.length()
    def str2_len = str2.length()
    int[][] distance = new int[str1_len + 1][str2_len + 1]
    (str1_len + 1).times { distance[it][0] = it }
    (str2_len + 1).times { distance[0][it] = it }
    (1..str1_len).each { i ->
       (1..str2_len).each { j ->
          distance[i][j] = [distance[i-1][j]+1, distance[i][j-1]+1, str1[i-1]==str2[j-1]?distance[i-1][j-1]:distance[i-1][j-1]+1].min()
       }
    }
    distance[str1_len][str2_len]
}

def normalizeString(String text){
    def ntext = text.toLowerCase();
    ntext = ntext.replaceAll("[^a-zA-Z0-9]","");
    return ntext;
}

def collectDevices(){
    return (switches+dimmers+contact).collect()
} 