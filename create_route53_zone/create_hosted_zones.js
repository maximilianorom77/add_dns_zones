const AWS = require('aws-sdk');
const yargs = require('yargs');
const utils = require("./utils");


utils.configureLogging();

const route53 = new AWS.Route53();


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
        }
        else {
            console.log(`Zone created: ${args.domain_name}`);
            console.debug(data);
            args.zone_id = zone_get_id(data);
            if (!args.zone_id) return;
            console.log("Created zone with Id: ", args.zone_id);
            if (callback) callback(err, data);
        }
    });

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

function parse_args() {
    /*
     * Configures and parses the script flags
     * The domain_name is a required argument
     * If called without the name_servers flag the script will create Route 53
     * Zone with random name servers, if the name_server is specified the
     * script will update the zone's NS record with that domain name
     *
     * node create_hosted_names.js --domain_name sub.domain.com --name_server ns-1617.awsdns-10.co.uk.
     */
    return yargs
        .option("domain_name").demand("domain_name")
        .option("name_server").demand("name_server")
        .argv;
}

function main() {
    /*
     * The Script does:
     * 1) Creates a Route 53 zone
     * 2) Updates the name servers (NS record) in the zone
     */

    // zone_create(callback_update_name_servers);
    zone_create((err, data) => {
        zone_update_name_servers();
    });
}

let args = parse_args();

main();
