const AWS = require('aws-sdk');
const yargs = require('yargs');
const utils = require("./utils");


utils.configureLogging();

const route53 = new AWS.Route53();
/*
 * Map between zone_id and the name_servers.
 */
let zones_created = {};


function zone_create_concurrently(callback) {
    /*
     * Creates vmany zones at the same time to be faster
     * once a zone matches the name server
     * all the other zones are deleted leaving only one.
     *
     * The zones created are stored in zones_created.
     */
    let interval = null;
    let every = 1000;

    function repeat() {
        if (Object.keys(zones_created).length >= args.max_tries) {
            console.debug(`max_tries reached`);
            return;
        }
        zone_create((err, data) => {
            console.log("zones_created: ", zones_created);
            zones_created[data.zone_id] = true;
            if (zone_name_servers_include(data, args.name_server)) {
                console.log(`Zone matched the name server: ${args.name_server}`);
                clearInterval(interval);
                zone_delete_remaining(data.zone_id);
                callback(err, data);
            }
            else {
                zone_delete(data.zone_id);
                delete zones_created[data.zone_id];
            }
        });
    }

    interval = setInterval(repeat, every);
}


function zone_delete_different_than(zone_id) {
    for (let created_zone_id in zones_created)
        if (created_zone_id != zone_id) {
            zone_delete(created_zone_id);
            delete zones_created[created_zone_id];
        }
}

function zone_delete_remaining(zone_id) {
    /*
     * Deletes zones created if there are any remaining zones to be deleted.
     */
    zone_delete_different_than(zone_id);
    // if there are duplicates, delete.
    let keys = Object.keys(zones_created);
    if (keys.length > 1)
        zone_delete_different_than(keys[0]);
}

function zone_delete(zone_id) {
    /*
     * Given a zone_id it deletes the zone.
     */
    console.log(`Deleting zone: ${zone_id}`);

    let params = {
        Id: zone_id
    };

    route53.deleteHostedZone(params, (err, data) => {
        if (err) {
            console.error(err.message);
            console.error(`Error deleting zone: ${zone_id}`);
            console.debug(err, err.stack);
            // If Throttling because too many request
            // try again and again to delete so that
            // there are no remaining zones
            setTimeout(() => {
                console.debug("Throttling error retrying");
                zone_delete(zone_id);
            });
        }
        else {
            console.log(`Zone deleted: ${zone_id}`);
            console.debug(data);
        }
    });
}

function zone_create(callback) {
    /*
     * Creates a Route 53 Zone.
     * Calls callback after
     */

    console.log(`Creating zone: ${args.domain_name}`);

    let date = new Date().toISOString();

    let params = {
        CallerReference: date,
        Name: args.domain_name
    };

    route53.createHostedZone(params, function(err, data) {
        if (err) {
            console.error(err.message);
            console.error(`Error creating zone: ${args.domain_name}`);
            console.debug(err, err.stack);
            if (err.code == "ExpiredToken") throw err;
        }
        else {
            console.log(`Zone created: ${args.domain_name}`);
            console.debug(data);
            data.zone_id = zone_get_id(data);
            args.zone_id = data.zone_id;
            if (!args.zone_id) return;
            console.log("Created zone with Id: ", args.zone_id);
            if (callback) callback(err, data);
        }
    });

}

function zone_get_name_servers(data) {
    /*
     * Gets the name servers from a zone.
     * data is the result of calling route53.createHostedZone.
     */
    return data && data.DelegationSet && data.DelegationSet.NameServers;
}

function zone_name_servers_include(data, name_server) {
    /*
     * Returns true if name_server is one of
     * the name servers of the zone.
     */
    let name_servers = zone_get_name_servers(data);
    console.log(`Name servers: ${name_servers}`);
    return name_servers.includes(name_server);
}

function zone_update_name_servers(callback) {
    /*
     * Updates the zone name servers.
     * Calls callback after
     */

    console.log(`Updating name servers: ${args.domain_name}`);

    let params = {
        ChangeBatch: {
            Changes: [
                {
                    Action: "UPSERT",
                    ResourceRecordSet: {
                        Name: args.domain_name,
                        ResourceRecords: [
                            {
                                Value: args.name_server
                            }
                        ],
                        TTL: 300,
                        Type: "NS"
                    }
                }
            ]
        },
        HostedZoneId: args.zone_id
    };

    return route53.changeResourceRecordSets(params, function(err, data) {
        if (err) {
            console.error(err.message);
            console.error(`Error updating name servers: ${args.domain_name}`);
            console.debug(err, err.stack);
        }
        else {
            console.log(`Name servers updated: ${args.domain_name}`);
            console.debug(data);
            if (callback) callback(err, data);
        }
    });
}

function zone_get_id(data) {
    /*
     * Gets the id from the zone or prints error.
     */
    let zone_full_id = data && data.HostedZone && data.HostedZone.Id;
    let zone_id = zone_full_id && zone_full_id.split("/")[2];

    if (!zone_full_id || !zone_id) {
        console.error(
            "Could not get the HostedZone Id after creating the Zone"
        );
        return null;
    }

    return zone_id;
}

function zone_delete_with_name() {
    /*
     * Deletes all the zones with name equal to args.domain_name
     */

    route53.listHostedZones({}, (err, data) => {
        for (let i in data.HostedZones) {
            let name = data.HostedZones[i].Name;
            if (name == args.domain_name + ".") {
                console.log(name);
                let _data = {};
                _data.HostedZone = data.HostedZones[i];
                let zone_id = zone_get_id(_data);
                zone_delete(zone_id);
            }
        }
    });
}

function parse_args() {
    /*
     * Configures and parses the script flags.
     *
     * The domain_name is a required argument.
     * If called without the name_servers flag the script will create Route 53
     * Zone with random name servers, if the name_server is specified the
     * script will update the zone's NS record with that domain name.
     *
     * The max_tries is the max count of zones to create before given up
     * creating zones if no one matches the name_server.
     *
     * node create_hosted_names.js --domain_name sub.domain.com --name_server ns-1617.awsdns-10.co.uk.
     */
    let args = yargs
        .option("domain_name").demand("domain_name")
        .option("name_server").demand("name_server")
        .option("max_tries").demand("max_tries")
        .argv;
    if (args.max_tries)
        args.max_tries = Number(args.max_tries);
    return args;
}

function main() {
    /*
     * The Script does:
     * 1) Creates a Route 53 zone
     * 2) Updates the name servers (NS record) in the zone
     */

    zone_create_concurrently((err, data) => {
        if (!args.name_server)
            return;
        zone_update_name_servers();
    });
}

let args = parse_args();

main();
