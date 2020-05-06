const apiRouter = require('express').Router();
const apiImageRouter = require('express').Router();
const apiStatsRouter = require('express').Router();
const apiFilesRouter = require('express').Router();
const apiEMSRouter = require('express').Router();
const fs = require("fs");
const stream = require("stream");
const streamifier = require('streamifier');

const config = require("../../config.json");

let fortniteApi = require("../fortniteApi/fortniteapi.js");

apiRouter.use((req, res, next) => {
    res.sendJson = (arg) => {
        res.header("Content-Type",'application/json');
        res.send(req.query.beautify ? JSON.stringify(arg, null, 4) : arg);
    }
    next();
});

apiRouter.use("/imageGen/", apiImageRouter);
apiRouter.use("/stats/", apiStatsRouter);
apiRouter.use("/files/", apiFilesRouter);
apiRouter.use("/ems/", apiEMSRouter);

apiRouter.get("/blogPosts", (req, res) => {
    fortniteApi.getBlogPosts(req.query.lang, req.query.category).then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiRouter.get("/store", (req, res) => {
    fortniteApi.getStore().then(response => {
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});
apiRouter.get("/aesKeys", (req, res) => {
    fortniteApi.getAesKeys().then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiRouter.get("/news", (req, res) => {
    fortniteApi.getFortniteNews().then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiRouter.get("/keychain", (req, res) => {
    fortniteApi.getKeyChain().then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiRouter.get("/fortniteStatus", (req, res) => {
    fortniteApi.checkFortniteStatus().then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiRouter.get("/eventFlags", (req, res) => {
    fortniteApi.eventFlags().then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiRouter.get("/LTMInformation", (req, res) => {
    fortniteApi.getLTMInformations().then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiEMSRouter.get("/getCloudStorage", (req, res) => {
    fortniteApi.getCloudStorage(req.query.uniqueFilename).then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
})

apiFilesRouter.get("/allCosmetics", (req, res) => {
    res.sendJson(fortniteApi.getAssets().filter(file => file.GameFilePath.includes("Athena/Items/Cosmetics") && file.GameFilePath.includes(".uasset")).map(asset => {
        var split = asset.GameFilePath.split("/");
        return split[split.length-1].split(".")[0];
    }).sort());
});

apiFilesRouter.get("/allIniFiles", (req, res) => {
    fortniteApi.extractAsset(".ini", true).then(response => {
        res.header("Content-Type",'application/json');
        var ret = response.map(file => file.getFile().toString());
        res.sendJson(ret);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiFilesRouter.get("/Json", (req, res) => {
    fortniteApi.extractAssetAndGetJson(req.query.path).then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiFilesRouter.get("/fileContent", (req, res) => {
    fortniteApi.extractAsset(req.query.path).then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response ? response.getFile().toString() : "");
    }).catch(err => {
        res.sendJson(err);
    });
});

apiFilesRouter.get("/getAudio", (req, res) => {
    fortniteApi.extractAssetAndGetAudio(req.query.path).then(response => {
        res.header("Content-Type",'audio/ogg');
        res.send(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiFilesRouter.get("/getImage", (req, res) => {
    fortniteApi.extractAssetAndGetTexture(req.query.path).then(response => {
        res.header("Content-Type",'image/png');
        res.send(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiFilesRouter.get("/getPlaylist", (req, res) => {
    fortniteApi.getPlaylistJsonByName(req.query.playlistname).then(response => {
        res.sendJson(response);
    });
});

apiImageRouter.get("/giantCosmeticIcon", (req, res) => {
    fortniteApi.createGiantCosmeticIcon(":" + req.query.cosmeticid, req.query.featured, req.query.vbucksprice).then(response => {
        res.header("Content-Type",'image/png');
        res.setHeader('Content-disposition', 'filename=' + req.query.cosmeticid + '.png');
        res.send(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiImageRouter.get("/series", (req, res) => {
    fortniteApi.getBackgroundFromSeries("Athena/Items/Cosmetics/Series/" + req.query.series).then(response => {
        res.header("Content-Type",'image/png');
        res.setHeader('Content-disposition', 'filename=' + req.query.series + '.png');
        res.send(response);
    });
});
apiImageRouter.get("/cosmeticIconWithDescription", (req, res) => {
    fortniteApi.createCosmeticIconWithDescription(":" + req.query.cosmeticid, req.query.featured).then(response => {
        res.header("Content-Type",'image/png');
        res.setHeader('Content-disposition', 'filename=' + req.query.cosmeticid + '.png');
        res.send(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiImageRouter.get("/cosmeticIcon", (req, res) => {
    fortniteApi.createCosmeticIcon(":" + req.query.cosmeticid, req.query.featured, req.query.vbucksprice).then(response => {
        res.header("Content-Type",'image/png');
        res.setHeader('Content-disposition', 'filename=' + req.query.cosmeticid + '.png');
        res.send(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiImageRouter.get("/shop", (req, res) => {
    //res.sendJSON({message: "Currently disabled"})
    fortniteApi.getShopIcon(req.query.lang).then(response => {
        res.header("Content-Type",'image/png');
        res.setHeader('Content-disposition', 'filename=shop.png');
        res.send(response);

        //res.send(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiImageRouter.get("/news", (req, res) => {
    fortniteApi.getNewsIcon().then(response => {
        res.header("Content-Type",'image/png');
        res.setHeader('Content-disposition', 'filename=news.png');
        res.send(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiStatsRouter.get("/BRStatsByUsername", (req, res) => {
    fortniteApi.getStatsBR(req.query.username, req.query.platform, req.query.timeWindow).then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiStatsRouter.get("/BRStatsV2ByUsername", (req, res) => {
    fortniteApi.getStatsBRV2(req.query.username).then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
});

apiStatsRouter.get("/lookup", (req, res) => {
    fortniteApi.lookup(req.query.username).then(response => {
        res.header("Content-Type",'application/json');
        res.sendJson(response);
    }).catch(err => {
        res.sendJson(err);
    });
})

apiRouter.use((req, res) => {
    res.send({
        message: "No api endpoint named " + req.url + " found",
    });
});

module.exports = apiRouter;