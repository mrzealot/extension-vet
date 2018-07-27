const fs = require('fs')
const path = require('path')
const {promisify} = require('util')
const readDirAsync = promisify(fs.readdir)
const readFileAsync = promisify(fs.readFile)
const extract = require('unzip-crx')
const rimraf = promisify(require('rimraf'))

const espree = require('espree')
const estraverse = require('estraverse')

// assume that .crx files are already scraped using the helper script/ids from the scraping folder

const inputFolder = 'input' // TODO: command line params

// shamelessly "repurposed" from StackOverflow
function fromDir(startPath,filter,callback){
    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath);
        return;
    }

    var files=fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            fromDir(filename,filter,callback); //recurse
        }
        else if (filter.test(filename)) callback(filename);
    }
}

async function main() {

    let temp = path.resolve('tmp')

    const permissions = [
        'tabs',
        'browsingData',
        // etc...
    ];

    try {
        files = await readDirAsync(inputFolder)
        for (let file of files) {

            // clean up temp
            await rimraf(temp)

            // extract
            console.log(file)
            await extract(path.join(inputFolder, file), temp)

            let actual = new Set()
            let declared = new Set()

            // collect applicable JS sources
            fromDir(temp, /.*js$/g, (file) => {

                console.log('Checking file: ' + file)
                contents = fs.readFileSync(file).toString()
                
                let ast = espree.parse(contents, {
                    // attach range information to each node
                    range: true,
                    // attach line/column location information to each node
                    loc: true,
                    ecmaVersion: 7,
                })

                // console.log(ast)


                estraverse.traverse(ast, {
                    enter: (node, parent) => {
                        // console.log(node)
                        if (
                            node.type === 'MemberExpression' &&
                            node.object && node.object.type === 'Identifier' &&
                            node.object.name === 'chrome' &&
                            node.property && node.property.type === 'Identifier' &&
                            permissions.indexOf(node.property.name) > -1
                        ) {
                            actual.add(node.property.name)
                        }
                    }
                })

                console.log(actual)
                throw 1
            })

        }

        // declaredAPIs = permissions(manifestFile)

        // compare and plot 


    } catch (ex) {
        console.log(ex)
    }
}

main()