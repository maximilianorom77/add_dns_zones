const AWS = require('aws-sdk');
const yargs = require('yargs');


const route53 = new AWS.Route53();


function createHostedZone(args, callback) {

    let date = new Date().toISOString();

    let params = {
        CallerReference: date,
        Name: args.domain_name
    };

    route53.createHostedZone(params, function(err, data) {
        if (err)
            console.log(err, err.stack);
        else {
            console.log(data);
            callback(err, data);
        }
    });

}

function changeResourceRecordSets(args) {
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
        if (err) console.log(err, err.stack);
        else     console.log(data);
    });
}

function makeCallbackAfterCreate(args) {

    function callbackUpdateRecords(err, data) {

        let zone_full_id = data && data.HostedZone && data.HostedZone.Id;
        let zone_id = zone_full_id && zone_full_id.split("/")[2];

        if (!zone_full_id || !zone_id) {
            console.log(
                "Could not get the HostedZone Id after creating the Zone"
            );
            return null;
        }

        console.log("Created zone with Id: ", zone_id);

        args.zone_id = zone_id;

        return changeResourceRecordSets(args);
    }

    return callbackUpdateRecords;
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

    let argv = parse_args();

    return createHostedZone(argv, makeCallbackAfterCreate(argv));
}

main();
