const EG = require('epicgames-client');
const EGClient  = EG.Client;
const Fortnite = require('epicgames-fortnite-client');

class FortniteClient {
    constructor(email, password) {
        this.eg = new EGClient({
            email,
            password
        });
        this.eg.init().then(async (success) => {
            if(!success) console.error("Cannot initialize EpicGames launcher.");
            if(!await this.eg.login()) console.error("Cannot login on EpicGames account.");

            this.fortnite = await this.eg.runGame(Fortnite, {
                netCL: '',
                partyBuildId: '1:1:',
            });
            this.br = await this.fortnite.runSubGame(Fortnite.ESubGame.BattleRoyale);
            console.log("Module Fortnite-Client loaded");

            this.fortnite.party.setPlaylist("EU", "Playlist_DefaultSolo");
            this.fortnite.party.setPrivacy(EG.EPartyPrivacy.PUBLIC);
            
            this.fortnite.party.me.setOutfit("/Game/Athena/Items/Cosmetics/Characters/CID_313_Athena_Commando_M_KpopFashion.CID_313_Athena_Commando_M_KpopFashion");
            this.fortnite.party.me.setEmote("/Game/Athena/Items/Cosmetics/Emotes/EID_KPopDance03.EID_KPopDance03");
            this.fortnite.party.me.setBattlePass(true, 2000, 50000, 50000);

            this.fortnite.communicator.on('party:member:joined', (member) => {
                this.fortnite.party.me.setReady(true);
            });

            this.fortnite.communicator.on('friend:message', async (message) => {
                var args = message.message.split(" ");
                if(args[0].toLowerCase() == ">setoutfit") {
                    if(args.length < 2) {
                        message.reply(">setOutfit [ID]");
                    } else {
                        this.fortnite.party.me.setOutfit("/Game/Athena/Items/Cosmetics/Characters/" + args[1] + "." + args[1]);
                    }
                } else if(args[0].toLowerCase() == ">setemote") {
                    if(args.length < 2) {
                        message.reply(">setEmote [ID]");
                    } else {
                        this.fortnite.party.me.setEmote("/Game/Athena/Items/Cosmetics/Dances/" + args[1] + "." + args[1]);
                    }
                } else if(args[0].toLowerCase() == ">setbackpack") {
                    if(args.length < 2) {
                        message.reply(">setBackpack [ID]");
                    } else {
                        this.fortnite.party.me.setBackpack("/Game/Athena/Items/Cosmetics/Backpacks/" + args[1] + "." + args[1]);
                    }
                } else if(args[0].toLowerCase() == "!joinme") {
                    var friends = await this.eg.getFriends();
                    var friend = friends.find(friend => friend.id === message.friend.id);
                    console.log(friend);
                    friend.join();
                } else {
                    message.reply(">setOutfit [ID]");
                    message.reply(">setEmote [ID]");
                    message.reply(">setBackpack [ID]");
                }
            });

            this.eg.communicator.on("friend:request", async (request) => {
                request.accept();
            })
            this.eg.getFriendRequests().then((requests) => {
                requests.forEach(request => {
                    request.accept();
                });
            });
        });
    }
}
var config = require("../../config.json");
module.exports = new FortniteClient(config.fortnite.email, config.fortnite.password);