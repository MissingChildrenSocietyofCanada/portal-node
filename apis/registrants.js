'use strict';

var DocumentDBClient = require('documentdb').DocumentClient;

var Registrant = function (config) {
    this.config = Object.assign({}, {
        CollLink: 'dbs/user/colls/socials',
    }, config);
}

// Gets the date from a timestamp
Registrant.prototype.getDateFromTimestamp = function (timestamp) {
    // Create a new JavaScript Date object based on the timestamp
    // multiplied by 1000 so that the argument is in milliseconds, not seconds.
    return new Date(timestamp*1000);
}

// Gets the full name from the social
Registrant.prototype.getNameFromSocial = function (social) {
    if (social.twitter) {
        return social.twitter.displayName;
    } else if (social.facebook) {
        return social.facebook.name;
    } else if (social.instagram) {
        return social.instagram.displayName;
    } else {
        return "unknown";
    }
}

// Gets the users photo from the social
Registrant.prototype.getUserPhotoFromSocial = function (social) {
    if (social.twitter) {
        return social.twitter.profilepic;
    } else if (social.facebook) {
        return social.facebook.profilepic;
    } else if (social.instagram) {
        return social.instagram.profilepic;
    } else {
        return null;
    }
}

// Gets twitter profile from the social
Registrant.prototype.getTwitterFromSocial = function (social) {
    if (social.twitter) {
        return { displayName: social.twitter.displayName,
            hometown: social.twitter.hometown ? social.twitter.hometown : "unknown hometown",
            profilepic: social.twitter.profilepic
        };
    } else {
        return null;
    }
}

// Gets facebook profile from the social
Registrant.prototype.getFacebookFromSocial = function (social) {
    if (social.facebook) {
        return { displayName: social.facebook.name,
            hometown: social.facebook.hometown ? social.facebook.hometown.name : "hometown unknown",
            profilepic: social.facebook.profilepic
        };
    } else {
        return null;
    }
}

// Gets instagram profile from the social
Registrant.prototype.getInstagramFromSocial = function (social) {
    if (social.instagram) {
        return { displayName: social.instagram.displayName,
            hometown: social.instagram.hometown ? social.instagram.hometown : "hometown unknown",
            profilepic: social.instagram.profilepic
        };
    } else {
        return null;
    }
}

// build registrant(s) for use on both the list and detail pages.
Registrant.prototype.buildRegistrants = function (socials) {
    let registrants = {};

    socials.forEach((social) => {
        let userid = social.id;

        let registrant = registrants[userid] || {
            id: userid,
            name: this.getNameFromSocial(social),
            timestamp: this.getDateFromTimestamp(social._ts),
            photo: this.getUserPhotoFromSocial(social),
            twitter: this.getTwitterFromSocial(social),
            facebook: this.getFacebookFromSocial(social),
            instagram: this.getInstagramFromSocial(social)
        };

/*
        this.assignIfNotNull(registrant, 'email', null);
        this.assignIfNotNull(registrant, 'gender', null);
        this.assignIfNotNull(registrant, 'birthday', null);
        this.assignIfNotNull(registrant.social.twitter, 'handle', null);
        this.assignIfNotNull(registrant.social.instagram, 'handle', null);
        this.assignIfNotNull(registrant.social.facebook, 'profile', null);
*/
        registrants[userid] = registrant;
    });

    return registrants;
}

Registrant.prototype.getList = function () {
    return new Promise((resolve, reject) => {
        const docDbClient = new DocumentDBClient(this.config.Host, { masterKey: this.config.AuthKey });

        // const query = 'SELECT * FROM c WHERE c.response.type =\'profile\' ORDER BY c.triggeredOn DESC';
        const query = 'SELECT * FROM c ORDER BY c._ts';

        const options = {
            enableCrossPartitionQuery: true
        };

        docDbClient.queryDocuments(this.config.CollLink, query, options).toArray((err, results) => {
            let registrants = this.buildRegistrants(results);

            // convert to array
            let registrantArray = [];
            for (var key in registrants) {
                registrantArray.push(registrants[key]);
            }

            resolve(registrantArray);
        });
    });
}

Registrant.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        const docDbClient = new DocumentDBClient(this.config.Host, { masterKey: this.config.AuthKey });

        var querySpec = {
            query: 'SELECT * FROM c WHERE c.response.type =\'profile\' AND c.user.id = @id ORDER BY c.triggeredOn DESC', 
            parameters: [{name: '@id',  value: id}]
        };

        const options = {
            enableCrossPartitionQuery: true
        };

        docDbClient.queryDocuments(this.config.CollLink, querySpec, options).toArray((err, results) => {
            // Build the core profile.
            let profiles = this.buildProfiles(results);

            let profile = profiles[id];

            if (!profile) {
                reject("Profile not found");
                return;
            }

            // Add triggering statuses to the profile.
            results.forEach((event) => {
                if (event.response.platform === "twitter") {
                    this.extractTwitterSocialInformation(profile, event);
                }
                else if (event.response.platform === "facebook") {
                    this.extractFacebookSocialInformation(profile, event);
                }
                else if (event.response.platform === "instagram") {
                    this.extractInstagramSocialInformation(profile, event);
                }
            });

            // Add historical statuses to the profile.
            // TODO: Add media too.
            this.addHistoricalStatuses(resolve, reject, profile, docDbClient);
        });
    });
}

module.exports = Registrant;