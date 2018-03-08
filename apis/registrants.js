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
    let registrants = [];

    socials.forEach((social) => {
        let userid = social.id;

        let registrant = registrants[userid] || {
            id: userid,
            name: this.getNameFromSocial(social),
            registeredOn: this.getDateFromTimestamp(social._ts),
            photo: this.getUserPhotoFromSocial(social),
            twitter: this.getTwitterFromSocial(social),
            facebook: this.getFacebookFromSocial(social),
            instagram: this.getInstagramFromSocial(social)
        };

        registrants.push(registrant);
    });

    return registrants;
}

Registrant.prototype.getList = function (name) {
    return new Promise((resolve, reject) => {
        if (name && name.trim()) {
            const docDbClient = new DocumentDBClient(this.config.Host, { masterKey: this.config.AuthKey });

            const querySpec = {
                query: 'SELECT * FROM c WHERE CONTAINS(LOWER(c.facebook.name),@name) OR CONTAINS(LOWER(c.twitter.displayName),@name) OR CONTAINS(LOWER(c.instagram.displayName),@name) ORDER BY c._ts',
                parameters: [{name: '@name', value: name.trim().toLowerCase() }]
            };

            const options = {
                enableCrossPartitionQuery: true
            };

            docDbClient.queryDocuments(this.config.CollLink, querySpec, options).toArray((err, results) => {
                resolve(this.buildRegistrants(results));
            });
        } else {
            resolve([]);
        }
    });
}

Registrant.prototype.get = function (id) {
    return new Promise((resolve, reject) => {
        const docDbClient = new DocumentDBClient(this.config.Host, { masterKey: this.config.AuthKey });

        var querySpec = {
            query: 'SELECT * FROM c WHERE c.id = @id ORDER BY c.triggeredOn DESC',
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