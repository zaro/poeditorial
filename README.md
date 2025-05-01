# POEditorial

This is simple cli tool that allows downloading and uploading translation files from POEditor

# Install

    npm install -D poeditorial
    yarn add -D poeditorial

# Configuration

[cosmiconfig](https://www.npmjs.com/package/cosmiconfig) is used for configuration , check it's
documentation for all the possible places to put configuration.

The general configuration looks like this :

```json
{
    "project-name": {
        "defaults": {
            "format": "key_value_json",
            "updating": "terms",
            "params": {
                "uploadOptionalParams": {
                    "overwrite": 0,
                    "sync_terms": 0,
                    "tags": "",
                    "read_from_source": 0,
                    "fuzzy_trigger": 0
                }
            }
        },
        "languages": {
            "languageKey1": "translationFilePath1",
            "languageKey2": {
                "updating": "terms_translations",
                "file": "translationFilePath2",
                "uploadOptionalParams": {
                    //...
                }
            }
        }
    }
    //...
}
```

For supported formats check : https://poeditor.com/docs/api#projects_export Supported updating
values are here : https://poeditor.com/docs/api#projects_upload For supported `uploadOptionalParams`
check: https://poeditor.com/docs/api#projects_upload

File paths can be absolute or relative to the directory where configuration is found.

Example using .poeditorialrc:

```yaml
test-project:
    defaults:
        format: key_value_json
        updating: terms
    languages:
        en:
            file: en.json
            updating: terms_translations
            uploadOptionalParams:
                overwrite: 0
                sync_terms: 0
                tags: ''
                read_from_source: 0
                fuzzy_trigger: 0
        de: de.json
        fr:
            file: fr.json
            updating: skip
```

The above file will set default format `key_value_json` and update mode `terms` for all files and
define `en`,`de` and `fr` languages, where the German file will use the default settings and the
English one will have different updating mode and the French will never be downloaded. This will
result in uploading only terms for German, terms and translations for English, and skipping upload
for french.

POeditor API token can be specified either via `--access-token` or environment variable
`POEDITOR_TOKEN`

# Usage

## List project

```shell
export POEDITOR_TOKEN=my-token
poeditorial list # List configured project with their ids
poeditorial list --all # List all project
```

## Download translations

```shell
poeditorial export # export all configured projects
poeditorial export test-project # export only test-project
```

## Upload translations

```shell
poeditorial upload
poeditorial upload test-project # upload only test-project
```
