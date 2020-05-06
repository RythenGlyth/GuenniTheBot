var path = require("path");
originalLog = console.log;
const fs = require("fs");

console.log = (msg) => {
    originalLog.apply(console.log,["[" + new Date().toISOString() + " @ " + path.parse(stack()[1].getFileName()).name + "] \x1b[0m"].concat([msg]).concat(["\x1b[0m"]));
}

function stack() {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
};

var web = require("./modules/web/web.js");
var discord = require("./modules/discord/discord.js");
var fortniteclient = require("./modules/fortnite-client/fortnite-client.js");