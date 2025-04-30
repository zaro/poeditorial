#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { cosmiconfigSync } = require('cosmiconfig');
const MODULE_NAME = 'poeditorial';
const WAIT_BETWEEN_UPLOADS_SECONDS = 30;

const fetch = require('node-fetch');
const FormData = require('form-data');

const POEDITOR_API_BASE = 'https://api.poeditor.com/v2';

const argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .command('list [projects...]', 'List projects')
    .command('export [projects...]', 'Get translations from POEditor')
    .command('upload [projects...]', 'Upload translations to POEditor')
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
    const form = new FormData();
    for (const [k, v] of Object.entries(data)) {
        form.append(k, v);
    }
    return fetch(`${POEDITOR_API_BASE}${url}`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
    })
    .then(async response => {
        const json = await response.json();
        if(json.response && json.response.status == 'success'){
            return json;
        }
        throw json;
    });
}

function getConfig(){
    const foundConfig = cosmiconfigSync(MODULE_NAME).search();
    if(!foundConfig){
        console.error('No configuration found!');
        process.exit(1);
    }
    const {config = {}, filepath} = foundConfig;
    const basePath = path.dirname(filepath);
    const normalizedConfig = {};
    for(const [projectName, projectConfig] of Object.entries(config)){
        if (argv.projects && !argv.projects.includes(projectName)) {
            continue;
        }

        if(!('languages' in projectConfig)) {
            console.error(`No languages defined for project ${projectName}`)
            process.exit(1)
        }
        if(typeof projectConfig['languages'] !== 'object') {
            console.error(`languages must be object for project ${projectName}`)
            process.exit(1)
        }
        const defaults = projectConfig['defaults'] || {};
        const languagesConfig = {};
        for(const [language, languageConfig] of Object.entries(projectConfig['languages'])){
            let updatedConfig = {...defaults};
            if(typeof languageConfig === 'string'){
                updatedConfig.file = languageConfig
            } else {
                updatedConfig = {
                    ...updatedConfig,
                    ...languageConfig,
                }
            }
            languagesConfig[language] = updatedConfig;
            if(!('format' in updatedConfig)) {
                console.error(`'format' is not defined for project ${projectName} language ${language}`)
                process.exit(1)
            }
            if(!('updating' in updatedConfig)) {
                console.error(`'update' not defined for project ${projectName} language ${language}`)
                process.exit(1)
            }
            if(!('file' in updatedConfig)) {
                console.error(`'file' not specified for project ${projectName} language ${language}`)
                process.exit(1)
            }
        }
        normalizedConfig[projectName] = {
            'languages': languagesConfig,
        }
    }
    return {
        config: normalizedConfig,
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

async function uploadFile(projectId, language, filePath, updating, optionalParams) {
    const form = new FormData();
    form.append('api_token', argv.accessToken);
    form.append('id', projectId);
    form.append('updating', updating);
    form.append('language', language);
    form.append('file', fs.createReadStream(filePath));
    form.append('overwrite', optionalParams?.overwrite || 0);
    form.append('sync_terms', optionalParams?.sync_terms || 0);
    if (optionalParams?.tags) form.append('tags', optionalParams.tags);
    form.append('read_from_source', optionalParams?.read_from_source || 0);
    form.append('fuzzy_trigger', optionalParams?.fuzzy_trigger || 0);

    const response = await fetch(`${POEDITOR_API_BASE}/projects/upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
    });
    const json = await response.json();
    if(json.response && json.response.status == 'success'){
        return json.result;
    }
    throw json;
}

async function downloadFile(url, destination = undefined) {
    const response = await fetch(url);
    const buffer = await response.buffer();

    if(destination){
        fs.writeFileSync(destination, buffer);
        return buffer;
    }
    return buffer;
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
            for(const [language, languageConfig] of Object.entries(projectConfig.languages)){
                exportUrlsPromises.push(
                    exportFileUrl(project.id, language, languageConfig.format).then(
                        url => ({id: project.id, name: project.name, url, language})
                    )
                )
            }
        }
        const exportUrls = await Promise.all(exportUrlsPromises);
        const downloads = [];
        for(const exportUrl of exportUrls){
            const destination = getDownloadPath(config[exportUrl.name].languages[exportUrl.language].file);
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
        const validUpdatingModes = ['terms', 'terms_translations', 'translations'];
        for(const [projectName, projectConfig] of Object.entries(config)){
            for(const [language, languageConfig] of Object.entries(projectConfig.languages)){
                const source = getDownloadPath(languageConfig.file);
                if(!fs.existsSync(source)){
                    console.error(source, "doesn't exist");
                    process.exit(1)
                }
                const projectId = projects[projectName] && projects[projectName].id
                if(!projectId){
                    console.log(`[${projectName}] Ignoring ${source} project doesn't exists`)
                }
                if(!validUpdatingModes.includes(languageConfig.updating)) {
                    console.log(`[${projectName}] Skip ${source} with mode ${languageConfig.updating}`);
                    continue;
                }
                if(wait30s){
                    console.log(`Sleep 30s ...`);
                    await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_UPLOADS_SECONDS * 1000));
                }
                console.log(`[${projectName}] Upload ${source} with mode ${languageConfig.updating}`);
                try {
                    const result = await uploadFile(projectId, language, source, languageConfig.updating, languageConfig.uploadOptionalParams);
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
