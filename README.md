# POEditorial

This is simple cli tool that allows downloading and uploading translation files from POEditor

# Install

    npm install -D poeditorial
    yarn add -D poeditorial

# Configuration

[cosmiconfig](https://www.npmjs.com/package/cosmiconfig) is used for configuration , check it's documentation for all the possible places to put configuration.

The general configuration looks like this :

```json
{
  "project-name": {
    "defaults":{
      "format": "key_value_json",
      "updating" : "terms",
    },
    "languages":{
      "languageKey1": "translationFilePath1",
      "languageKey2": {
        "updating" : "terms_translations",
        "file": "translationFilePath2"
      }
      }
  },
  ...
}
```
For supported formats check : https://poeditor.com/docs/api#projects_export
Supported updating values are here : https://poeditor.com/docs/api#projects_upload

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
    de: de.json
```

The above file will set default format `key_value_json` and update mode `terms` for all files
and define `en` and `de` languages, where the German file will use the default settings and
the English one will have different updating mode. This will result in uploading only terms for German
and terms and translations for English.


POeditor API token can be specified either via `--access-token` or environment variable `POEDITOR_TOKEN`

# Usage

## List project

```shell
export POEDITOR_TOKEN=my-token
poeditorial list # List configured project with their ids
poeditorial list --all # List all project
```

## Download translations

```shell
poeditorial export
```

## Upload translations

```shell
poeditorial upload
```

