const axios = require("axios");
const qs = require("qs");

const EndPoints = require("./tools/endpoints");

class Launcher {
    constructor(credentials) {
        if (credentials && credentials.constructor === Array && credentials.length == 4) {
            this.credentials = credentials;
        } else {
            throw new Error("Please give credentials [Email, Password, Client Launcher Token, Client Fortnite Token]");
        }
    }

    login() {
        return new Promise((resolve) => {
            axios({
                url: EndPoints.OAUTH_TOKEN,
                headers: {
                    Authorization: "basic " + this.credentials[3],
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: qs.stringify({
                    grant_type: "client_credentials",
                    token_type: "eg1"
                }),
                method: "POST",
                responseType: "json"
            }).then((res) => {
                this.expires_at = res.data.expires_at;
                this.access_token = res.data.access_token;
                this.client_id = res.data.client_id;
                resolve();
            }).catch(() => {
                throw new Error("Error: Fatal Error Impossible to Get Launcher Token");
            });
        }).catch((err) => console.log(err));
    }

    getManifest() {
        return new Promise((resolve) => {

            axios({
                url: EndPoints.APP_MANIFEST,
                method: "GET",
                headers: {
                    "Authorization": "bearer " + this.access_token
                },
                responseType: "json"
            }).then(res => {
                resolve(res.data);
            })
        }).catch(err => console.log(err));
    }
}

module.exports = Launcher;