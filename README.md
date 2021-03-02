# **COLD-CLI**

> JSON defines ALL @.@

COLD-CLI is a Javascript tool for CrOss Language Domain Generation from a single JSON file. The lib help simplify the process when creating entity classes for different language. The single JSON file definition also help make the domain definition more consistent.

Currently supports: `Java`, `JavaScript`, `Mongoose(Js)`

**Note:** the project is still under constant development!

## Installation

-   install the CLI tool globally

```sh
npm i -g cold-cli
```

## Start CLI

-   type `coldx` in the command line after installation of the cli package

```sh
coldx
```

## Sample Project Structure

Here is a sample project structure for using the CLI tool. (ref: https://github.com/hongckh/cold-cli/tree/main/example)

```
.
+-- coldConfig.json
+-- definition
|   +-- config
    |   +-- java.json
    |   +-- javascript.json
    |   +-- typescript.json
|   +-- entities
    |   +-- domain.json
```

## coldConfig.json

The CLI will look for a config file `coldConfig.json` upon initialization. You have to input the config file location. You may leave it blank if the `coldConfig.json` is your current directory.

```sh
# ? COLD-CLI config [coldConfig.json] directory (blank for current directory): <input the coldConfig.json path>
```

### Config variables

| variable                      | description                                                                  | example                    |
| ----------------------------- | ---------------------------------------------------------------------------- | -------------------------- |
| `libVer`                      | generated lib version. Linked to pom and package.json                        | `0.0.1`                    |
| `target`.`baseDir`            | the base directory of the generated domain files                             | `./`                       |
| `target`.`javaDir`            | output directory of `Java` domain files                                      | `cold-common-lib-java`     |
| `target`.`jsDir`              | output directory of `Javascript` domain files                                | `cold-common-lib-js`       |
| `target`.`mongooseDir`        | output directory of `Mongoose` domain files                                  | `cold-common-lib-mongoose` |
| `target`.`javaRefreshDir`     | `Java` directory to be cleared per code generation                           | `src/main`                 |
| `target`.`jsRefreshDir`       | `Javascript` directory to be cleared per code generation                     | `src/domain`               |
| `target`.`mongooseRefreshDir` | `Mongoose` directory to be cleared per code generation                       | `src/domain`               |
| `definition`.`baseDir`        | the directory containing the config files                                    | `./example/definition`     |
| `definition`.`domain`         | the config file defining the domain entities                                 | `./example/definition`     |
| `definition`.`java`           | the `Java` config file                                                       | `config/java.json`         |
| `definition`.`javascript`     | the `Javascript` config file                                                 | `config/javascript.json`   |
| `definition`.`typescript`     | the `Mongoose` config file                                                   | `config/typescript.json`   |
| `commentBlockMaxCharPerLine`  | the max. character per line of comment                                       | `80`                       |
| `indentation`                 | the number of space as indentation                                           | `4`                        |
| `logEnabled`                  | indicate if log is enabled                                                   | `true`/`false`             |
| `logDir`                      | indicate log directory,<br/> enables log automatically if `logEnabled` is not set | `./`                       |

#### Sample coldConfig.json

```json
{
    "libVer": "0.0.1",
    "target": {
        "baseDir": "../",
        "javaDir": "cold-common-lib",
        "javaRefreshDir": "src/main/java/com/cold/common/coldcommonlib/domain",
        "mongooseDir": "cold-common-lib-mongoose",
        "mongooseRefreshDir": "src/domain",
        "jsDir": "cold-common-lib-js",
        "jsRefreshDir": "src/domain"
    },
    "definition": {
        "baseDir": "./example/definition",
        "domain": "entities/domain.json",
        "java": "config/java.json",
        "javascript": "config/javascript.json",
        "typescript": "config/typescript.json"
    },
    "commentBlockMaxCharPerLine": 80,
    "indentation": 4,
    "logEnabled": true,
    "logDir": "logs"
}
```

## Domain Definition

The domain is be defined in the file `xxx.json`. The definition is mainly based on Java.

### Class Definition

```JSON
{
    "Result": {
        "type": "obj",
        "attributes": {
            "success": { "type": "boolean" },
            "message": { "type": "String" },
            "error": { "type": "String" }
        },
        "properties": {
        }
    }
}
```
