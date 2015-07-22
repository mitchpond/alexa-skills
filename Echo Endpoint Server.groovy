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
    section("Choose devices use with Alexa...") {
        input "switches", "capability.switch", title: "Which switches?", multiple: true, required: false
        input "dimmers", "capability.switchLevel", title: "Which dimmers?", multiple: true, required: false
        input "contact", "capability.contactSensor", title: "Which contact sensors?", multiple: true, required: false
    }
}

mappings {
    path("/getSwitches") {
        action: [GET: "listSwitches"]
    }
    path("/getSwitches/:device") {
        action: [GET: "getSwitchState"]
    }
    path("/switch/:device/:command") {
        action: [GET: "setSwitchState"]
    }
    path("/getContact") {
        action: [GET: "listContactSensors"]
    }
    path("/getContact/:device") {
        action: [GET: "getContactState"]
    }
    path("/getState/:device") {
        action: [GET: "getDeviceState"]
    }
    path("/dimmer/:device/:level") {
        action: [GET: "setDimmerLevel"]
    }
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

def getSwitchState() {
    def device = switches.find({
        params.device.toLowerCase() == it.label.toLowerCase()
    })
    def response = []

    return [name: device.displayName, state: device.currentValue("switch")]
}

def setSwitchState() {
    def device = (switches.find({
        params.device.toLowerCase() == it.label.toLowerCase()
    })) ? it : (dimmers.find({
        params.device.toLowerCase() == it.label.toLowerCase()
    }))
    if (device) {
        def cmd = params.command(cmd == 'on') ? device ? .on() : (cmd == 'off') ? device ? .off() : [name: 'test', result: 'failure']
        return [name: device.displayName, state: device.currentValue("switch")]
    }
    else return null
}

def setDimmerLevel() {
    def device = dimmers.find({
        params.device.toLowerCase() == it.label.toLowerCase()
    })
    def level = Integer.parseInt(params.level)
        (level >= 0 && level <= 100) ? device ? .setLevel(level) : [name: 'test', result: 'failure']
    return [name: device.displayName, state: device.currentValue("level")]
}

def getDeviceState() {
    def deviceName = params.device
    def allDevices = (switches + contact + dimmers).collect()
    def myDevice = allDevices.find({
        it ? .label ? .equalsIgnoreCase(deviceName.toLowerCase())
    })
    try {
        def deviceState = []
        deviceState << myDevice.switchState
        deviceState << (myDevice.levelState ? [value: "${myDevice.levelState.value}%"] : myDevice.levelState)
        deviceState << myDevice.contactState
        def result = []
        result += deviceState * .value
        return [name: myDevice.label, state: result]
    }
    catch (e) {
        return
    }
}