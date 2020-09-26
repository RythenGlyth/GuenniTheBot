const axios = require("axios");
const request = require("request");
const qs = require("qs");
const fs = require("fs");
const crypto = require('crypto');

const EndPoints = require("./tools/endpoints");
const Stats = require("./tools/stats");
const endpoints = require("./tools/endpoints");

const IOS_TOKEN = 'MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE=';
const LAUNCHER_TOKEN = 'MzRhMDJjZjhmNDQxNGUyOWIxNTkyMTg3NmRhMzZmOWE6ZGFhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y=';

class FortniteApi {
    constructor(credentials) {
        if (credentials && credentials.constructor === Array && credentials.length == 4) {
            this.credentials = credentials;
            this.SOLO = "_p2";
            this.DUO = "_p10";
            this.SQUAD = "_p9";
        } else {
            throw new Error(
                "Please give credentials [Email, Password, Client Launcher Token, Client Fortnite Token]"
            );
        }
    }

    checkToken() {
        let actualDate = new Date();
        let expireDate = new Date(new Date(this.expires_at).getTime() - 15 * 60000);
        if (this.access_token && this.expires_at && expireDate < actualDate) {
            this.expires_at = undefined;
            //Refresh Token
            this.refreshToken();
        }
    }

    refreshToken() {
        if(this.refresh_expires_at < new Date()) {
            axios({
                url: EndPoints.OAUTH_TOKEN,
                headers: {
                    Authorization: "basic " + this.credentials[3]
                },
                data: qs.stringify({
                    grant_type: "refresh_token",
                    refresh_token: this.refresh_token,
                    includePerms: true
                }),
                method: "POST",
                responseType: "json"
            }).then((data) => {
                this.expires_at = data.expires_at;
                this.access_token = data.access_token;
                this.refresh_token = data.refresh_token;
                this.account_id = data.account_id;
            }).catch(() => {
                throw new Error("Error: Fatal Error Impossible to Renew Token");
            });
        } else {
            this.login();
        }
    }

    setCookiesToObj(cookies) {
        return cookies.map(v => v.split(";").shift().split("=")).reduce((acc, v) => {
            acc[v[0]] = v[1];
            return acc;
        }, {});
    }

    //Login to Epic Games API
    login() {
        return new Promise((resolve, reject) => {
            /*var jar = request.jar();
            request({
                url: EndPoints.EPIC_REPUTATION,
                jar,
                headers: {
                  'User-Agent': EndPoints.USER_AGENT,
                },
                json: true,
            }, (err, res) => {
                request({
                    url: EndPoints.EPIC_CSRF,
                    method: "GET",
                    jar,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'User-Agent': EndPoints.USER_AGENT,
                    }
                }, (err, res) => {
                    var cookiesObj = this.setCookiesToObj(res.headers["set-cookie"]);
                    console.log(cookiesObj["XSRF-TOKEN"]);
                    
                    request({
                        url: EndPoints.EPIC_LOGIN,
                        method: "POST",
                        headers: {
                            "x-xsrf-token": cookiesObj["XSRF-TOKEN"],
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'User-Agent': EndPoints.USER_AGENT,
                        },
                        form: qs.stringify({
                            email: this.credentials[0],
                            password: this.credentials[1],
                            captcha: "",
                            rememberMe: false
                        }),
                        jar
                    }, (err, res) => {
                        console.log(res);
                        request({
                            url: EndPoints.EPIC_EXCHANGE,
                            method: "GET",
                            headers: {
                                "x-xsrf-token": cookiesObj["XSRF-TOKEN"],
                                'User-Agent': EndPoints.USER_AGENT,
                            },
                            jar
                        }, (err, res) => {
                            var accessJson = JSON.parse(res.body);
                            request({
                                url: EndPoints.OAUTH_TOKEN,
                                headers: {
                                    "Authorization": "basic " + this.credentials[3],
                                    "Content-Type": "application/x-www-form-urlencoded",
                                    'User-Agent': EndPoints.USER_AGENT,
                                },
                                form: qs.stringify({
                                    grant_type: "exchange_code",
                                    exchange_code: accessJson.code,
                                    includePerms: true
                                }),
                                method: "POST"
                            }, (err, res) => {
                                var json = JSON.parse(res.body);
                                console.log(json);
                                this.expires_at = json.expires_at;
                                this.access_token = json.access_token;
                                this.refresh_token = json.refresh_token;
                                this.refresh_expires_at = json.refresh_expires_at;
                                this.account_id = json.account_id;
                                this.intervalCheckToken = setInterval(() => {
                                    this.checkToken();
                                }, 1000);
                                //resolve(this.expires_at);
    
                                
                            });
                        });
                    });
                });
            });*/
            axios({
                url: EndPoints.OAUTH_TOKEN,
                headers: this.getHeaders(this.credentials[2]),
                /*{
                    "User-Agent": "game=UELauncher, engine=UE4, build=7.14.2-4231683+++Portal+Release-Live",
                    "Authorization": "basic " + this.credentials[2],
                    "Content-Type": "application/x-www-form-urlencoded"
                },*/
                data: qs.stringify({
                    token_type: 'eg1',
                    grant_type: "password",
                    username: this.credentials[0],
                    password: this.credentials[1],
                    includePerms: false
                }),
                method: "POST"
            }).then(res => {
                this.access_token = res.data.access_token;
                axios({
                    url: EndPoints.OAUTH_EXCHANGE,
                    headers: this.getHeaders(this.access_token, false),
                    
                    /*{
                        Authorization: "bearer " + this.access_token
                    },*/
                    method: "GET"
                }).then(res => {
                    this.access_code = res.data.code;
                    axios({
                        url: EndPoints.OAUTH_TOKEN,
                        headers: this.getHeaders(this.credentials[3], true),
                        /*{
                            Authorization: "basic " + this.credentials[3]
                        },*/
                        data: qs.stringify({
                            grant_type: "exchange_code",
                            exchange_code: this.access_code,
                            includePerms: false,
                            token_type: "eg1"
                        }),
                        method: "POST"
                    }).then(res => {
                        this.expires_at = res.data.expires_at;
                        this.access_token = res.data.access_token;
                        this.refresh_token = res.data.refresh_token;
                        this.refresh_expires_at = res.data.refresh_expires_at;
                        this.account_id = res.data.account_id;
                        this.intervalCheckToken = setInterval(() => {
                            this.checkToken();
                        }, 1000);
                        resolve(this.expires_at);
                    }).catch(err => {
                        reject({
                            message: "Please enter good credentials (Fortnite Client Token)",
                            err
                        });
                    });
                }).catch(err => {
                    reject({
                        message: "Please enter good credentials (Login/Username/Launcher Token)",
                        err
                    });
                });
            }).catch(err => {
                reject({
                    message: "Something wrong is happened, please try again.",
                    err
                });
            });
        }).catch(err => {
            console.log(err);
        });
    }

    getHeaders(token, basic = true) {
        return {
            "User-Agent": endpoints.USER_AGENT,
            "Authorization": basic == true ? "basic " + token : "bearer " + token,
            "Content-Type": "application/x-www-form-urlencoded",
            "EPIC_DEVICE": this.getRandomDeviceID(),
        };
    }

    getRandomDeviceID() {
        return (crypto.randomBytes(8).toString('hex') + "-" + crypto.randomBytes(4).toString('hex') + "-" + crypto.randomBytes(4).toString('hex') + "-" + crypto.randomBytes(4).toString('hex') + "-" + crypto.randomBytes(12).toString('hex'))
    }

    getRandomID() {
        return crypto.randomBytes(8).toString('hex');
    }

    getBlogPosts(lang, category) {
        return new Promise((resolve, reject) => {
            var locale;
            if(lang) {
                switch (lang.toLowerCase()) {
                    case "fr": // French
                        locale = "fr";
                        break;
                    case "de": // Deutsch
                        locale = "de";
                        break;
                    case "es": // Spanish
                        locale = "es";
                        break;
                    case "zh": // Chinese
                        locale = "zh";
                        break;
                    case "it": // Italian
                        locale = "it";
                        break;
                    case "ja": // Japanese
                        locale = "ja";
                        break;
                    case "en": // English
                        locale = "en";
                        break;
                    default: // Default: English
                        locale = "en";
                }
            }
            axios({
                url: EndPoints.blogPosts(locale, category),
                method: "GET",
                responseType: "json"
            }).then(res => {
                resolve(res.data);
            }).catch(err => {
                reject({
                    message: "Error",
                    err
                });
            });
        }).catch(err => {
            console.log(err);
        });
    }

    lookup(username) {
        return new Promise((resolve, reject) => {
            axios({
                url: EndPoints.lookup(username),
                headers: {
                    Authorization: "bearer " + this.access_token
                },
                method: "GET",
                responseType: "json"
            }).then(res => {
                resolve(res.data);
            }).catch(err => {
                reject({
                    message: "Impossible to found this user",
                    err
                });
            });
        }).catch(err => {
            console.log(err);
        });
    }

    lookupById(id) {
        return new Promise((resolve, reject) => {
            axios({
                url: EndPoints.displayNameFromId(id),
                headers: {
                    Authorization: "bearer " + this.access_token
                },
                method: "GET",
                responseType: "json"
            }).then(res => {
                resolve(res.data);
            }).catch(err => {
                reject({
                    message: "Impossible to found this user",
                    err
                });
            });
        }).catch(err => {
            console.log(err);
        });
    }

    lookupMe() {
        return this.lookupById(this.account_id);
    }

    //Check if Player exist on the platform
    checkPlayer(username, platform, timeWindow) {
        return new Promise((resolve, reject) => {
            if (!username || !platform) {
                reject({message: "Please precise username and platform"});
                return;
            }

            if (!(platform == "pc" || platform == "ps4" || platform == "xb1")) {
                reject({message: "Please precise a good platform: ps4/xb1/pc"});
                return;
            }

            this.lookup(username).then(data => {
                axios({
                    url: EndPoints.statsBR(data.id, timeWindow),
                    headers: {
                        Authorization: "bearer " + this.access_token
                    },
                    method: "GET",
                    responseType: "json"
                }).then(res => {
                    if (
                        res.data &&
                        Stats.checkPlatform(res.data, platform.toLowerCase() || "pc")
                    ) {
                        resolve(res.data);
                    } else {
                        reject({
                            message: "Impossible to fetch User. User not found on this platform"
                        });
                    }
                }).catch((err) => {
                    reject({
                        message: "Impossible to found stats for this user.", 
                        err
                    });
                });
            }).catch(() => {
                reject({
                    message: "Player Not Found"
                });
            });
        }).catch(err => {
            console.log(err);
        });
    }

    getStatsBRV2(username) {
        return new Promise((resolve, reject) => {
            if(username) {
                this.lookup(username).then(data => {
                    axios({
                        url: EndPoints.statsBRV2(data.id),
                        headers: {
                            Authorization: "bearer " + this.access_token
                        },
                        method: "GET",
                        responseType: "json"
                    }).then(res => {
                        if (res.data) {
                            resolve(res.data);
                        } else {
                            reject({
                                message: "Impossible to fetch User. User not found on this platform"
                            });
                        }
                    }).catch((err) => {
                        reject({
                            message: "Impossible to found stats for this user.", 
                            err
                        });
                    });
                });
            } else {
                resolve("User not found");
            }
        });
    }

    getStatsBR(username, platform, timeWindow) {
        return new Promise((resolve, reject) => {

            this.checkPlayer(username, platform, timeWindow).then((statsdata) => {
                this.lookup(username).then(lookupdata => {
                    const resultStats = Stats.convert(
                        statsdata,
                        lookupdata,
                        platform.toLowerCase()
                    );
                    resolve(resultStats);
                }).catch(() => {
                    reject({
                        message: "Player Not Found"
                    });
                });
            }).catch((err) => {
                console.log(err);
                reject(err);
            });
        });
    }

    getKeyChain() {
        return new Promise((resolve, reject) => {
            axios({
                url: EndPoints.KeyChain,
                headers: {
                    Authorization: "bearer " + this.access_token
                },
                method: "GET",
                responseType: "json"
            }).then((res) => {
                resolve(res.data);
            }).catch(err => {
                reject({
                    err
                });
            });
        }).catch(err => {
            console.log(err);
        });
    }

    getStatsBRFromID(id, platform, timeWindow) {
        return new Promise((resolve, reject) => {
            if (!id || !platform) {
                reject({
                    message: "Please precise username and platform"
                });
                return;
            }

            if (!(platform == "pc" || platform == "ps4" || platform == "xb1")) {
                reject({
                    message: "Please precise a good platform: ps4/xb1/pc"
                });
                return;
            }

            this.lookupById(id).then(data => {
                axios({
                    url: EndPoints.statsBR(data[0].id, timeWindow),
                    headers: {
                    Authorization: "bearer " + this.access_token
                    },
                    method: "GET",
                    responseType: "json"
                }).then(res => {
                    if (
                        res.data &&
                        Stats.checkPlatform(res.data, platform.toLowerCase() || "pc")
                    ) {
                        let resultStats = Stats.convert(
                            res.data,
                            data[0],
                            platform.toLowerCase()
                        );
                        resolve(resultStats);
                    } else {
                        reject({
                            message: "Impossible to fetch User. User not found on this platform"
                        });
                    }
                }).catch(err => {
                    reject({
                        message: "Player Not Found",
                        err
                    });
                });
            }).catch(err => {
                reject({
                    message: "Player Not Found",
                    err
                });
            });
        });
    }

    getMyStatsBR(platform, timeWindow) {
        return this.getStatsBRFromID(this.account_id, platform, timeWindow);
    }
    getPlaylistImages(lang = "") {
        return new Promise((resolve, reject) => {
            let headers = {};
            switch (lang.toLowerCase()) {
                case "fr": // French
                    headers["Accept-Language"] = "fr";
                    break;
                case "de": // Deutsch
                    headers["Accept-Language"] = "de";
                    break;
                case "es": // Spanish
                    headers["Accept-Language"] = "es";
                    break;
                case "zh": // Chinese
                    headers["Accept-Language"] = "zh";
                    break;
                case "it": // Italian
                    headers["Accept-Language"] = "it";
                    break;
                case "ja": // Japanese
                    headers["Accept-Language"] = "ja";
                    break;
                case "en": // English
                    headers["Accept-Language"] = "en";
                    break;
                default: // Default: English
                    headers["Accept-Language"] = "en";
            }

            axios({
                url: EndPoints.FortniteNews,
                method: "GET",
                headers: headers,
                responseType: "json"
            }).then(({data}) => {
                resolve(data.playlistinformation["playlist_info"].playlists);
            }).catch((err) => {
                reject({
                    message: "Impossible to fetch fortnite data",
                    err
                });
            });
        });
    }

    getFortniteNews(lang = "") {
        return new Promise((resolve, reject) => {
            let headers = {};
            switch (lang.toLowerCase()) {
                case "fr": // French
                    headers["Accept-Language"] = "fr";
                    break;
                case "de": // Deutsch
                    headers["Accept-Language"] = "de";
                    break;
                case "es": // Spanish
                    headers["Accept-Language"] = "es";
                    break;
                case "zh": // Chinese
                    headers["Accept-Language"] = "zh";
                    break;
                case "it": // Italian
                    headers["Accept-Language"] = "it";
                    break;
                case "ja": // Japanese
                    headers["Accept-Language"] = "ja";
                    break;
                case "en": // English
                    headers["Accept-Language"] = "en";
                    break;
                default: // Default: English
                    headers["Accept-Language"] = "en";
            }

            axios({
                url: EndPoints.FortniteNews,
                method: "GET",
                headers: headers,
                responseType: "json"
            }).then(({data}) => {
                resolve({
                    common: data.athenamessage.overrideablemessage.message || data.athenamessage.overrideablemessage.messages,
                    subgame: {
                        battleRoyale: data.subgameselectdata.battleRoyale.message || data.subgameselectdata.battleRoyale.messages,
                        creative: data.subgameselectdata.creative.message || data.subgameselectdata.creative.messages,
                        saveTheWorld: data.subgameselectdata.saveTheWorld.message || data.subgameselectdata.saveTheWorld.messages,
                        saveTheWorldUnowned: data.subgameselectdata.saveTheWorldUnowned.message || data.subgameselectdata.saveTheWorldUnowned.messages,
                    },
                    br: data.battleroyalenews.news.message || data.battleroyalenews.news.messages,
                    battlepass: data.battlepassaboutmessages.news.message || data.battlepassaboutmessages.news.messages,
                    stw: data.savetheworldnews.news.message || data.savetheworldnews.news.messages,
                    loginmessage: data.loginmessage.loginmessage.message || data.loginmessage.loginmessage.messages,
                    survivalmessage: data.survivalmessage.overrideablemessage.message || data.survivalmessage.overrideablemessage.messages,
                    tournamentinformation: data.tournamentinformation.tournament_info.tournament || data.tournamentinformation.tournament_info.tournaments,
                    emergencynotice: data.emergencynotice.news.message || data.emergencynotice.news.messages
                });
            }).catch((err) => {
                reject({
                    message: "Impossible to fetch fortnite data",
                    err
                });
            });
        });
    }

    checkFortniteStatus() {
        return new Promise((resolve, reject) => {
            axios({
                url: EndPoints.FortniteStatus,
                method: "GET",
                headers: {
                    Authorization: "bearer " + this.access_token
                },
                responseType: "json"
            }).then(res => {
                resolve(res.data);
            }).catch(() => {
                reject({
                    message: "Impossible to fetch fortnite data"
                });
            });
        });
    }
    getCloudStorage(uniqueFilename) {
        return new Promise((resolve, reject) => {
            axios({
                url: EndPoints.cloudstorage + (uniqueFilename ? "/" + uniqueFilename : ""),
                method: "GET",
                headers: {
                    Authorization: "bearer " + this.access_token
                },
                responseType: "json"
            }).then(res => {
                resolve(res.data);
            }).catch(err => {
                reject({
                    message: "Impossible to fetch Fortnite PVE data !",
                    err
                });
            });
        }).catch(err => {
            console.log(err);
        })
    }
    getFortnitePVEInfo(lang = "") {
        return new Promise((resolve, reject) => {
            let headers = {};
            switch (lang.toLowerCase()) {
                case "fr": // French
                    headers["X-EpicGames-Language"] = "fr-FR";
                    break;
                case "en": // English
                    headers["X-EpicGames-Language"] = "en";
                    break;
                default: // Default English
                    headers["X-EpicGames-Language"] = "en";
            }

            headers["Authorization"] = "bearer " + this.access_token;

            axios({
                url: EndPoints.FortnitePVEInfo,
                method: "GET",
                headers: headers,
                responseType: "json"
            }).then(res => {
                resolve(res.data);
            }).catch(err => {
                reject({
                    message: "Impossible to fetch Fortnite PVE data !",
                    err
                });
            });
        });
    }

    getStore(lang = "") {
        return new Promise((resolve, reject) => {
            let headers = {};
            switch (lang.toLowerCase()) {
                case "fr": // French
                    headers["X-EpicGames-Language"] = "fr";
                    break;
                case "de": // Deutsch
                    headers["X-EpicGames-Language"] = "de";
                    break;
                case "es": // Spanish
                    headers["X-EpicGames-Language"] = "es";
                    break;
                case "it": // Italian
                    headers["X-EpicGames-Language"] = "it";
                    break;
                case "en": // English
                    headers["X-EpicGames-Language"] = "en";
                    break;
                default: // Default English
                    headers["X-EpicGames-Language"] = "en";
            }

            headers["Authorization"] = "bearer " + this.access_token;

            axios({
                url: EndPoints.FortniteStore,
                method: "GET",
                headers: headers,
                responseType: "json"
            }).then(data => {
                resolve(data.data);
            }).catch(err => {
                console.log(err);
                reject({
                    message: "Impossible to fetch fortnite data !",
                    err
                });
            });
        });
    }

    getScoreLeaderBoard(platform, type) {
        return new Promise((resolve, reject) => {
            if (!(platform == "pc" || platform == "ps4" || platform == "xb1")) {
                reject({
                    message: "Please precise a good platform: ps4/xb1/pc"
                });
                return;
            }

            if (
                !(
                type == this.SOLO ||
                type == this.DUO ||
                type == this.SQUAD
                )
            ) {
                reject({
                    message: "Please precise a good type FortniteApi.SOLO/FortniteApi.DUO/FortniteApi.SQUAD"
                });
                return;
            }

            axios({
                url: EndPoints.leaderBoardScore(platform, type),
                headers: {
                    Authorization: "bearer " + this.access_token,
                    "Content-Type": "application/json"
                },
                method: "POST",
                responseType: "json",
            }).then(({data}) => {
                let leaderboard = data;
                leaderboard = leaderboard.entries;

                leaderboard.forEach(i => {
                    i.accountId = i.accountId.replace(/-/g, "");
                });

                axios({
                    url: EndPoints.displayNameFromIds(leaderboard.map(i => i.accountId)),
                    headers: {
                        Authorization: "bearer " + this.access_token
                    },
                    method: "GET",
                    responseType: "json"
                }).then(res => {
                    leaderboard.forEach(i => {
                        const account = res.data.find(ii => ii.id === i.accountId);
                        // for some reason not all the accounts are returned
                        i.displayName = account ? account.displayName : "";
                    });
                    resolve(leaderboard);
                }).catch(err => {
                    reject({
                        message: "Impossible to get Accounts name Leaderboard",
                        err
                    });
                });
            }).catch(err => {
                reject({
                    message: "Impossible to get Leaderboard Entries",
                    err
                });
            });
        });
    }

    killSession() {
        return new Promise((resolve, reject) => {
            axios({
                url: EndPoints.killSession(this.access_token),
                headers: {
                    Authorization: "bearer " + this.access_token
                },
                method: "DELETE",
                responseType: "json",
                body: {}
            }).then(() => {
                resolve({message: "Session Clean"});
            }).catch((err) => {
                reject({message: "Impossible to kill Epic Games Session", err});
            });
        });
    }

    getLTMInformations(lang = "") {
        return new Promise((resolve, reject) => {
            let headers = {};
            switch (lang.toLowerCase()) {
                case "fr": // French
                    headers["Accept-Language"] = "fr";
                    break;
                case "de": // Deutsch
                    headers["Accept-Language"] = "de";
                    break;
                case "es": // Spanish
                    headers["Accept-Language"] = "es";
                    break;
                case "zh": // Chinese
                    headers["Accept-Language"] = "zh";
                    break;
                case "it": // Italian
                    headers["Accept-Language"] = "it";
                    break;
                case "ja": // Japanese
                    headers["Accept-Language"] = "ja";
                    break;
                case "en": // English
                    headers["Accept-Language"] = "en";
                    break;
                default: // Default: English
                    headers["Accept-Language"] = "en";
            }

            axios({
                url: EndPoints.FortniteNews,
                method: "GET",
                headers: headers,
                responseType: "json"
            }).then(({data}) => {
                resolve(
                    data.playlistinformation
                );
            }).catch((err) => {
                reject({
                    message: "Impossible to fetch fortnite data",
                    err
                });
            });
        });
    }

    kill() {
        return new Promise((resolve, reject) => {
            this.killSession().then(() => {
                clearInterval(this.intervalCheckToken);
                resolve({message: "Api Closed"});
            }).catch(() => {
                reject({message: "Impossible to kill the API. Please Try Again !"});
            });
        });
    }

    eventFlags() {
        return new Promise((resolve, reject) => {
            let headers = {};

            headers["Authorization"] = "bearer " + this.access_token;

            axios({
                url: EndPoints.FortniteEventFlag,
                method: "GET",
                headers: headers,
                responseType: "json"
            }).then(res => {
                resolve(res.data);
            }).catch(err => {
                reject({
                    message: "Impossible to fetch Fortnite PVE data !",
                    err
                });
            });
        });
    }
}

module.exports = FortniteApi;