var { Client, RichEmbed, Attachment } = require("discord.js");
const fs = require("fs");

let fortniteApi = require("../fortniteApi/fortniteapi.js");

class Discord {
    constructor() {
        this.client = new Client();
        
        this.client.on('ready', () => {
            console.log("Module Discord loaded");
        });

        this.client.on('message', message => {
            if(message.content.substr(0,1) == "!") {
                var args = message.content.substr(1).split(" ");
                switch(args[0].toLowerCase()) {
                    case "help":
                        message.reply({
                            embed: {
                                fields: [
                                    {
                                        name: "!shop",
                                        value: "Sends the shop"
                                    },
                                    {
                                        name: "!news",
                                        value: "Sends the news"
                                    },
                                    {
                                        name: "!disconnect",
                                        value: "Disconnects from your voice channel"
                                    },
                                    {
                                        name: "!audio [GameFileSearchString]",
                                        value: "Joins in your voice channel, and plays the audio"
                                    },
                                    {
                                        name: "!image [GameFileSearchString]",
                                        value: "Sends the image"
                                    },
                                    {
                                        name: "!aeskeys",
                                        value: "A list of all current Aes Keys"
                                    }
                                ]
                            }
                        });
                    break;
                    case "giantcosmetic": 
                        if(args.length > 1) {
                            message.reply("Generating...").then(msg => {
                                fortniteApi.createGiantCosmeticIcon(":" + args[1], true).then((buffer) => {
                                    msg.delete()
                                    message.reply({
                                        content: "",
                                        files: [
                                            {
                                                attachment: buffer,
                                                name: "cosmetic.png"
                                            }
                                        ]
                                    })
                                })
                            })
                        } else {
                            message.reply("read Help");
                        }
                        break;
                    case "shop":
                        message.reply("Generating...").then(msg => {
                            fortniteApi.getShopIcon().then(buffer => {
                                msg.delete()
                                message.reply({
                                    content: "Current Fortnite Itemshop",
                                    files: [
                                        {
                                            attachment: buffer,
                                            name: "shop.png"
                                        }
                                    ]
                                })
                            })
                        })
                    break;
                    case "news":
                        message.reply("Generating...").then(msg => {
                            fortniteApi.getNewsIcon().then(buffer => {
                                msg.delete()
                                message.reply({
                                    content: "Current Fortnite News",
                                    files: [
                                        new Attachment(buffer, "news.png")
                                    ]
                                })
                            })
                        })
                        break;
                    case "audio":
                        if(args.length > 1) {
                            var voiceChannel = message.member.voiceChannel;
                            if(voiceChannel) {
                                if(voiceChannel.joinable) {
                                    fortniteApi.extractAssetAndGetAudio(args[1]).then(buffer => {
                                        voiceChannel.join().then(connection => {
                                            this.playBuffer(buffer, connection, args.includes("-loop"));
                                        });
                                    })
                                } else {
                                    message.reply("I can't join your voice channel.")
                                }
                            } else {
                                message.reply("You need to go in to a voice channel.")
                            }
                        } else {
                            message.reply("!audio [GameFileSearchString]");
                        }
                        break;
                    case "disconnect":
                        this.client.voiceConnections.filter(conn => conn.channel.members.filter(member => member.id == message.author.id).size > 0).forEach(conn => conn.disconnect());
                        break;
                    case "image":
                        if(args.length > 1) {
                            fortniteApi.extractAssetAndGetTexture(args[1]).then(buffer => {
                                message.reply({
                                    files: [
                                        new Attachment(buffer, "image.png")
                                    ]
                                })
                            })
                        } else {
                            message.reply("!image [GameFileSearchString]");
                        }
                        break;
                    case "aeskeys":
                    case "aes":
                    case "keys":
                        fortniteApi.getAesKeys().then(aesKeys => {
                            var embed = new RichEmbed();
                            embed.setTitle("Aes Keys");
                            embed.addField("Main Key", aesKeys.filter(aesKey => aesKey.type != null && aesKey.type == "mainKey")[0].aesKey);
                            aesKeys.filter(aesKey => aesKey.type == null || aesKey.type != "mainKey").forEach(aesKey => {
                                embed.addField(aesKey.pakFile + "(" + aesKey.itemID + ")", aesKey.aesKey);
                            });
                            message.channel.send(embed);
                        });
                        break;
                }
            }
        });
        
        this.client.login("NTkxOTk0NDU2MTY1NTgwODM3.XQ430w.jnplIxu_DW12AnoLdRyMKF_N4No");
		//this.client.login("NDk2OTUwMTg4OTQyOTUwNDEw.XXPSng.FpKAzHhyNsilfhhl5lqk95imJZA");
    }

    playBuffer(buffer, connection, loop) {
        var stream = new require("stream").Readable();
        stream.push(buffer);
        stream.push(null);
        var dispatcher = connection.playStream(stream);
        dispatcher.on("end", () => {
            if(loop) {
                this.playBuffer(buffer, connection, loop);
            } else connection.disconnect();
        });
    }
}

module.exports = new Discord();