const AWS = require('aws-sdk');
const fs = require('fs');
const yargs = require('yargs');
const utils = require("./utils");


utils.configureLogging();

const s3 = new AWS.S3();


function bucket_create_public(callback) {
    /*
     * Creates a bucket with public access and in a specifiv availability zone.
     * it calls callback after creating the bucket.
     */

    console.log(`Creating bucket: ${args.bucket_name}`);

    var params = {
        Bucket: args.bucket_name,
        ACL: "public-read"
    };

    s3.createBucket(params, function(err, data) {
        if (err) {
            console.error(err.message);
            console.error(`Error creating bucket: ${args.bucket_name}`);
            console.debug(err, err.stack);
        }
        else {
            console.log(`Bucket created: ${args.bucket_name} go to ${args.bucket_endpoint}`);
            console.debug(data);
            if (callback) callback(err, data);
        }
    });
}

function bucket_enable_hosting(callback) {
    /*
     * Enables web hosting in the bucket.
     * the index.html is the default document the bucket will deliver
     * and in case a file is not found it wil deliver error.html.
     * it calls callback after enabling the web hosting.
     */

    console.log(`Enabling web hosting in bucket: ${args.bucket_name}`);

    var params = {
        Bucket: args.bucket_name,
        WebsiteConfiguration: {
            ErrorDocument: {
                Key: "error.html"
            },
            IndexDocument: {
                Suffix: "index.html"
            }
        }
    };

    s3.putBucketWebsite(params, function(err, data) {
        if (err) {
            console.error(`Error enabling web hosting in bucket: ${args.bucket_name}`);
            console.debug(err, err.stack);
        }
        else {
            console.log(`Web hosting enabled for bucket: ${args.bucket_name}`);
            console.debug(data);
            if (callback) callback(err, data);
        }
    });
}

function bucket_upload_file(file_name, file_content, callback) {
    /*
     * Uploads file into bucket.
     * calls the callback after
     */

    console.log(`Uploading file: ${file_name}`);

    var params = {
        Bucket: args.bucket_name,
        Key: file_name,
        ACL: "public-read",
        Body: file_content,
        ContentType: 'text/html',
        ContentEncoding: 'utf-8',
        ContentDisposition: 'inline',
    };

    s3.putObject(params, function(err, data) {
        if (err) {
            console.error(`Error uploading file: ${file_name}`);
            console.debug(err, err.stack);
        }
        else {
            console.log(`File uploaded: ${file_name}`);
            console.debug(data);
            if (callback) callback(err, data);
        }
    });
}

function bucket_upload_files(callback) {
    /*
     * Upload files from a directory to the bucket.
     * it calls callback after uploading the files.
     */

    console.log(`Uploading files from directory ${args.bucket_source}`);

    const all_files = utils.getFilesRelative(args.bucket_source);

    for (i in all_files) {

        let file_name = all_files[i];

        console.log(`Reading file: ${file_name}`);

        fs.readFile(`./${args.bucket_source}/${file_name}`, (err, file_content) => {
            if (err) {
                console.error(`Error reading file: ${file_name}`);
                console.debug(err, err.stack);
            }
            else {
                console.log(`File read successfuly: ${file_name}`);
                bucket_upload_file(file_name, file_content);
            }
        });
    }
}

function parse_args() {
    /*
     * Parses the Arguments or flags for the script.
     *
     * bucket_name:
     * is the name of the bucket
     *
     * bucket_source:
     * is the path to the folder containing
     * the files you want to copy to the bucket
     *
     * how to call the script:
     * node create_bucket_website.js --bucket_name sub.domain.com --bucket_source bucket_source
     */
    return yargs
        .option("bucket_name").demand("bucket_name")
        .option("bucket_source").demand("bucket_source")
        .argv;
}


function main() {
    /*
     * The Script does:
     * 1) it creates a public S3 bucket
     * 2) enables web hosting in the bucket
     * 3) it upload files into the bucket
     */

    bucket_create_public((err, data) => {
        bucket_enable_hosting((err, data) => {
            bucket_upload_files();
        });
    });
}

var args = parse_args();
const availability_zone = "us-east-1";
args.bucket_endpoint = `http://${args.bucket_name}.s3-website-${availability_zone}.amazonaws.com`;
main()
