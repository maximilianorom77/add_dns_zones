const AWS = require('aws-sdk');
const yargs = require('yargs');
const utils = require("./utils");
var Queue = require('queue-fifo');


utils.configureLogging();

const route53 = new AWS.Route53();
/*
 * Map between zone_id and the name_servers.
 */
let zones_created = new Set();
let zones_to_delete = new Queue();

let interval_for_create = null;
let interval_for_delete = null;

let zones_created_counter = 0;


function interval_clear_create() {
    console.debug("clearInterval for create");
    console.debug(interval_for_create);
    clearInterval(interval_for_create);
    interval_for_create._cleared = true;
}

function interval_create_rutine() {
    zones_created_counter += 1
    console.log(`interval_create_rutine ${zones_created_counter}`);
    if (zones_created_counter >= args.limit_create) {
        interval_clear_create();
        return;
    }
    if (zones_created.size >= args.max_tries) {
        console.info(`max_tries reached skipping zone_create`);
        return;
    }
    zone_create((err, data) => {
        if (err) return;
        if (data.zone_id)
            zones_created.add(data.zone_id);
        if (zone_name_servers_include(data, args.name_server)) {
            console.log(`Zone matched the name server: ${args.name_server}`);
            interval_clear_create();
            args.zone_id = data.zone_id;
        }
        else {
            if (data.zone_id)
                zones_to_delete.enqueue(data.zone_id);
        }
    });
}


function interval_delete_rutine(callback) {
    // If Throttling because too many request
    // try again and again to delete so that
    // there are no remaining zones
    console.log(`interval_delete_rutine`);
    if (zones_to_delete.size() == 0) {
        if (interval_for_create && interval_for_create._cleared) {
            clearInterval(interval_for_delete);
            if (callback) callback();
        }
        return;
    };
    let zone_id = zones_to_delete.dequeue();
    zone_delete(zone_id, (err, data) => {
        // BUGFIX: if error NoSuchHostedZone then delete zone from set
        // otherwise it will try forever to delete the zone.
        if (err) {
            if (err.code != "NoSuchHostedZone") {
                // for other errors enqueue the zone to be deleted
                zones_to_delete.enqueue(zone_id);
            }
            return;
        }
        zones_created.delete(zone_id);
    });
}


function zone_create_concurrently(callback) {
    /*
     * Creates vmany zones at the same time to be faster
     * once a zone matches the name server
     * all the other zones are deleted leaving only one.
     *
     * The zones created are stored in zones_created.
     *
     * Deletes twice as frequently as it creates to avoid bottleneck
     */
    let every = 1000;

    interval_for_create = setInterval(interval_create_rutine, every);
    interval_for_delete = setInterval(() => {
        interval_delete_rutine(callback);
    }, every);
}

function zone_delete(zone_id, callback) {
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
        }
        else {
            console.log(`Zone deleted: ${zone_id}`);
            console.debug(data);
        }
        if (callback) callback(err, data);
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
            data.zone_id = zone_get_id(data);
            console.log("Created zone with Id: ", data.zone_id);
            console.debug(data);
        }
        if (callback) callback(err, data);
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
    name_server = utils.strings_remove_dot_end(name_server);
    let name_servers = zone_get_name_servers(data);
    console.log(`Name servers: ${name_servers} don't match ${name_server}`);
    return name_servers.includes(name_server);
}

function zone_add_record_type_a(callback) {
    /*
     * Adds a record type A to the zone.
     * This is used to point to the domain of the bucket
     * used for webhosting.
     */
    console.log(`Adding record type A: ${args.domain_name}`);


    let params = utils.params_change_record_sets("CREATE", "A", args.bucket_url, args);

    return route53.changeResourceRecordSets(params, function(err, data) {
        if (err) {
            console.error(err.message);
            console.error(`Error adding record type A: ${args.domain_name}`);
            console.debug(err, err.stack);
        }
        else {
            console.log(`Record type A added: ${args.domain_name}`);
            console.debug(data);
        }
        if (callback) callback(err, data);
    });

}

function zone_update_name_servers(callback) {
    /*
     * Updates the zone name servers.
     * Calls callback after
     */
    console.log(`Updating name servers: ${args.domain_name}`);

    let params = utils.params_change_record_sets("UPSERT", "NS", args.name_server, args);

    return route53.changeResourceRecordSets(params, function(err, data) {
        if (err) {
            console.error(err.message);
            console.error(`Error updating name servers: ${args.domain_name}`);
            console.debug(err, err.stack);
        }
        else {
            console.log(`Name servers updated: ${args.domain_name}`);
            console.debug(data);
        }
        if (callback) callback(err, data);
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
        .option("limit_create").demand("limit_create")
        .option("bucket_url")
        .argv;
    if (args.max_tries)
        args.max_tries = Number(args.max_tries);
    if (args.limit_create)
        args.limit_create = Number(args.limit_create);
    return args;
}

function main() {
    /*
     * The Script does:
     * 1) Creates a Route 53 zone
     * 2) Updates the name servers (NS record) in the zone
     */

    zone_create_concurrently((err, data) => {
        if (args.zone_id)
            zone_update_name_servers();
        process.exit(0);
    });
}

let args = parse_args();

main();
// zone_delete_with_name();
