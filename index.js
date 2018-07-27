const fs = require('fs')
const path = require('path')
const {promisify} = require('util')
const readDirAsync = promisify(fs.readdir)
const readFileAsync = promisify(fs.readFile)
const extract = require('unzip-crx')
const rimraf = promisify(require('rimraf'))

const espree = require('espree')
const estraverse = require('estraverse')


// quick parse of the available permission strings from 
// https://developer.chrome.com/extensions/declare_permissions
// without sub-levels
const permissions = [
    'activeTab',
    'alarms',
    'background',
    'bookmarks',
    'browsingData',
    'certificateProvider',
    'clipboardRead',
    'clipboardWrite',
    'contentSettings',
    'contextMenus',
    'cookies',
    'debugger',
    'declarativeContent',
    'declarativeNetRequest',
    'declarativeWebRequest',
    'desktopCapture',
    'displaySource',
    'dns',
    'documentScan',
    'downloads',
    'experimental',
    'fileBrowserHandler',
    'fileSystemProvider',
    'fontSettings',
    'gcm',
    'geolocation',
    'history',
    'identity',
    'idle',
    'idltest',
    'management',
    'nativeMessaging',
    'notifications',
    'pageCapture',
    'platformKeys',
    'power',
    'printerProvider',
    'privacy',
    'processes',
    'proxy',
    'sessions',
    'signedInDevices',
    'storage',
    'tabCapture',
    'tabs ',
    'topSites',
    'tts',
    'ttsEngine',
    'unlimitedStorage',
    'wallpaper',
    'webNavigation',
    'webRequest',
    'webRequestBlocking',
];


// assume that .crx files are already scraped using the helper script/ids from the scraping folder

const inputFolder = 'input' // TODO: command line params
let result = 'id;actual;declared;union;intersection;undeclared;unused;errors\n'

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


    try {
        files = await readDirAsync(inputFolder)
        for (let extension of files) {

            // clean up temp
            await rimraf(temp)

            // extract
            console.log('\n\n\nProcessing extension: ' + extension)
            await extract(path.join(inputFolder, extension), temp)

            let actual = new Set()
            let declared = new Set()
            let parserErrors = 0

            // collect applicable JS sources
            fromDir(temp, /.*js$/g, (file) => {

                console.log('Checking file: ' + file)
                contents = fs.readFileSync(file).toString()
                let ast = null
                try {
                    ast = espree.parse(contents, {
                        // attach range information to each node
                        range: true,
                        // attach line/column location information to each node
                        loc: true,
                        ecmaVersion: 7,
                    })
                } catch (ex) {
                    console.log('Error during analysis, continuing...', ex)
                    parserErrors++
                    return
                }

                // traverse the ast, looking for clues of actual usages of permissions
                estraverse.traverse(ast, {
                    enter: (node, parent) => {
                        
                        // crude check... multiple depths of accesses e.g., chrome.system.cpu are not handled yet

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

            })

            const manifest = JSON.parse(fs.readFileSync(path.join(temp, 'manifest.json')).toString())
            for (let p of (manifest.permissions || [])) {

                // filter host permissions for now 
                // as they would always show up as unused
                if (p.match && !p.match(/http(s)?\:\/\//)) {
                    declared.add(p)
                }
            }

            // compare and plot 
            console.log(actual)
            console.log(declared)

            let union = new Set([...actual, ...declared])
            let intersection = new Set([...actual].filter(elem => declared.has(elem)))
            let undeclared = new Set([...actual].filter(elem => !declared.has(elem)))
            let unused = new Set([...declared].filter(elem => !actual.has(elem))) 

            console.log('union', union)
            console.log('intersection', intersection)
            console.log('undeclared', undeclared)
            console.log('unused', unused)

            result += extension + ';' +
                [actual.size, declared.size, union.size, intersection.size, undeclared.size, unused.size].join(';') +
                ';' + parserErrors + '\n'

            // this is just a temp hack to get results even between extensions
            fs.writeFileSync('results.csv', result);
        }

        console.log("I can't believe it... It's actually done.")


        fs.writeFileSync('results.csv', result);

    } catch (ex) {
        console.log(ex)
    }
}

main()