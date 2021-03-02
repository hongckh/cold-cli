# **COLD-CLI**

> JSON defines ALL @.@

COLD-CLI is a Javascript tool for CrOss Language Domain Generation from a single JSON file. The lib help simplify the process when creating entity classes for different language. The single JSON file definition also help make the domain definition more consistent.

Currently supports: `Java`, `JavaScript`, `Mongoose(Js)`

**Note:** the project is still under constant development!

## Table of content

- [**COLD-CLI**](#cold-cli)
  - [Table of content](#table-of-content)
  - [Installation](#installation)
  - [Start CLI](#start-cli)
  - [Sample Project Structure](#sample-project-structure)
  - [coldConfig.json](#coldconfigjson)
    - [Config variables](#config-variables)
      - [Sample coldConfig.json](#sample-coldconfigjson)
  - [Language based config](#language-based-config)
    - [`Java` config](#java-config)
      - [`Java` config - `maven`](#java-config---maven)
      - [`Java` config - `dependencyMap`](#java-config---dependencymap)
      - [`Java` config - `annotateDefaultVal`](#java-config---annotatedefaultval)
  - [Domain Definition](#domain-definition)
    - [Class Definition](#class-definition)
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

| variable                      | description                                                                       | example                    |
| ----------------------------- | --------------------------------------------------------------------------------- | -------------------------- |
| `libVer`                      | generated lib version. Linked to pom and package.json                             | `0.0.1`                    |
| `target`.`baseDir`            | the base directory of the generated domain files                                  | `./`                       |
| `target`.`javaDir`            | output directory of `Java` domain files                                           | `cold-common-lib-java`     |
| `target`.`jsDir`              | output directory of `Javascript` domain files                                     | `cold-common-lib-js`       |
| `target`.`mongooseDir`        | output directory of `Mongoose` domain files                                       | `cold-common-lib-mongoose` |
| `target`.`javaRefreshDir`     | `Java` directory to be cleared per code generation                                | `src/main`                 |
| `target`.`jsRefreshDir`       | `Javascript` directory to be cleared per code generation                          | `src/domain`               |
| `target`.`mongooseRefreshDir` | `Mongoose` directory to be cleared per code generation                            | `src/domain`               |
| `definition`.`baseDir`        | the directory containing the config files                                         | `./example/definition`     |
| `definition`.`domain`         | the config file defining the domain entities                                      | `./example/definition`     |
| `definition`.`java`           | the `Java` config file                                                            | `config/java.json`         |
| `definition`.`javascript`     | the `Javascript` config file                                                      | `config/javascript.json`   |
| `definition`.`typescript`     | the `Mongoose` config file                                                        | `config/typescript.json`   |
| `commentBlockMaxCharPerLine`  | the max. character per line of comment                                            | `80`                       |
| `indentation`                 | the number of space as indentation                                                | `4`                        |
| `logEnabled`                  | indicate if log is enabled                                                        | `true`/`false`             |
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

## Language based config

The CLI requires 3 language based config `java`, `javascript`, and `typescript`.

### `Java` config

The `Java` is mapped in `coldConfig.json`.`definition`.`java`.

Here are the key components of the `Java` config.

| key                | desc                                    |
| ------------------ | --------------------------------------- |
| maven              | the definition for generating `pom.xml` |
| dependencyMap      | dependency mapping for java import      |
| annotateDefaultVal | default values of annotations           |

---

#### `Java` config - `maven`

This part defines how the `pom.xml` will be generated.

- Definition:

```json
{
    "maven": {
        "project": {
            "@attribute": {
                "xmlns": "http://maven.apache.org/POM/4.0.0",
                "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                "xsi:schemaLocation": "http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd"
            },
            "modelVersion": "4.0.0",
            "parent": {
                "groupId": "org.springframework.boot",
                "artifactId": "spring-boot-starter-parent",
                "version": "2.3.0.RELEASE"
            },
            "groupId": "com.cold.common",
            "artifactId": "cold-common-lib",
            "version": "${libVer}",
            "name": "cold-common-lib",
            "description": "Cold Common Domain Java Lib Example"
        }
    }
}
```

- Generated:

```xml
<?xml version="1.0"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>2.3.0.RELEASE</version>
  </parent>
  <groupId>com.cold.common</groupId>
  <artifactId>cold-common-lib</artifactId>
  <version>0.0.1</version>
  <name>cold-common-lib</name>
  <description>Cold Common Domain Java Lib Example</description>
</project>
```

- The xml generation is based on the `xmlbuilder` package.
- Any `${}` (e.g. `${libVer}`) in the json template will be replaced by the same config in `coldConfig.json`.

---

#### `Java` config - `dependencyMap`

- `dependencyMap` stores the dependency mapping for generated the required _`import ...`_ string in java class.
- for any annotation dependency `@` will be the key-prefix. E.g. `@Data`
- Example:

```json
{
    "dependencyMap": {
        "@Data": "lombok.Data",
        "Set": "java.util.Set",
    }
}
```

- Generated:

```java
import lombok.Data;
import java.util.Set;
...
@Data
public class ... {
    ...
    private Set<String> ...
}
```

---

#### `Java` config - `annotateDefaultVal`

- `annotateDefaultVal` defines the default value for each annotation if any.
- Example:

```json
{
    "annotateDefaultVal": {
        "EqualsAndHashCode": { "callSuper": true },
        "ToString": { "callSuper": true, "includeFieldNames": true },
        "JsonInclude": "JsonInclude.Include.NON_NULL"
    }
}
```

- Generated:

```java
...
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true, includeFieldNames = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ...
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
