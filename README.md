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
    "format": "key_value_json",
    "updating" : "terms",
    "languages:{
      "languageKey1": "translationFilePath1",
      "languageKey2": "translationFilePath2"
      }
  },
  ...
}
```

For supported formats check : https://poeditor.com/docs/api#projects_export
Supported updating values are here : https://poeditor.com/docs/api#projects_upload

Example using .poeditorialrc:

```yaml
test-project:
  format: key_value_json
  updating: terms
  languages:
    en: en.json
    de: de.json
```

File paths can be absolute or relative to the directory where configuration is found.

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

