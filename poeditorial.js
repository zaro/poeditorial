#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { cosmiconfigSync } = require('cosmiconfig');
const MODULE_NAME = 'poeditorial';
const WAIT_BETWEEN_UPLOADS_SECONDS = 30;

const rp = require('request-promise-native').defaults({
    baseUrl: 'https://api.poeditor.com/v2',
    json: true,
})

const argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .command('list', 'List projects')
    .command('export', 'Get translations from POEditor')
    .command('upload', 'Upload translations to POEditor')
    .example('$0 export', 'Export files from POEditor')
    .demandCommand()
    .boolean('all')
    .describe('all', 'List all project [default only configured]')
    .default('all', false)
    .array('l')
    .alias('l', 'language')
    .describe('l', 'Specify languages')
    .default('l', ['en', 'de'])
    .string('a')
    .alias('a', 'access-token')
    .nargs('a', 1)
    .describe('a', 'POEditor API Token')
    .default('a', process.env.POEDITOR_TOKEN)
    .demandOption(['a'])
    .help('h')
    .alias('h', 'help')
    .coerce({
        message: (val) => Array.isArray(val) ? val.join("\n") : val,
        task: (taskIds) => taskIds.map(val => val.toString().replace(/^\#/, ''))
    })
    .argv;

function poEditor(url, data={}) {
    data.api_token = argv.accessToken;
    const params = new URLSearchParams();
    for( const [k,v] of Object.entries(data)){
        params.append(k, v);
    }
    return rp.post({
        url,
        formData: data
    }).then(response => {
        if(response.response && response.response.status == 'success'){
            return response;
        }
        throw response;
    })
}


function getConfig(){
    const foundConfig = cosmiconfigSync(MODULE_NAME).search();
    if(!foundConfig){
        console.error('No configuration found!');
        process.exit(1);
    }
    const {config = {}, filepath} = foundConfig;
    const basePath = path.dirname(filepath);
    for(const [projectName, projectConfig] of Object.entries(config)){
        if(!('format' in projectConfig)) {
            console.error(`Format is not defined for project ${projectName}`)
            process.exit(1)
        }
        if(!('languages' in projectConfig)) {
            console.error(`No languages defined for project ${projectName}`)
            process.exit(1)
        }
        if(!('updating' in projectConfig)) {
            console.error(`Update mode not defined for project ${projectName}`)
            process.exit(1)
        }
    }
    return {
        config,
        basePath
    }
}

async function listProjects(){
    return poEditor('/projects/list').then(response =>
        response.result.projects.reduce((o, project)=> ({...o, [project.name]: project}), {})
    )
}

async function exportFileUrl(projectId, language, type='key_value_json'){
    return poEditor('/projects/export', {
        id: projectId,
        language,
        type
    }).then(response => response.result.url);
}

async function uploadFile(projectId, language, filePath, updating) {
    const file = fs.createReadStream(filePath);
    return poEditor('/projects/upload', {
        id: projectId,
        updating,
        language,
        file,
        overwrite: 0,
        sync_terms: 0,
    }).then(response => response.result);
}

async function downloadFile(url, destination = undefined) {
    const p = rp.get(url, {
        baseUrl: null,
    })

    if(destination){
        p.then( response => {
            fs.writeFileSync(destination, JSON.stringify(response, null, 4));
            return response;
        })
    }
    return p;
}

const commands = {
    list: async () => {
        const {config = {}} = getConfig();
        const projects = await listProjects();
        for(const [projectName, project] of Object.entries(projects)){
            if(argv.all || projectName in config){
                console.log(`${project.id}\t${project.name}`)
            }
        }
    },
    export: async () => {
        const {config = {}, basePath = '.'} = getConfig();
        const getDownloadPath = (fileName) => {
            return path.join(basePath, fileName)
        }
        const exportUrlsPromises = [];
        const projects = await listProjects();

        for(const [projectName, projectConfig] of Object.entries(config)){
            const project = projects[projectName];
            for(const [language, file] of Object.entries(projectConfig.languages)){
                exportUrlsPromises.push(
                    exportFileUrl(project.id, language, projectConfig.format).then(
                        url => ({id: project.id, name: project.name, url, language})
                    )
                )
            }
        }
        const exportUrls = await Promise.all(exportUrlsPromises);
        const downloads = [];
        for(const exportUrl of exportUrls){
            const destination = getDownloadPath(config[exportUrl.name].languages[exportUrl.language]);
            console.log(`[${exportUrl.name}] Download ${exportUrl.url} -> ${destination}`)
            downloads.push(
                downloadFile(exportUrl.url, destination)
            )
        }

        Promise.all(downloads).then(results => {
            console.log('All done.')
        }).catch(e => {
            console.error('Download failed!', e)
        })
    },
    upload: async () => {
        const {config = {}, basePath = '.'} = getConfig();
        const getDownloadPath = (fileName) => {
            return path.join(basePath, fileName)
        }

        const projects = await listProjects()

        let wait30s = false;
        for(const [projectName, projectConfig] of Object.entries(config)){
            for(const [language, file] of Object.entries(projectConfig.languages)){
                const source = getDownloadPath(file);
                if(!fs.existsSync(source)){
                    console.error(source, "doesn't exist");
                    process.exit(1)
                }
                const projectId = projects[projectName] && projects[projectName].id
                if(!projectId){
                    console.log(`[${projectName}] Ignoring ${source} project doesn't exists`)
                }
                if(wait30s){
                    console.log(`Sleep 30s ...`);
                    await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_UPLOADS_SECONDS * 1000));
                }
                console.log(`[${projectName}] Upload ${source}`);
                try {
                    const result = await uploadFile(projectId, language, source, projectConfig.updating);
                    wait30s = true;
                } catch(error) {
                    console.error('Upload failed!', error)
                    return;
                }
            }
        }

        console.log('All done.')
    }

}

commands[argv._[0]]().catch(error=>{
    console.error("Something went wrong:", error)
})
