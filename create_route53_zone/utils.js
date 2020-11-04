const fs = require('fs');
const path = require("path");


function configureLogging() {
    switch (process.env.LOG_LEVEL) {
    case "DEBUG":
        break;
    default:
        console.debug = function() {};
    }
}

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


configureLogging()

module.exports = {
    getFilesRelative: getFilesRelative
}
