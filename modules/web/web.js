const express = require('express');
const hbs = require("express-handlebars");
const path = require("path");
const bodyParser = require("body-parser");
const apiRouter = require('./apiRouter.js');
const config = require("../../config.json")
const fs = require("fs");

const fortniteApi = require("../fortniteApi/fortniteapi.js")

class Web {
    constructor() {

        this.app = express();
        this.app.engine('hbs', hbs({
            extname: 'hbs',
            defaultLayout: 'defaultlayout',
            helpers: {
                ifEquals: (arg1, arg2, options) => {
                    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
                }
            }
        }));
        this.app.set("views", path.join(__dirname, "views"));
        this.app.set("view engine", "hbs");
        this.app.set("trust proxy", true);
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use(bodyParser.json());

        this.lastrequests = [];

        this.app.get("/favicon.ico", (req, res) => {
            res.sendStatus(404);
        });

        this.app.use((req, res, next) => {
            this.lastrequests = this.lastrequests.filter(request => (new Date() - request.date) < (1000 * 60 * 60))
            var address = (req.headers['x-forwarded-for'] || req.connection.remoteAddress);
            console.log(address.replace('::ffff:', '') + " called " + req.path + "?" + Object.keys(req.query).map(query => query + "=" + req.query[query]).join("&"));
            this.lastrequests.push({
                date: new Date(),
                address
            });
            if(this.lastrequests.filter(request => request.address == address).filter(request => (new Date() - request.date) < 10000).length > 5) {
                res.send({message: "You requested to often! Rate Limit is 5 times in 10 seconds"});
            } else {
                res.locals.path = req.path;
                next();
            }
        });

        this.app.use("/api", apiRouter);
        
        this.app.get("/", (req, res) => {
            res.render("index", {
                title: "Home Page"
            });
        });
        
        this.app.get("/docs", (req, res) => {
            res.render("docs", {
                title: "Documentation"
            });
        });
        
        this.app.get("/status", (req, res) => {
            res.render("status", {
                title: "Status",
                items: [
                    {
                        name: "Gamefiles Assets",
                        status: fortniteApi.getAssets().length + " loaded",
                        color: (fortniteApi.getAssets().length > 0 ? "#2fcc66" : "#e74c3c")
                    },
                    {
                        name: "FortniteApi",
                        status: (fortniteApi.expires_at != undefined && (new Date(fortniteApi.expires_at) > new Date()) ? "Online" : "Offline"),
                        color: (fortniteApi.expires_at != undefined && (new Date(fortniteApi.expires_at) > new Date()) ? "#2fcc66" : "#e74c3c")
                    },
                    {
                        name: "Average calls per minute over last hour",
                        status: (Math.round((this.lastrequests.length / ((new Date() - this.lastrequests[0].date) / 1000 / 60)) * 100) / 100),
                        color: "#2fcc66"
                    }
                ]
            });
        });
        
        this.app.get("/about", (req, res) => {
            res.render("about", {
                title: "About"
            });
        });
        
        this.app.get("/pakbrowser", (req, res) => {
            //res.status(423).send({message: "disabled"})
            res.render("pakbrowser", {
                title: "Pak Browser",
                pakbrowserpath: req.query.path || "",
                extract: req.query.extract
            });
        });

        this.app.use((req, res, next) => {
            res.render("notFound");
        });

        this.serv = this.app.listen(process.env.PORT || 80);

        this.io = require('socket.io')(this.serv, {});
        this.io.on("connection", (socket) => {
            socket.on("ping-me", (starttime) => {
                socket.emit("pong-me", new Date().getTime() - starttime);
            });
            socket.on("pakexplorer-openFolder", (folder) => {
                fortniteApi.getFilesInDir(folder).then(resp => {
                    socket.emit("pakexplorer-updatefiles", resp);
                });
            });
            socket.on("pakexplorer-open", (filePath) => {
                socket.emit("pakexplorer-updatejson-clear");
                socket.emit("pakexplorer-update-type-clear");
                fortniteApi.extractAssetAndGetJson(filePath).then(json => {
                    if(json && JSON.stringify(json) != "[]" && JSON.stringify(json) != "[{}]") {
                        socket.emit("pakexplorer-updatejson", JSON.stringify(json, null, 4));

                        var theItem = json[0];
                        if(theItem.export_type) {
                            if(theItem.export_type == "Texture2D") {
                                fortniteApi.extractAssetAndGetTexture(filePath).then(data => {
                                    socket.emit("pakexplorer-update-type-Image", "data:image/png;base64," + new Buffer(data, 'binary').toString('base64'));
                                });
                            } else if(theItem.export_type == "FortChallengeBundleItemDefinition") {
                                fortniteApi.getChallengesBundleIcon(theItem).then(data => {
                                    socket.emit("pakexplorer-update-type-Image", "data:image/png;base64," + new Buffer(data, 'binary').toString('base64'));
                                })
                            } else if(theItem.export_type == "SoundWave" || json.filter(json => json.export_type == "SoundNodeWavePlayer").length > 0) {
                                //fortniteApi.extractAssetAndGetAudio(filePath).then(data => {
                                    socket.emit("pakexplorer-update-type-audio", /*"data:audio/ogg;base64," + new Buffer(data, 'binary').toString('base64')*/ "/api/files/getAudio?path=" + filePath);
                                //});
                            } else if(theItem.export_type == "AthenaMusicPackItemDefinition") {
                                fortniteApi.createCosmeticIconWithDescription(":" + filePath, true).then(icon => {
                                    if(theItem.FrontEndLobbyMusic) {
                                    socket.emit("pakexplorer-update-type-multiple", [
                                        {
                                            type: "image",
                                            src: "data:image/png;base64," + new Buffer(icon, 'binary').toString('base64')
                                        },
                                        {
                                            type: "audio",
                                            src: "/api/files/getAudio?path=" + theItem.FrontEndLobbyMusic.asset_path_name.substr(6).split(".")[0]
                                        }
                                    ]);
                                    }
                                });
                            } else if(theItem.export_type == "FortItemSeriesDefinition") {
                                fortniteApi.getBackgroundFromSeries(filePath).then(icon => {
                                    socket.emit("pakexplorer-update-type-Image", "data:image/png;base64," + new Buffer(icon, 'binary').toString('base64'));
                                });
                            } else if(theItem.export_type.includes("Athena") && theItem.export_type.includes("Item") && theItem.export_type.includes("Definition")) {
                                fortniteApi.createCosmeticIconWithDescription(":" + filePath, true).then(icon => {
                                    socket.emit("pakexplorer-update-type-Image", "data:image/png;base64," + new Buffer(icon, 'binary').toString('base64'));
                                });
                            }
                        }
                    } else {
                        fortniteApi.extractAsset(filePath).then(fileContent => {
                            if(fileContent) {
                                try {
                                    socket.emit("pakexplorer-updatejson", JSON.stringify(JSON.parse(fileContent.getFile().toString()), null, 4));
                                } catch(Exception) {
                                    socket.emit("pakexplorer-updatejson", fileContent.getFile().toString());
                                }
                            }
                        });
                    }
                });
            });
        });

        /*setInterval(() => {
            var news = require("../../news.json");
            var random = Math.floor(Math.random() * news.length);
            this.io.emit("shownews", news[random]);
        }, 60000);*/

        console.log("Module Web loaded");
    }
}
module.exports = new Web();