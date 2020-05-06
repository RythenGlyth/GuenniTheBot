const Fortnite = require("./fortnite.js");
const Launcher = require("./launcher.js");
const fs = require("fs");
const nodeWick = require("node-wick")
const request = require("request");
const pathModule = require('path');
const jimp = require("jimp");
var svg2img = require('svg2img');
var htmlToImage = require('html-to-image');

const config = require("../../config.json");

const pakPath = config["extractorPaths"]["pakPath"];
const extractPath = config["extractorPaths"]["extractPath"];

var assets = [];
var aesKeys = [];

let fortniteAPI = new Fortnite(
    [
        config["fortniteApi"]["email"],
        config["fortniteApi"]["password"],
        config["fortniteApi"]["client_launcher_token"],
        config["fortniteApi"]["fortnite_client_token"]
    ]
);

let launcher = new Launcher(
    [
        config["fortniteApi"]["email"],
        config["fortniteApi"]["password"],
        config["fortniteApi"]["client_launcher_token"],
        config["fortniteApi"]["fortnite_client_token"]
    ]
);

launcher.login().then(() => {
    launcher.getManifest().then(manifest => {
        console.log(manifest);
    });
});

var loggedIn;

fortniteAPI.loggedIn = new Promise((resolve, reject) => {
    loggedIn = resolve;
});

fortniteAPI.getAssets = () => {
    return assets;
}
function upateAssetsWithLog() {
    fortniteAPI.loggedIn.then(() => {
        var dateBefore = new Date();
        fortniteAPI.updateAssets().then(() => {
            var dateAfter = new Date();
            console.log("\x1b[32mAssets (" + assets.length + ") Reloaded in " + msToTime((dateAfter - dateBefore)) + "\x1b[0m");
        })
    })
}
fortniteAPI.loggedIn.then(() => {
    var dateBefore = new Date();
    fortniteAPI.updateAssets().then(() => {
        console.log("\x1b[32mAssets (" + assets.length + ") Loaded in " + msToTime((new Date() - dateBefore)) + "\x1b[0m");
    })
})

setInterval(upateAssetsWithLog, 1000*60*2);
{
    var dateBefore = new Date();
    fortniteAPI.login().then(() => {
        loggedIn(true);
        var dateAfter = new Date();
        console.log("\x1b[32mFortnite Api loaded in " +  msToTime((dateAfter - dateBefore)) + "\x1b[0m");
    })
}
function msToTime(duration) {
    var milliseconds = parseInt((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
  
    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}


fortniteAPI.getFilesInDir = (path) => { // path = "foo/bar/thisisafolder", = ""
    return new Promise((resolve, reject) => {
        let pl = path.length;
        var files = [];
        var folder = [];
        try {
            assets.forEach(asset => {
                let gfp = asset.GameFilePath;
                if (gfp.startsWith(path)) { // GameFilePath = "foo/bar/thisisafolder/foldesdfr/file.txt"
                    if (gfp.lastIndexOf("/") == pl /* ! may need +/- 1 ! */ ) { // is file in path folder
                        var element = gfp.substring(pl + 1);
                        if ((pos = element.indexOf(".uasset")) > -1) {
                            files.push(element.substring(0, pos));
                        } else if(!element.endsWith(".uexp") && !element.endsWith(".ubulk")) {
                            files.push(element);
                        }
                    } else { // is file in different folder
                        let name = gfp.substring(pl==0 ? 0 : pl+1, gfp.indexOf("/", pl + 1));
                        if(folder.indexOf(name) == -1) folder.push(name);
                    }
                }
            });
        } catch(Exception) {}
        folder.sort();
        files.sort();
        resolve({
            path,
            folder,
            files
        })
    }).catch(err => console.log(err));
}

fortniteAPI.getChallengesBundleIcon = async (theItem) => {
    return new Promise(async (resolve, reject) => {
        var SecondaryColor = (theItem.DisplayStyle && theItem.DisplayStyle.SecondaryColor) ? theItem.DisplayStyle.SecondaryColor : {r: 0.133333, g: 0.21960784313, b: 0.4117647058};
        var AccentColor = (theItem.DisplayStyle && theItem.DisplayStyle.AccentColor) ? theItem.DisplayStyle.AccentColor : {r: 1, g: 1, b: 1};
        fortniteAPI.getQuestJimps(theItem).then(quests => {
            new jimp(1024, 256 + 40 + quests.height + 40, rgbToHex(gameFilesRGBtoNormal(SecondaryColor)), async (err, bundle) => {
                if((theItem.DisplayStyle && theItem.DisplayStyle.CustomBackground)) {
                    var buff = await fortniteAPI.extractAssetAndGetTexture(theItem.DisplayStyle.CustomBackground.asset_path_name.split(".")[0].substr(5));
                    var base64 = "data:image/png;base64," + new Buffer(buff, 'binary').toString('base64');
                    
                    var svgString = `<svg width="1024" height="256">
                        <defs>
                        <linearGradient id="fadeGrad" y2="0" x2="1">
                        <stop offset=".25" stop-color="black" stop-opacity="0"/>
                        <stop offset="1" stop-color="black" stop-opacity=".7"/>
                        </linearGradient>
                        <mask id="fade" maskContentUnits="objectBoundingBox">
                        <rect width="1026" height="258" fill="url(#fadeGrad)"/>
                        </mask></defs>
                        <image width="1024" height="256" href="` + base64 + `" mask="url(#fade)" /></svg>`;
                    
                    var topthing = await svgToImg(svgString);
                    var topthingjimp = await jimp.read(topthing);
                    bundle.composite(topthingjimp, 0, -5);
                }
                    
                var svgStringTitle = `<svg width="1024" height="256">
                <text style="font-family: 'Burbank Big Cd Bk'" font-size="100" x="20" y="128" fill="` + rgbToHex(gameFilesRGBtoNormal(AccentColor)) + `" text-anchor="start" alignment-baseline="middle">` + theItem.DisplayName.string + `</text>
                <polygon points="0,226 600,236 595,216 1024,226 1024,256 0,256" fill="` + rgbToHex(shadeColor(gameFilesRGBtoNormal(SecondaryColor), 2)) + `" />
                </svg>`;
                
                svgToImg(svgStringTitle).then(titleBuffer => {
                    fs.writeFileSync("sas.png", titleBuffer);
                    jimp.read(titleBuffer).then(async titlejimp => {
                        bundle.composite(titlejimp, 0, 0);
                        
                        var currentY = 256 + 40 + 20;
    
                        await asyncForEach(quests.jimps, async quest => {
                            bundle.composite(quest.jimp, quest.x, quest.y + currentY);
                            //currentY += await fortniteAPI.drawQuest(bundle, quest.QuestDefinition.asset_path_name.split(".")[0].substr(5), currentY);
    
                        });
    
                        resolve(bundle.getBufferAsync(jimp.MIME_PNG));
                    });
                });
    
            });
        })
    }).catch(err => {
        console.log(err);
    })
}

fortniteAPI.getQuestJimps = async (theItem) => {
    return new Promise(async (resolve, reject) => {
        var currentY = 0;
        var jimps = [];
        await asyncForEach(theItem.BundleCompletionRewards || [], async completionReward => {
            await asyncForEach(completionReward.Rewards, async reward => {
                if(reward.RewardType.toLowerCase() == "EAthenaRewardItemType::Normal".toLowerCase()) {
                    var questJimp = await fortniteAPI.getBlockJimp(
                        20,
                        "Complete ANY " + completionReward.CompletionCount + " OBJECTIVES to earn the reward item",
                        completionReward.CompletionCount,
                        reward.Quantity,
                        reward.ItemDefinition.asset_path_name.split(".")[0].substr(5)
                    );
                    jimps.push({
                        jimp: questJimp,
                        x: 20,
                        y: currentY
                    });
                    currentY += 20 + questJimp.bitmap.height;
                }
            });
        });
        if(jimps.length > 0) currentY += 40;
        await asyncForEach(theItem.QuestInfos, async quest => {
            var res = await fortniteAPI.getQuestJimp(quest.QuestDefinition.asset_path_name.split(".")[0].substr(5), currentY);
            currentY += res.size;
            jimps = jimps.concat(res.jimps);
        });
        resolve({
            height: currentY,
            jimps: jimps
        });
    }).catch(err => console.log(err));
}

fortniteAPI.getQuestJimp = async (questPath, currentY, staged, stageCount) => {
    return new Promise(async (resolve, reject) => {
        if(!stageCount) stageCount = 0;
        var theQuest = (await fortniteAPI.extractAssetAndGetJson(questPath))[0];
        var distanceFromLeft = staged ? 60 : 20;

        var rewards = theQuest.Rewards ? theQuest.Rewards.filter(reward => reward.ItemPrimaryAssetId.PrimaryAssetType.Name != "Quest") : [];
        var reward = (rewards.length > 0) ? rewards[0] : null;
        
        var questJimp = await fortniteAPI.getBlockJimp(
            distanceFromLeft,
            ((staged) ? "Stage " + (stageCount + 1) + ": " : "") + theQuest.Description.string.split("<").join("&lt;").split(">").join("&gt;"),
            ((theQuest.Objectives && theQuest.Objectives.length > 0 && theQuest.Objectives[0].Count) ? theQuest.Objectives[0].Count : "0"),
            (reward) ? reward.Quantity : null,
            (reward) ? reward.ItemPrimaryAssetId.PrimaryAssetName.split(".")[0].split("/Game").join("") + "." : null
        );

        /*var questJimp = new jimp(1024 - distanceFromLeft - 20, 75, 0x00000044);

        var questSvgString = `<svg width="` + (1024 - distanceFromLeft - 20) + `" height="75">
            <text fill="white" x="10" y="5" style="font-family: 'Burbank Small Bold'" text-anchor="start" font-size="20" alignment-baseline="text-before-edge" >` + ((staged) ? "Stage " + stageCount + 1 + ": " : "") + theQuest.DisplayName.string.split("<").join("&lt;").split(">").join("&gt;") + `</text>
            <rect fill="#000" x="10" y="50" width="` + (600 - distanceFromLeft) + `" height="10" />
            <text fill="white" x="` + (10 - distanceFromLeft + 600 + 10) + `" y="55" style="font-family: 'Burbank Small Bold'" text-anchor="start" font-size="20" alignment-baseline="middle" >` + "0/" + ((theQuest.Objectives && theQuest.Objectives.length > 0 && theQuest.Objectives[0].Count) ? theQuest.Objectives[0].Count : "0")  + `</text>
            <text fill="white" x="` + (1024 - distanceFromLeft - 20 - 60) + `" y="75" style="font-family: 'Burbank Small Bold'" text-anchor="middle" font-size="20" alignment-baseline="text-after-edge" >` + reward.Quantity + `</text>
            </svg>`;
        
        var questSvg = await svgToImg(questSvgString);
        var questSvgJimp = await jimp.read(questSvg);

        questJimp.composite(questSvgJimp, 0, 0);*/

        var stagesize = 0;
        var jimps = [];

        var questRewards = theQuest.Rewards ? theQuest.Rewards.filter(reward => reward.ItemPrimaryAssetId.PrimaryAssetType.Name == "Quest") : [];
        if(questRewards.length > 0) {
            var stagedResponse = await fortniteAPI.getQuestJimp(questRewards[0].ItemPrimaryAssetId.PrimaryAssetName, currentY + 75 + 20, true, stageCount + 1);
            jimps = jimps.concat(stagedResponse.jimps);
            stagesize = stagedResponse.size;
        }

        resolve({
            size: 75 + 20 + stagesize,
            jimps: [
                {
                    x: distanceFromLeft,
                    y: currentY,
                    jimp: questJimp
                }
            ].concat(jimps),
        });
    }).catch(err => console.log(err));
}

fortniteAPI.getBlockJimp = async (distanceFromLeft, displayName, questCount, rewardQuantity, rewardTexturePath) => {
    return new Promise(async (resolve, reject) => {
        var rewardItem;
        var rewardItemTexture;
        var rewardItemTextureBase64;
        if(rewardTexturePath) {
            if(!rewardTexturePath.endsWith(".")) rewardTexturePath = rewardTexturePath + ".";
            rewardItem = (await fortniteAPI.extractAssetAndGetJson(rewardTexturePath))[0];
            rewardItemTexture = await fortniteAPI.extractAssetAndGetTexture(
                ((rewardItem.LargePreviewImage || rewardItem.SmallPreviewImage) ? 
                    ((rewardItem.LargePreviewImage || rewardItem.SmallPreviewImage).asset_path_name) + "."
                    : "T_Placeholder_Generic"
                    ).split(".")[0].substr(5) + "."
            );
            rewardItemTextureBase64 = "data:image/png;base64," + new Buffer(rewardItemTexture, 'binary').toString('base64');
        }
        

        var questJimp = new jimp(1024 - distanceFromLeft - 20, 75, 0x00000044);

        var questSvgString = `<svg width="` + (1024 - distanceFromLeft - 20) + `" height="75">
            <text fill="white" x="10" y="5" style="font-family: 'Burbank Small Bold'" text-anchor="start" font-size="20" alignment-baseline="text-before-edge" >` + displayName + `</text>
            <rect fill="#000" x="10" y="50" width="` + (600 - distanceFromLeft) + `" height="10" />
            <text fill="white" x="` + (10 - distanceFromLeft + 600 + 10) + `" y="55" style="font-family: 'Burbank Small Bold'" text-anchor="start" font-size="20" alignment-baseline="middle" >` + "0/" + questCount + `</text>`
            +
            ((rewardTexturePath) ? 
                
                    ((rewardQuantity != 1) ? 
                        `<text fill="white" x="` + (1024 - distanceFromLeft - 20 - 30 - 80) + `" y="37,5" style="font-family: 'Burbank Small Bold'" text-anchor="end" font-size="20" alignment-baseline="middle" >` + rewardQuantity + `</text>`
                    : "")
                 + `<image x="` + (1024 - distanceFromLeft - 20 - 60 - 30) + `" y="2,5" width="70" height="70" href="` + rewardItemTextureBase64 + `"/>`
            : "")
            +
            `</svg>`;
        
        var questSvg = await svgToImg(questSvgString);
        var questSvgJimp = await jimp.read(questSvg);

        questJimp.composite(questSvgJimp, 0, 0);

        resolve(questJimp);
    }).catch(err => console.log(err));
}

/*fortniteAPI.drawQuest = async (bundleJimp, questPath, currentY, staged, stageCount) => {
    return new Promise(async (resolve, reject) => {
        if(!stageCount) stageCount = 0;
        var theQuest = (await fortniteAPI.extractAssetAndGetJson(questPath))[0];
        var distanceFromLeft = staged ? 60 : 20;
        var questJimp = new jimp(1024 - distanceFromLeft - 10, 75, 0x00000044);
        var questSvgString = `<svg width="` + (1024 - distanceFromLeft - 10) + `" height="75">
            <text fill="white" x="10" y="5" style="font-family: 'Burbank Small Bold'" text-anchor="start" font-size="20" alignment-baseline="text-before-edge" >` + theQuest.DisplayName.string.split("<").join("&lt;").split(">").join("&gt;") + `</text>
            </svg>`;
        
        var questSvg = await svgToImg(questSvgString);
        var questSvgJimp = await jimp.read(questSvg);

        questJimp.composite(questSvgJimp, 0, 0);

        bundleJimp.composite(questJimp, distanceFromLeft, currentY);

        var stagesize = 0;

        var questRewards = theQuest.Rewards ? theQuest.Rewards.filter(reward => reward.ItemPrimaryAssetId.PrimaryAssetType.Name == "Quest") : [];
        if(questRewards.length > 0) {
            stagesize = await fortniteAPI.drawQuest(bundleJimp, questRewards[0].ItemPrimaryAssetId.PrimaryAssetName, currentY + 75 + 20, true, stageCount + 1);
        }

        resolve(75 + 20 + stagesize);
    }).catch(err => console.log(err));

}*/

fortniteAPI.getNewsIcon = async () =>  {
    return new Promise(async (resolve, reject) => {
        fortniteAPI.getFortniteNews().then(newsApi => {
            var news = newsApi.br;
            jimp.loadFont("./fonts/BurbankBigCondensed_20.fnt").then(burbank20 => {
                jimp.loadFont("./fonts/BurbankBigCondensed_20_White.fnt").then(burbank20_white => {
                    jimp.loadFont("./fonts/BurbankBigCondensed_40.fnt").then(burbank40 => {
                        jimp.loadFont("./fonts/BurbankBigCondensed_40_white.fnt").then(burbank40_white => {
                            jimp.loadFont("./fonts/BurbankBigCondensed_250.fnt").then(burbank250 => {
                                jimp.read("./newsBackground.png").then((background) => {
                                    jimp.read(news[0].image).then((image1) => {
                                        image1.resize(528, 264);
                                        jimp.read(news[1].image).then((image2) => {
                                            image2.resize(528, 264);
                                            jimp.read(news[2].image).then((image3) => {
                                                image3.resize(528, 264);
                                                new jimp(544, 470, 0xffffffff, (err, left) => {
                                                    if(err) {
                                                        console.error(err);
                                                    } else {
                                                        left.composite(image1, 8, 8);
                                                        left.print(burbank40, 8, 8 + image1.getHeight() + 8, news[0].title, 544 - 16);
                                                        left.print(burbank20, 8, 8 + image1.getHeight() + 8 + jimp.measureTextHeight(burbank40, news[0].title) + 8, news[0].body, 544 - 16);
                                                        new jimp(544, 470, 0xffffffff, (err, middle) => {
                                                            if(err) {
                                                                console.error(err);
                                                            } else {
                                                                middle.composite(image2, 8, 8);
                                                                middle.print(burbank40, 8, 8 + image2.getHeight() + 8, news[1].title, 544 - 16);
                                                                middle.print(burbank20, 8, 8 + image2.getHeight() + 8 + jimp.measureTextHeight(burbank40, news[1].title) + 8, news[1].body, 544 - 16);
                                                                new jimp(544, 470, 0xffffffff, async (err, right) => {
                                                                    if(err) {
                                                                        console.error(err);
                                                                    } else {
                                                                        right.composite(image3, 8, 8);
                                                                        right.print(burbank40, 8, 8 + image3.getHeight() + 8, news[2].title, 544 - 16);
                                                                        right.print(burbank20, 8, 8 + image3.getHeight() + 8 + jimp.measureTextHeight(burbank40, news[2].title) + 8, news[2].body, 544 - 16);
                                                                        background.composite(left, ((background.getWidth() / 2) - (544 / 2)) - 30 - 544, 370);
                                                                        background.composite(middle, ((background.getWidth() / 2) - (544 / 2)), 370);
                                                                        background.composite(right, ((background.getWidth() / 2) + (544 / 2)) + 30, 370);
                                                                        var title = "NEWS";
                                                                        background.print(burbank250, (background.getWidth() / 2) - (jimp.measureText(burbank250, title) / 2), 100, title);
                                                                        background.print(burbank20_white, 5, 5, "Generated at " + new Date().toUTCString() + " with GuenniTheBot - AssetProperty Of EpicGames And Respective Owners.");
                                                                
                                                                        if(news[0].adspace) {
                                                                            var width = jimp.measureText(burbank40_white, news[0].adspace) + 80;
                                                                            var svg = '<svg height="80" width="' + width + '"><polygon points="10,10 ' + (width - 30) + ',10 ' + (width - 10) + ',35 ' + (width - 30) + ',60 20,60" stroke-linejoin="miter" fill="#f66272" stroke="#eeeeee" stroke-width="7" />' + '</svg>';
                                                                            var adspace0 = await jimp.read(await svgToImg(svg));
                                                                            adspace0.print(burbank40_white, 40, 20, news[0].adspace);
                                                                            background.composite(adspace0, (((background.getWidth() / 2) - (544 / 2)) - 30 - 544) - 20, (370) - 40);
                                                                        }
                                                                        if(news[1].adspace) {
                                                                            var width = jimp.measureText(burbank40_white, news[1].adspace) + 80;
                                                                            var svg = '<svg height="80" width="' + width + '"><polygon points="10,10 ' + (width - 30) + ',10 ' + (width - 10) + ',35 ' + (width - 30) + ',60 20,60" stroke-linejoin="miter" fill="#f66272" stroke="#eeeeee" stroke-width="7" />' + '</svg>';
                                                                            var adspace0 = await jimp.read(await svgToImg(svg));
                                                                            adspace0.print(burbank40_white, 40, 20, news[1].adspace);
                                                                            background.composite(adspace0, (((background.getWidth() / 2) - (544 / 2))) - 20, (370) - 40);
                                                                        }
                                                                        if(news[2].adspace) {
                                                                            var width = jimp.measureText(burbank40_white, news[2].adspace) + 80;
                                                                            var svg = '<svg height="80" width="' + width + '"><polygon points="10,10 ' + (width - 30) + ',10 ' + (width - 10) + ',35 ' + (width - 30) + ',60 20,60" stroke-linejoin="miter" fill="#f66272" stroke="#eeeeee" stroke-width="7" />' + '</svg>';
                                                                            var adspace0 = await jimp.read(await svgToImg(svg));
                                                                            adspace0.print(burbank40_white, 40, 20, news[2].adspace);
                                                                            background.composite(adspace0, (((background.getWidth() / 2) + (544 / 2)) + 30) - 20, (370) - 40);
                                                                        }
                                                                        background.getBufferAsync(jimp.MIME_PNG).then((buffer) => {
                                                                            resolve(buffer);
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

    });
}

async function svgToImg(svgString) {
    return new Promise((resolve, reject) => {
        svg2img(svgString, (err, buffer) => {
            resolve(buffer);
        })
    }).catch(err => console.log(err));
}

fortniteAPI.getShopIcon = async (lang) =>  {
    return new Promise(async (resolve, reject) => {
        fortniteAPI.getStore(lang).then(async store => {
            var featuredShop = [];
            await asyncForEach(store.storefronts.filter(s => s.name == "BRWeeklyStorefront")[0].catalogEntries, async e => {
                var itemGrantsImages = [];
                await asyncForEach(e.itemGrants, async (i, idx) => {
                    itemGrantsImages.push(await fortniteAPI.createCosmeticIcon(i.templateId, true, e.prices[idx] ? e.prices[idx].finalPrice + "" : null));
                });
                var itemGrantImageBuffer;
                if(itemGrantsImages.length > 1) {
                    var img = await jimp.read(itemGrantsImages[0]);
                    var img2 = await jimp.read(itemGrantsImages[1]);
                    img2.resize(128, 128);
                    img.composite(img2, 5, 5 + 512 - 128 - 128);
                    var buffer = await img.getBufferAsync(jimp.MIME_PNG);
                    itemGrantImageBuffer = buffer;
                } else {
                    itemGrantImageBuffer = itemGrantsImages[0];
                }
                featuredShop.push(itemGrantImageBuffer);
            });
            var dailyShop = [];
            await asyncForEach(store.storefronts.filter(s => s.name == "BRDailyStorefront")[0].catalogEntries, async e => {
                var itemGrantsImages = [];
                await asyncForEach(e.itemGrants, async (i, idx) => {
                    itemGrantsImages.push(await fortniteAPI.createCosmeticIcon(i.templateId, false, e.prices[idx] ? e.prices[idx].finalPrice + "" : null));
                });
                var itemGrantImageBuffer;
                if(itemGrantsImages.length > 1) {
                    var img = await jimp.read(itemGrantsImages[0]);
                    var img2 = await jimp.read(itemGrantsImages[1]);
                    img2.resize(128, 128);
                    img.composite(img2, 5, 5 + 512 - 128 - 128);
                    var buffer = await img.getBufferAsync(jimp.MIME_PNG);
                    itemGrantImageBuffer = buffer;
                } else {
                    itemGrantImageBuffer = itemGrantsImages[0];
                }
                dailyShop.push(itemGrantImageBuffer);
            });
            jimp.loadFont("./fonts/BurbankBigCondensed_150_white.fnt").then(burbank150_white => {
                jimp.loadFont("./fonts/BurbankBigCondensed_100_white.fnt").then(burbank100_white => {
                    jimp.loadFont("./fonts/BurbankBigCondensed_80_white.fnt").then(burbank80_white => {
                        jimp.loadFont("./fonts/BurbankBigCondensed_60_white.fnt").then(burbank60_white => {
                            var titleName = "FORTNITE ITEM SHOP";
                            var formattedDate = new Intl.DateTimeFormat('en-US', {
                                timeZone: "UTC",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            }).format(new Date());
                            var distanceBetween = 40;
                            var middlemultiplier = 3;
                            var width = distanceBetween+522+distanceBetween+522+(distanceBetween*middlemultiplier)+522+distanceBetween+522+distanceBetween;
                            var height = 8+jimp.measureTextHeight(burbank150_white, titleName)+20+jimp.measureTextHeight(burbank100_white, formattedDate)+10+jimp.measureTextHeight(burbank80_white, "DAILY FEATURED")+20+((featuredShop.length > dailyShop.length ? Math.ceil(featuredShop.length / 2) : Math.ceil(dailyShop.length / 2)) * (522 + distanceBetween)) + 20 + 20;
                            var currentheight = 8;
                            new jimp(width, height, "#1e1e1e", async (err, shop) => {
                                shop.print(burbank150_white, 0, currentheight, {
                                    text: titleName,
                                    alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
                                    alignmentY: jimp.VERTICAL_ALIGN_TOP
                                }, width, 250);
                                currentheight += jimp.measureTextHeight(burbank150_white, titleName)+10;
                                shop.print(burbank100_white, 0, currentheight, {
                                    text: formattedDate,
                                    alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
                                    alignmentY: jimp.VERTICAL_ALIGN_TOP
                                }, width, 250);
                                currentheight += jimp.measureTextHeight(burbank100_white, formattedDate)+10;
                                shop.print(burbank80_white, 0, currentheight, {
                                    text: "FEATURED",
                                    alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
                                    alignmentY: jimp.VERTICAL_ALIGN_TOP
                                }, width / 2, 250);
                                shop.print(burbank80_white, width / 2, currentheight, {
                                    text: "DAILY",
                                    alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
                                    alignmentY: jimp.VERTICAL_ALIGN_TOP
                                }, width / 2, 250);
                                currentheight += jimp.measureTextHeight(burbank80_white, "DAILY FEATURED")+20;
                                await asyncForEach(featuredShop, async (fs, i) => {
                                    try {
                                        var height = currentheight+((Math.ceil((i + 1) / 2) - 1) * (522 + distanceBetween));
                                        var shopImage = await jimp.read(fs);
                                        shop.composite(shopImage, distanceBetween + ((i % 2) * (522 + distanceBetween)), height);
                                    } catch(Exception) {}
                                })
                                await asyncForEach(dailyShop, async (ds, i) => {
                                    try {
                                        var height = currentheight+((Math.ceil((i + 1) / 2) - 1) * (522 + distanceBetween));
                                        var shopImage = await jimp.read(ds);
                                        shop.composite(shopImage, distanceBetween+522+distanceBetween+522+(distanceBetween*middlemultiplier) + ((i % 2) * (522 + distanceBetween)), height);
                                    } catch(Exception) {}
                                })
                                var buffer = await shop.getBufferAsync(jimp.MIME_PNG);
                                resolve(buffer);
                            });
                        });
                    });
                });
            });
        });
    }).catch(err => console.log(err));
}

fortniteAPI.getKeyForPak = async (pakFilePath) => {
    return new Promise(async (resolve, reject) => {
        var aesKey;
        var pakFile = pathModule.parse(pakFilePath).base;
        var guid = fortniteAPI.getGUIDByPak(pakFilePath);
        if(guid == "0-0-0-0") {
            await fortniteAPI.getMainAesKey().then(aesKey => {
                resolve(aesKey.replace("0x", ""));
            })
        } else {
            aesKeys.forEach(j => {
                if(j.pakFile == pakFile) {
                    resolve(j.aesKeyAsHex);
                }
            })
        }
        resolve("error");
    }).catch(err => {
        console.error(err);
    })
}

fortniteAPI.createCosmeticIconWithDescription = async (id, featured) => {
    return new Promise(async (resolve, reject) => {
        var idArgs = id.split(":");
        var directory = idArgs[0].substr(6) + "s";
        //fortniteAPI.extractAssetAndGetJson(idArgs[0] == "BannerToken" ? "Athena/Items/BannerToken/" + idArgs[1] : "Athena/Items/Cosmetics/" + directory + "/" + idArgs[1]).then(json => {
        //fortniteAPI.extractAssetsAndGetJsonsRegEx(new RegExp("Athena\/.*" + idArgs[1] + "\.", "i")).then(json => {
        fortniteAPI.extractAssetAndGetJson(idArgs[1]).then(json => {
            var cosmeticJsons = json.filter(jsn => jsn.export_type.includes("Athena") && jsn.export_type.includes("Item") && jsn.export_type.includes("Definition"));
            var theItem = cosmeticJsons.length > 0 ? cosmeticJsons[0] : {};

            /*var itemBackgroundPath;
            switch (theItem.Rarity)
            {
                case "EFortRarity::Transcendent":
                    itemBackgroundPath = "./iconBackgrounds/Transcendent.png";
                    break;
                case "EFortRarity::Mythic":
                    itemBackgroundPath = "./iconBackgrounds/Mythic.png";
                    break;
                case "EFortRarity::Legendary":
                    itemBackgroundPath = "./iconBackgrounds/Legendary.png";
                    break;
                case "EFortRarity::Epic":
                case "EFortRarity::Quality":
                    itemBackgroundPath = "./iconBackgrounds/Epic.png";
                    break;
                case "EFortRarity::Rare":
                    itemBackgroundPath = "./iconBackgrounds/Rare.png";
                    break;
                case "EFortRarity::Common":
                    itemBackgroundPath = "./iconBackgrounds/Common.png";
                    break;
                default:
                    itemBackgroundPath = "./iconBackgrounds/Uncommon.png";
                    break;
            }*/
            fortniteAPI.getBackgroundBufferFromItem(theItem).then(itemBackgroundPath => {
                jimp.read(itemBackgroundPath, (err, graphics) => {
                    if(err) {
                        console.error(err);
                    } else {
                        fortniteAPI.getImage(theItem, featured).then(image => {
                            fortniteAPI.extractAssetAndGetTexture(image.path).then(buffer => {
                                jimp.read(buffer).then((img) => {
                                    img.resize(512, 512);
                                    graphics.composite(img, 5, 5);
                                    new jimp(512, 128, '#00000055', (err, naming) => {
                                        jimp.loadFont("./fonts/BurbankBigCondensed_40_white.fnt").then(burbank40_white => {
                                            jimp.loadFont("./fonts/BurbankBigCondensed_20_white.fnt").then(async burbank20_white => {
                                                var border = 5;
                                                naming.print(
                                                    burbank40_white,
                                                    5 + border,
                                                    5 + border,
                                                    {
                                                        text: theItem.DisplayName ? theItem.DisplayName.string.toUpperCase() : "?",
                                                        alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
                                                        alignmentY: jimp.VERTICAL_ALIGN_TOP
                                                    },
                                                    512 - border,
                                                    128 - border * 2
                                                );
                                                naming.print(
                                                    burbank20_white,
                                                    5 + border,
                                                    5 + border + jimp.measureTextHeight(burbank40_white, theItem.DisplayName ? theItem.DisplayName.string.toUpperCase() : "?"),
                                                    {
                                                        text: theItem.Description ? theItem.Description.string : "?",
                                                        alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
                                                        alignmentY: jimp.VERTICAL_ALIGN_TOP
                                                    },
                                                    512 - border,
                                                    128 - border * 2
                                                );
                                                graphics.composite(naming, 5, 5 + 512 - 128);
                                                
                                                if(image.featured && theItem.export_type == "AthenaItemWrapDefinition") {
                                                    var unFeaturedImage = (await fortniteAPI.getImage(theItem, false)).path;
                                                    var unFeaturedBuffer = await fortniteAPI.extractAssetAndGetTexture(unFeaturedImage);
                                                    var unFeaturedImg = await jimp.read(unFeaturedBuffer);
                                                    unFeaturedImg.resize(128, 128);
                                                    graphics.composite(unFeaturedImg, graphics.bitmap.width - 128, graphics.bitmap.height - naming.bitmap.height - 128);
                                                }
                                                //Check if Animated or Something else
                                                if(theItem.GameplayTags) {
                                                    if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Animated")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Animated-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasUpgradeQuests")).length > 0 && theItem.export_type != "AthenaPetCarrierItemDefinition") {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Quests-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasUpgradeQuests")).length > 0 && theItem.export_type == "AthenaPetCarrierItemDefinition") {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Pets-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasVariants")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Variant-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Reactive")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Adaptive-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Traversal")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Traversal-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    }
                                                }
                                                //Get Buffer and return
                                                graphics.getBufferAsync(jimp.MIME_PNG).then((buffer) => {
                                                    resolve(buffer);
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    }
                });
            });
        });
    }).catch(err => {
        console.log(err);
    });
}

fortniteAPI.createCosmeticIcon = async (id, featured, vbucksprice) => {
    return new Promise(async (resolve, reject) => {
        var idArgs = id.split(":");
        var directory = idArgs[0].substr(6) + "s";
        //fortniteAPI.extractAssetAndGetJson(idArgs[0] == "BannerToken" ? "Athena/Items/BannerToken/" + idArgs[1] : "Athena/Items/Cosmetics/" + directory + "/" + idArgs[1]).then(json => {
        //fortniteAPI.extractAssetsAndGetJsonsRegEx(new RegExp("Athena\/.*" + idArgs[1] + "\.", "i")).then(json => {
        fortniteAPI.extractAssetAndGetJson(idArgs[1]).then(json => {
            var cosmeticJsons = json.filter(jsn => jsn.export_type.includes("Athena") && jsn.export_type.includes("Item") && jsn.export_type.includes("Definition"));
            var theItem = cosmeticJsons.length > 0 ? cosmeticJsons[0] : {};

            /*var itemBackgroundPath;
            switch (theItem.Rarity)
            {
                case "EFortRarity::Transcendent":
                    itemBackgroundPath = "./iconBackgrounds/Transcendent.png";
                    break;
                case "EFortRarity::Mythic":
                    itemBackgroundPath = "./iconBackgrounds/Mythic.png";
                    break;
                case "EFortRarity::Legendary":
                    itemBackgroundPath = "./iconBackgrounds/Legendary.png";
                    break;
                case "EFortRarity::Epic":
                case "EFortRarity::Quality":
                    itemBackgroundPath = "./iconBackgrounds/Epic.png";
                    break;
                case "EFortRarity::Rare":
                    itemBackgroundPath = "./iconBackgrounds/Rare.png";
                    break;
                case "EFortRarity::Common":
                    itemBackgroundPath = "./iconBackgrounds/Common.png";
                    break;
                default:
                    itemBackgroundPath = "./iconBackgrounds/Uncommon.png";
                    break;
            }*/
            fortniteAPI.getBackgroundBufferFromItem(theItem).then(itemBackgroundPath => {
                jimp.read(itemBackgroundPath, (err, graphics) => {
                    if(err) {
                        console.error(err);
                    } else {
                        fortniteAPI.getImage(theItem, featured).then(image => {
                            fortniteAPI.extractAssetAndGetTexture(image.path).then(buffer => {
                                jimp.read(buffer).then((img) => {
                                    img.resize(512, 512);
                                    graphics.composite(img, 5, 5);
                                    new jimp(512, 128, '#00000055', (err, naming) => {
                                        jimp.loadFont("./fonts/BurbankBigCondensed_40_white.fnt").then(burbank40_white => {
                                            var border = 5;
                                            naming.print(
                                                burbank40_white,
                                                5 + border,
                                                5 + border,
                                                {
                                                    text: theItem.DisplayName ? theItem.DisplayName.string.toUpperCase() : "?",
                                                    alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
                                                    alignmentY: jimp.VERTICAL_ALIGN_TOP
                                                },
                                                512 - border,
                                                128 - border * 2
                                            );
                                            jimp.read("./ItemsThings/T-Items-MTX-L.png", async (err, vbucks) => {
                                                vbucks.resize(50, 50);
                                                if(vbucksprice) {
                                                    naming.print(
                                                        burbank40_white,
                                                        5 + border + 512 / 2 - ((jimp.measureText(burbank40_white, vbucksprice) + 10 + 50) / 2),
                                                        5 + border + jimp.measureTextHeight(burbank40_white, theItem.DisplayName ? theItem.DisplayName.string.toUpperCase() : "?") + 10,
                                                        {
                                                            text: vbucksprice,
                                                            alignmentX: jimp.HORIZONTAL_ALIGN_LEFT,
                                                            alignmentY: jimp.VERTICAL_ALIGN_TOP
                                                        }
                                                    );
                                                    naming.composite(vbucks, 5 + border + 512 / 2 - ((jimp.measureText(burbank40_white, vbucksprice) + 10 + 50) / 2) + jimp.measureText(burbank40_white, vbucksprice) + 10, 5 + border + jimp.measureTextHeight(burbank40_white, theItem.DisplayName ? theItem.DisplayName.string.toUpperCase() : "?"));
                                                }
                                                graphics.composite(naming, 5, 5 + 512 - 128);
                                                
                                                if(image.featured && theItem.export_type == "AthenaItemWrapDefinition") {
                                                    var unFeaturedImage = (await fortniteAPI.getImage(theItem, false)).path;
                                                    var unFeaturedBuffer = await fortniteAPI.extractAssetAndGetTexture(unFeaturedImage);
                                                    var unFeaturedImg = await jimp.read(unFeaturedBuffer);
                                                    unFeaturedImg.resize(128, 128);
                                                    graphics.composite(unFeaturedImg, graphics.bitmap.width - 128, graphics.bitmap.height - naming.bitmap.height - 128);
                                                }
                                                //Check if Animated or Something else
                                                if(theItem.GameplayTags) {
                                                    if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Animated")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Animated-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasUpgradeQuests")).length > 0 && theItem.export_type != "AthenaPetCarrierItemDefinition") {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Quests-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasUpgradeQuests")).length > 0 && theItem.export_type == "AthenaPetCarrierItemDefinition") {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Pets-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasVariants")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Variant-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Reactive")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Adaptive-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Traversal")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Traversal-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    }
                                                }
                                                //Get Buffer and return
                                                graphics.getBufferAsync(jimp.MIME_PNG).then((buffer) => {
                                                    resolve(buffer);
                                                });
                                            })
                                        });
                                    });
                                });
                            });
                        });
                    }
                });
            });
        });
    }).catch(err => {
        console.log(err);
    });
}


fortniteAPI.createGiantCosmeticIcon = async (id, featured) => {
    return new Promise(async (resolve, reject) => {
        var idArgs = id.split(":");
        //fortniteAPI.extractAssetAndGetJson(idArgs[0] == "BannerToken" ? "Athena/Items/BannerToken/" + idArgs[1] : "Athena/Items/Cosmetics/" + directory + "/" + idArgs[1]).then(json => {
        //fortniteAPI.extractAssetsAndGetJsonsRegEx(new RegExp("Athena\/Items\/Cosmetics\/.*" + idArgs[1] + "\.", "i")).then(json => {
        fortniteAPI.extractAssetAndGetJson(idArgs[1]).then(json => {
            var cosmeticJsons = json.filter(jsn => jsn.export_type.includes("Athena") && jsn.export_type.includes("Item") && jsn.export_type.includes("Definition"));
            var theItem = cosmeticJsons.length > 0 ? cosmeticJsons[0] : {};

            /*var itemBackgroundPath;
            switch (theItem.Rarity)
            {
                case "EFortRarity::Transcendent":
                case "EFortRarity::Mythic":
                case "EFortRarity::Legendary":
                    itemBackgroundPath = "./largeBackgrounds/legendary.png";
                    break;
                case "EFortRarity::Epic":
                case "EFortRarity::Quality":
                    itemBackgroundPath = "./largeBackgrounds/epic.png";
                    break;
                case "EFortRarity::Rare":
                    itemBackgroundPath = "./largeBackgrounds/rare.png";
                    break;
                case "EFortRarity::Common":
                    itemBackgroundPath = "./largeBackgrounds/common.png";
                    break;
                default:
                    itemBackgroundPath = "./largeBackgrounds/uncommon.png";
                    break;
            }*/
            fortniteAPI.getBackgroundBufferFromItem(theItem, 1920, 1080).then(itemBackgroundPath => {
                jimp.read(itemBackgroundPath, (err, graphics) => {
                    if(err) {
                        console.error(err);
                    } else {
                        fortniteAPI.getImage(theItem, featured).then(image => {
                            var imagePath = image.path;
                            if(theItem.export_type == "AthenaLoadingScreenItemDefinition") imagePath = theItem.BackgroundImage.asset_path_name.substr(6).split(".")[0];
                            fortniteAPI.extractAssetAndGetTexture(imagePath).then(buffer => {
                                jimp.read(buffer).then((img) => {
                                    graphics.composite(img, (graphics.bitmap.width / 2) - (img.bitmap.width / 2), (graphics.bitmap.height / 2) - (img.bitmap.height / 2));
                                    new jimp(1920, 128, '#00000055', (err, naming) => {
                                        jimp.loadFont("./fonts/BurbankBigCondensed_40_white.fnt").then(burbank40_white => {
                                            jimp.loadFont("./fonts/BurbankBigCondensed_80_white.fnt").then(async burbank80_white => {
                                                var border = 5;
                                                naming.print(
                                                    burbank80_white,
                                                    5 + border,
                                                    5 + border,
                                                    {
                                                        text: theItem.DisplayName ? theItem.DisplayName.string.toUpperCase() : "?",
                                                        alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
                                                        alignmentY: jimp.VERTICAL_ALIGN_TOP
                                                    },
                                                    naming.bitmap.width - border,
                                                    naming.bitmap.height - border * 2
                                                );
                                                graphics.composite(naming, 0, 0 + graphics.bitmap.height - 128);
                                               
                                                if(image.featured && theItem.export_type == "AthenaItemWrapDefinition") {
                                                    var unFeaturedImage = (await fortniteAPI.getImage(theItem, false)).path;
                                                    var unFeaturedBuffer = await fortniteAPI.extractAssetAndGetTexture(unFeaturedImage);
                                                    var unFeaturedImg = await jimp.read(unFeaturedBuffer);
                                                    unFeaturedImg.resize(128, 128);
                                                    graphics.composite(unFeaturedImg, graphics.bitmap.width - 128, graphics.bitmap.height - naming.bitmap.height - 128);
                                                }
                                                //Check if Animated or Something else
                                                if(theItem.GameplayTags) {
                                                    if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Animated")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Animated-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasUpgradeQuests")).length > 0 && theItem.export_type != "AthenaPetCarrierItemDefinition") {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Quests-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasUpgradeQuests")).length > 0 && theItem.export_type == "AthenaPetCarrierItemDefinition") {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Pets-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("HasVariants")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Variant-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Reactive")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Adaptive-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    } else if(theItem.GameplayTags.gameplay_tags.filter(s => s.includes("Traversal")).length > 0) {
                                                        var unFeaturedImg = await jimp.read("./ItemsThings/T-Icon-Traversal-64.png");
                                                        unFeaturedImg.resize(32, 32);
                                                        graphics.composite(unFeaturedImg, 5, 5);
                                                    }
                                                }
                                                //Get Buffer and return
                                                graphics.getBufferAsync(jimp.MIME_PNG).then((buffer) => {
                                                    resolve(buffer);
                                                });
                                            })
                                        });
                                    });
                                });
                            });
                        });
                    }
                });
            });
        });
    }).catch(err => {
        console.log(err);
    });
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
}

function gameFilesRGBtoNormal(color) {
    return {
        r: Math.round(color.r * 255),
        g: Math.round(color.g * 255),
        b: Math.round(color.b * 255),
    }
}

function rgbToString(color) {
    return color.r + ", " + color.g + ", " + color.b;
}

function rgbToInt(rgb) {
    return rgb.r << 16 | rgb.g << 8 | rgb.b;
};

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}
  
function rgbToHex(rgb) {
    return "#" + componentToHex(rgb.r) + componentToHex(rgb.g) + componentToHex(rgb.b);
}

function shadeColor(color, percent) {

    R = parseInt(color.r * percent);
    G = parseInt(color.g * percent);
    B = parseInt(color.b * percent);

    R = (R<255)?R:255;
    G = (G<255)?G:255;
    B = (B<255)?B:255;

    return {r: R, g: G, b: B};
}

fortniteAPI.getBackgroundFromSeries = (series, width, height) => {
    return new Promise(async (resolve, reject) => {
        if(!width) width = 522;
        if(!height) height = 522;
        fortniteAPI.extractAssetAndGetJson(series).then((jsons) => {
            if(jsons.length > 0) {
                var json = jsons[0];

            
                var color1 = gameFilesRGBtoNormal(json.Colors.Color1);
                var color2 = gameFilesRGBtoNormal(json.Colors.Color2);
                var color3 = gameFilesRGBtoNormal(json.Colors.Color3);
                var color4 = gameFilesRGBtoNormal(json.Colors.Color4);
                var color5 = gameFilesRGBtoNormal(json.Colors.Color5);
                fortniteAPI.getBackgroundBufferFromColors(rgbToString(color2), rgbToString(color3), rgbToString(color2), width, height).then(buffer => {
                    if(json.BackgroundTexture) {
                        jimp.read(buffer).then(background => {
                            fortniteAPI.extractAssetAndGetTexture(json.BackgroundTexture.asset_path_name.split(".")[0].substr(5)).then(imgBuff => {
                                jimp.read(imgBuff).then(img => {
                                    img.opacity(0.6);
                                    var width = 512;
                                    width = Math.max(background.bitmap.width, background.bitmap.height);
                                    img.resize(width, width);
                                    background.composite(img, (background.bitmap.width / 2) - (img.bitmap.width / 2), (background.bitmap.height / 2) - (img.bitmap.height / 2))

                                    background.getBuffer(jimp.MIME_PNG, (err, buffer) => {
                                        resolve(buffer);
                                    });
                                });
                            });
                        });
                    } else {
                        resolve(buffer);
                    }
                });
            } else {
                resolve(Buffer.alloc(5));
            }
        });
    }).catch((err) => {
        console.log(err);
    });
}
  

fortniteAPI.getBackgroundBufferFromItem = (theItem, width, height) => {
    return new Promise(async (resolve, reject) => {
        if(!width) width = 522;
        if(!height) height = 522;
        if(theItem.Series && assets.filter(asset => asset.GameFilePath.includes("Athena/Items/Cosmetics/Series/" + theItem.Series)).length > 0) {
            fortniteAPI.getBackgroundFromSeries("Athena/Items/Cosmetics/Series/" + theItem.Series, width, height).then(buffer => {
                resolve(buffer);
            })
        } else {
            switch(theItem.Rarity) {
                case "EFortRarity::Transcendent":
                    fortniteAPI.getBackgroundBufferFromColors("213, 25, 68", "134, 7, 45", "255, 63, 88", width, height).then(buffer => {
                        resolve(buffer);
                    });
                    break;
                case "EFortRarity::Mythic":
                    return fortniteAPI.getBackgroundBufferFromColors("186, 156, 54", "115, 88, 26", "238, 217, 81", width, height).then(buffer => {
                        resolve(buffer);
                    });
                    break;
                case "EFortRarity::Legendary":
                    return fortniteAPI.getBackgroundBufferFromColors("192, 106, 56", "115, 51, 26", "236, 150, 80", width, height).then(buffer => {
                        resolve(buffer);
                    });
                    break;
                case "EFortRarity::Epic":
                case "EFortRarity::Quality":
                    return fortniteAPI.getBackgroundBufferFromColors("129, 56, 194", "66, 26, 115", "178, 81, 237", width, height).then(buffer => {
                        resolve(buffer);
                    });
                    break;
                case "EFortRarity::Rare":
                    return fortniteAPI.getBackgroundBufferFromColors("54, 105, 187", "26, 68, 115", "81, 128, 238", width, height).then(buffer => {
                        resolve(buffer);
                    });
                    break;
                case "EFortRarity::Common":
                    return fortniteAPI.getBackgroundBufferFromColors("109, 109, 109", "70, 70, 70", "158, 158, 158", width, height).then(buffer => {
                        resolve(buffer);
                    });
                    break;
                default:
                    return fortniteAPI.getBackgroundBufferFromColors("94, 188, 54", "60, 115, 26", "116, 239, 82", width, height).then(buffer => {
                        resolve(buffer);
                    });
                    break;
            }
        }
    }).catch(err => {
        console.log(err);
    });
}

fortniteAPI.getBackgroundBufferFromColors = (innerColor, outerColor, borderColor, width, height) => {
    return new Promise(async (resolve, reject) => {
        if(!width) width = 522;
        if(!height) height = 522;
        svg2img(
        '<svg id="svg" width="' + width + '" height="' + height + '">'
        + '<defs><radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">'
        + '<stop offset="0%" style="stop-color:rgb(' + innerColor + ');" />'
        + '<stop offset="100%" style="stop-color:rgb(' + outerColor + ');" />'
        + '</radialGradient></defs>'
        + '<ellipse cx="' + (width / 2) + '" cy="' + (width / 2) + '" rx="' + ((Math.max(width, height) / 4) * Math.PI) + '" ry="' + ((Math.max(width, height) / 4) * Math.PI) + '" fill="url(#grad1)" />'
        + '<rect width="' + width + '" height="' + height + '" fill="none" stroke-width="10" stroke="rgb(' + borderColor + ')" />'
        + '</svg>', (err, buffer) => {
            resolve(buffer);
        });
    }).catch(err => {
        console.log(err);
    })
}

fortniteAPI.getImage = (theItem, featured) => {
    return new Promise(async (resolve, reject) => {
        if(theItem.DisplayAssetPath != null && featured) {
            fortniteAPI.extractAssetAndGetJson(theItem.DisplayAssetPath.asset_path_name.split(".")[0].substr(6)).then(jsons => {
                var json = jsons[0];
                var response = assets.filter(f => f.GameFilePath.toLowerCase().includes("/" + json.DetailsImage.ResourceObject.toLowerCase() + "."))[0].GameFilePath.split(".")[0];
                resolve({path: response, featured: true});
            });
        } else if(theItem.HeroDefinition != null) {
            fortniteAPI.extractAssetAndGetJson(theItem.HeroDefinition).then(json => {
                resolve({path: (json[0].LargePreviewImage || json[0].SmallPreviewImage).asset_path_name.split(".")[0].substr(6), featured: false});
            });
        } else if(theItem.WeaponDefinition != null) {
            fortniteAPI.extractAssetAndGetJson(theItem.WeaponDefinition).then(json => {
                resolve({path: (json[0].LargePreviewImage || json[0].SmallPreviewImage).asset_path_name.split(".")[0].substr(6), featured: true});
            });
        } else if(theItem.LargePreviewImage != null) {
            resolve({path: theItem.LargePreviewImage.asset_path_name.split(".")[0].substr(6), featured: false});
        } else if(theItem.SmallPreviewImage != null) {
            resolve({path: theItem.SmallPreviewImage.asset_path_name.split(".")[0].substr(6), featured: false});
        } else {
            resolve({path: "T_Placeholder_Generic.", featured: false});
        }
    }).catch(err => {
        console.log(err);
    });
}

fortniteAPI.extractAssetAndGetAudio = async (path) => {
    return new Promise(async (resolve, reject) => {
        fortniteAPI.extractAssetAndGetJson(path).then(jsons => {
            if(jsons[0].export_type == "SoundWave") {
                fortniteAPI.extractAsset(path).then(response => {
                    if(response) {
                        var uexpBuffer = fs.readFileSync(response.extractedPath + ".uexp");
                        var uexpBufferFrom = uexpBuffer.indexOf("4F676753", 0, "hex");
                        var uexpBufferTo = uexpBuffer.indexOf("000004000000040001000000010500000000040000000400", 0, "hex");
                        var tempBuffer1 = uexpBuffer.slice(uexpBufferFrom, uexpBufferTo);

                        var tempBuffer2;
                        if(fs.existsSync(response.extractedPath + ".ubulk")) {
                            var ubulkBuffer = fs.readFileSync(response.extractedPath + ".ubulk");
                            tempBuffer2 = Buffer.concat([tempBuffer1, ubulkBuffer]);
                        } else {
                            tempBuffer2 = tempBuffer1;
                        }

                        var i = tempBuffer2.length - 1;
                        while (tempBuffer2[i] == 0)
                        {
                            i--;
                        }
                        var buffer = tempBuffer2.slice(0, i);
                        resolve(buffer);
                    } else {
                        resolve({});
                    }
                }).catch(err => console.log(err));
            } else if(jsons.filter(json => json.export_type == "SoundNodeWavePlayer").length > 0) {
                fortniteAPI.extractAssetAndGetAudio(jsons.filter(json => json.export_type == "SoundNodeWavePlayer")[0].SoundWaveAssetPtr.asset_path_name.substr(6).split(".")[0]).then(audio => {
                    resolve(audio);
                });
            } else {
                resolve({});
            }
        }).catch(err => console.log(err));
    }).catch(err => console.log(err));
}

fortniteAPI.extractAssetAndGetTexture = async (path) => {
    return new Promise(async (resolve, reject) => {
        var path2;
        fortniteAPI.extractAssetAndGetJson(path).then(jsons => {
            var json = jsons[0] ? jsons[0] : {};
            if(json.export_type == "Texture2D") {
                path2 = path;
            } else if(json.export_type == "MaterialInstanceConstant") {
                
                path2 = (json["TextureParameterValues"].filter(tpv => tpv.ParameterInfo.Name == "Item Render").length > 0) ? json["TextureParameterValues"].filter(tpv => tpv.ParameterInfo.Name == "Item Render")[0].ParameterValue : json["TextureParameterValues"][0].ParameterValue;
            }
            fortniteAPI.extractAsset(path2).then(response => {
                if(response) {
                    let package = new nodeWick.Package(response.extractedPath);
                    var asset = package.get_texture();
                    resolve(asset);
                } else {
                    resolve(Buffer.alloc(5));
                }
            }).catch(err => console.log(err));
        });
    }).catch(err => console.log(err));
}

fortniteAPI.extractAssetAndGetJson = async (path) => {
    return new Promise(async (resolve, reject) => {
        fortniteAPI.extractAsset(path).then(response => {
            if(response) {
                var asset = [];
                try {
                    let package = new nodeWick.Package(response.extractedPath);
                    asset = package.get_data();
                    //asset = nodeWick.read_asset(pathModule.join(__dirname, "../../" + response.extractedPath));
                } catch(Exception) {
                }
                resolve(asset);
            } else {
                resolve([]);
            }
        }).catch(err => console.log(err));
    }).catch(err => console.log(err));
}

fortniteAPI.getPlaylistJsonByName = async (name) => {
    return new Promise(async (resolve, reject) => {
        fortniteAPI.extractAssetsAndGetJsonsRegEx(/athena\/playlists\/.*playlist_/).then(response => {
            fortniteAPI.getPlaylistImages().then(playlistimages => {
                if(response) {
                    response.forEach(item => {
                        if(item.PlaylistName == name) {
                            var information = playlistimages.filter(i => i.playlist_name == name)[0];
                            var imageurl;
                            if(information) {
                                imageurl = information.image;
                            } else {
                                imageurl = "No Image found";
                            }
                            item.imageurl = imageurl;
                            resolve(item);
                        }
                    })
                    resolve([]);
                } else {
                    resolve([]);
                }
            });
        }).catch(err => console.log(err));
    }).catch(err => console.log(err));
}

fortniteAPI.extractAssetsAndGetJsons = async (path) => {
    return new Promise(async (resolve, reject) => {
        fortniteAPI.extractAsset(path, true).then(response => {
            if(response) {
                var assets = [];
                response.forEach(res => {
                    try {
                        let package = new nodeWick.Package(res.extractedPath);
                        assets = assets.concat(package.get_data());
                        //assets = assets.concat(nodeWick.read_asset(pathModule.join(__dirname, "../../" + res.extractedPath)));
                    } catch(Exception) {}
                })
                resolve(assets);
            } else {
                resolve([]);
            }
        }).catch(err => console.log(err));
    }).catch(err => console.log(err));
}

fortniteAPI.extractAssetsAndGetJsonsRegEx = async (regEx) => {
    return new Promise(async (resolve, reject) => {
        fortniteAPI.extractAssetRegEx(regEx, true).then(response => {
            if(response) {
                var assets = [];
                response.forEach(res => {
                    try {
                        let package = new nodeWick.Package(res.extractedPath);
                        assets = assets.concat(package.get_data());
                        /*assets = assets.concat(
                            nodeWick.read_asset(
                                pathModule.join(__dirname, "../../" + res.extractedPath)));*/
                    } catch(Exception) {
                        //console.log(Exception);
                    }
                })
                resolve(assets);
            } else {
                resolve([]);
            }
        }).catch(err => console.log(err));
    }).catch(err => console.log(err));
}

fortniteAPI.extractAsset = async (path, multiple) => {
    return new Promise(async (resolve, reject) => {
        var GameFiles = []
        if(path) {
            var possible = assets.filter(gameFile => gameFile.GameFilePath.toLowerCase().includes(path.toLowerCase()));
            possible = possible.slice(0, 50);
            await asyncForEach(possible, (gameFile) => {
                fs.mkdirSync(pathModule.dirname(extractPath + gameFile.GameFilePath), {
                    recursive: true
                });
                fs.writeFileSync(extractPath + gameFile.GameFilePath, gameFile.getFile());
                var parsed = pathModule.parse(extractPath + gameFile.GameFilePath);
                GameFiles.push({pakFile: gameFile.pakFile, GamfilesPath: gameFile.GameFilePath, getFile: () => gameFile.getFile(), extractedPath: parsed.root + parsed.dir + "/" + parsed.name});
            });
            
            resolve(multiple ? GameFiles : GameFiles[0]);
        } else {
            resolve();
        }
    }).catch(err => console.log(err));
}

fortniteAPI.extractAssetRegEx = async (regEx, multiple) => {
    return new Promise(async (resolve, reject) => {
        var GameFiles = [];
        await asyncForEach(assets.filter(gameFile => gameFile.GameFilePath.toLowerCase().match(regEx)), (gameFile) => {
            fs.mkdirSync(pathModule.dirname(extractPath + gameFile.GameFilePath), {
                recursive: true
            });
            fs.writeFileSync(extractPath + gameFile.GameFilePath, gameFile.getFile());
            var parsed = pathModule.parse(extractPath + gameFile.GameFilePath);
            GameFiles.push({pakFile: gameFile.pakFile, GamfilesPath: gameFile.GameFilePath, getFile: () =>gameFile.getFile(), extractedPath: parsed.root + parsed.dir + "/" + parsed.name});
        });
        
        resolve(multiple ? GameFiles : GameFiles[0]);
    }).catch(err => console.log(err));
}

fortniteAPI.updateAssets = () => {
    return new Promise(async (resolve, reject) => {
		fortniteAPI.getAesKeys().then((keys) => {
			aesKeys = keys;
			fs.readdir(pakPath, async (err, files) => {
				if(err) {
					console.error(err);
				} else {
                    var GameFiles = [];
                    var replace = true;

					await asyncForEach(files, async (pakFile) => {
						if(pathModule.parse("" + pakFile).ext == ".pak") {
							var pakFilePath = pathModule.join(pakPath + pakFile);
							var aesKey = await fortniteAPI.getKeyForPak(pakFilePath)
							if(aesKey == "error") {

							} else {
                                try {
                                    let extractor = new nodeWick.PakExtractor(pakFilePath, aesKey);
                                    await asyncForEach(extractor.get_file_list(), (f, idx, arr) => {
                                        GameFiles.push(
                                            {
                                                pakFile: pakFile,
                                                GameFilePath: extractor.get_mount_point().substr(9) + f,
                                                aesKey: aesKey,
                                                getFile: () => {
                                                    return extractor.get_file(idx);
                                                }
                                            }
                                        );
                                    });
                                } catch(Exception) {
                                    console.log("Can't load pak File: " + pakFilePath + " with key " + aesKey);
                                    console.log(Exception);
                                    replace = false;
                                }
							} 
						}
                    });
					if(replace) assets = GameFiles;
					resolve();
				}
			});
		});
    }).catch(err => console.log(err));
}

fortniteAPI.getMainAesKey = async () => {
    return new Promise(async (resolve, reject) => {
        resolve(fs.readFileSync("aesKey.txt", {encoding: "ascii"}));
        /*request("http://benbotfn.tk:8080/api/aes", (err, response, data) => {
            try {
                var json = JSON.parse(data);
                resolve(json.mainKey);
            } catch(Exception) {
                console.log("Error while trying to get http://benbotfn.tk:8080/api/aes");
                resolve();
            }
        });*/
    }).catch(err => {
        console.log(err);
        resolve();
    });
}


fortniteAPI.getAesKeys = async () => {
    return new Promise((resolve, reject) => {
        this.DUO;
        fortniteAPI.getKeyChain().then((keyChain) => {
            var dir = fs.readdirSync(pakPath);
            var jsonArr = [];
            fortniteAPI.getMainAesKey().then(mainKey => {
                jsonArr.push({type: "mainKey", aesKey: mainKey})
            });
            dir.filter(d => {
                var args = d.split(".");
                return args[args.length - 1] == "pak";
            }).forEach(f => {
                var pakGuid = fortniteAPI.getGUIDByPak(pakPath + f);
                keyChain.forEach(k => {
                    var parts = k.split(':');
                    var keychainguid = fortniteAPI.getGuidByKeychain(parts[0]);
                    if(keychainguid == pakGuid) {
                        var aesKey = "0x" + Buffer.from(parts[1], 'base64').toString("hex");
                        jsonArr.push({
                            pakFile: f,
                            pakFileGuid: pakGuid,
                            aesKey,
                            aesKeyAsHex: Buffer.from(parts[1], 'base64').toString("hex"),
                            itemID: parts[2]
                        });
                    }
                });
            });

            resolve(jsonArr);
        });
    }).catch(err => {
        console.log(err);
    });
}

fortniteAPI.getGuidByKeychain = (id) => {
    var guid = "";
    var parts = id.match(/.{1,8}/g);
    parts.forEach((p, index) => {
        if(index < parts.length - 1) {
            guid += parseInt(p, 16) + "-";
        } else {
            guid += parseInt(p, 16);
        }
    });
    return guid;
}

fortniteAPI.getGUIDByPak = (path) => {
    var fd = fs.openSync(path, 'r');
    var g1;
    {
        var size = fs.statSync(path).size;
        var buffer = new Buffer.alloc(61 + 160);
        fs.readSync(fd, buffer, 0, 61 + 160, size - 61 - 160);
        g1 = buffer.readUInt32LE();
    }
    var g2;
    {
        var size = fs.statSync(path).size;
        var buffer = new Buffer.alloc(57 + 160);
        fs.readSync(fd, buffer, 0, 57 + 160, size - 57 - 160);
        g2 = buffer.readUInt32LE();
    }
    var g3;
    {
        var size = fs.statSync(path).size;
        var buffer = new Buffer.alloc(53 + 160);
        fs.readSync(fd, buffer, 0, 53 + 160, size - 53 - 160);
        g3 = buffer.readUInt32LE();
    }
    var g4;
    {
        var size = fs.statSync(path).size;
        var buffer = new Buffer.alloc(49 + 160);
        fs.readSync(fd, buffer, 0, 49 + 160, size - 49 - 160);
        g4 = buffer.readUInt32LE();
    }
    fs.closeSync(fd);
    return g1 + "-" + g2 + "-" + g3 + "-" + g4;
}

module.exports = fortniteAPI;