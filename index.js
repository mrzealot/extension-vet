const fs = require('fs')
const {promisify} = require('util')
const readDirAsync = promisify(fs.readdir)
//const parser = require('./parsing')
//const permissions = require('./permissions')

// assume that .crx files are already scraped using the helper script/ids from the scraping folder

const inputFolder = 'input' // TODO: command line params

async function main() {
    files = await readDirAsync(inputFolder)
    for (let file of files) {

        // extract

        // collect applicable JS sources

        // actualAPIs = parser.parse(sources)
        // declaredAPIs = permissions(manifestFile)

        // compare and plot 
    }
}

main()