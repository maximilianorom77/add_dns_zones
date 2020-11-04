const AWS = require('aws-sdk');
var fs = require('fs');
const path = require("path");

const s3 = new AWS.S3();

const bucket_name = 'testzone2.com';
const availability_zone = "us-west-2";
const bucket_endpoint = `http://${bucket_name}.s3-website-${availability_zone}.amazonaws.com`;


function getAllFiles(dirPath, arrayOfFiles) {
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

function create_public_bucket(callback) {
    // create bucket

    var params = {
        Bucket: bucket_name, /* required */
        ACL: "public-read",
        // GrantRead: "everyone"
    };

    s3.createBucket(params, function(err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log(data);
            if (callback) callback(err, data);
        }
    });
}

function make_bucket_website(callback) {
    // Make bucket a website

    var params = {
        Bucket: bucket_name, /* required */
        WebsiteConfiguration: { /* required */
            ErrorDocument: {
                Key: "error.html" /* required */
            },
            IndexDocument: {
                Suffix: "index.html" /* required */
            }
        }
    };

    s3.putBucketWebsite(params, function(err, data) {
        if (err) console.log(err, err.stack);
        else {
            console.log(data);
            if (callback) callback(err, data);
        }
    });
}

function upload_files(bucket_source, callback) {
    // put object into the bucket

    const all_files = getFilesRelative(bucket_source);

    console.log(`Uploading files from directory ${bucket_source}`);

    for (i in all_files) {

        let file_name = all_files[i];

        console.log(`Uploading file ${file_name}`);

        fs.readFile(`./${bucket_source}/${file_name}`, (err, file_content) => {

            if (err) {
                console.log(`error reading the file ${file_name}`);
                console.log(err);
                return
            }

            var params = {
                Bucket: bucket_name, /* required */
                Key: file_name, /* required */
                ACL: "public-read",
                Body: file_content,
                ContentType: 'text/html',
                ContentEncoding: 'utf-8',
                ContentDisposition: 'inline',
            };

            s3.putObject(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack);
                    console.log(`Failed Uploading file ${file_name}`);
                }
                else {
                    console.log(data);
                    console.log(`Uploaded file ${file_name}`);
                    if (callback) callback(err, data);
                }
            });
        });
    }
}


function main() {
    const bucket_source = "bucket_source";
    create_public_bucket((err, data) => {
        make_bucket_website((err, data) => {
            upload_files(bucket_source);
        });
    });
}

main()
