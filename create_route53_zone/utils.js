const fs = require('fs');
const path = require("path");


function strings_remove_dot_end(string) {
    /*
     * Removes the dot at the end of string
     */
    if (string.slice(-1) == '.')
        return string.slice(0, -1);
    return string;
}


function params_change_record_sets(mode, type, record, args) {
    /*
     * Function used to create the parameters for
     * changeResourceRecordSets given a mode CREATE, UPDATE, UPSERT
     * a type NS, A and a record depending on the type
     */
    let record_set = {
        Name: args.domain_name,
        Type: type
    };
    if (type == "A") {
        record_set.AliasTarget = {
            DNSName: record,
            EvaluateTargetHealth: false,
            HostedZoneId: args.zone_id
        };
    }
    else {
        record_set.ResourceRecords = [
            {
                Value: record
            }
        ];
    }
    return {
        ChangeBatch: {
            Changes: [
                {
                    Action: mode,
                    ResourceRecordSet: record_set
                }
            ]
        },
        HostedZoneId: args.zone_id
    };

}

function configureLogging() {
    /*
     * Overwrites the console.debug function unless the env variable
     * LOG_LEVEL is set to DEBUG
     *
     * When debugging call the script with LOG_LEVEL=DEBUG in front
     * to see all the logs
     */
    switch (process.env.LOG_LEVEL) {
    case "DEBUG":
        break;
    default:
        console.debug = function() {};
    }
}

function getAllFiles(dirPath, arrayOfFiles) {
    /*
     * List all the files in a directory.
     * Returns list with full path of the files.
     */
    files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(__dirname, dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

function getFilesRelative(dirPath) {
    /*
     * List all the files in a directory.
     * Returns list with relative path of the files to the directory.
     */
    const all_files = getAllFiles(dirPath);
    let file_names = [];

    for (i in all_files) {
        file_names.push(
            all_files[i].slice(
                __dirname.length + dirPath.length + 2
            ));
    }

    return file_names;
}

module.exports = {
    getFilesRelative: getFilesRelative,
    configureLogging: configureLogging,
    strings_remove_dot_end: strings_remove_dot_end,
    params_change_record_sets: params_change_record_sets
}
