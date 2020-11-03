var AWS = require('aws-sdk');


var route53 = new AWS.Route53();

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
                                Value: args.name_servers[0]
                            }
                        ], 
                        TTL: 60, 
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
            return;
        }

        console.log("Created zone with Id: ", zone_id);

        args.zone_id = zone_id;

        return changeResourceRecordSets(args);
    }

    return callbackUpdateRecords;
}

function test() {
    var domain_name = "testzone.com";

    var args = {
        domain_name: domain_name,
        name_servers: ["ns-1617.awsdns-10.co.uk."],
    };

    return createHostedZone(args, makeCallbackAfterCreate(args));
}

test();

