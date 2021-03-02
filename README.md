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
      - [Java config - `maven`](#java-config---maven)
      - [Java config - `dependencyMap`](#java-config---dependencymap)
      - [Java config - `annotateDefaultVal`](#java-config---annotatedefaultval)
    - [`Javascript` config](#javascript-config)
      - [Javascript config - `packageJavascript` / `packageMongoose`](#javascript-config---packagejavascript--packagemongoose)
      - [Javascript config - `javascriptTypeMap` / `mongooseTypeMap`](#javascript-config---javascripttypemap--mongoosetypemap)
      - [Javascript config - `dependencyMap`](#javascript-config---dependencymap)
    - [`Typescript` config](#typescript-config)
      - [Typescript config - `tsconfig`](#typescript-config---tsconfig)
  - [Domain Definition](#domain-definition)
    - [Class Definition](#class-definition)
      - [Class Definition - `attributes`](#class-definition---attributes)
        - [attributes obj - `type`](#attributes-obj---type)
        - [attributes obj - `injection`](#attributes-obj---injection)
        - [attributes obj - `annotate`](#attributes-obj---annotate)
        - [attributes obj - `desc`](#attributes-obj---desc)

## Installation

- install the CLI tool globally

```sh
npm i -g cold-cli
```

## Start CLI

- type `coldx` in the command line after installation of the cli package

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

The CLI requires 3 language based config: java, javascript, and typescript.

### `Java` config

The java config is mapped in `coldConfig.json`.`definition`.`java`.

Here are the key components of the java config.

| key                | desc                                    |
| ------------------ | --------------------------------------- |
| maven              | the definition for generating `pom.xml` |
| dependencyMap      | dependency mapping for java import      |
| annotateDefaultVal | default values of annotations           |

---

#### Java config - `maven`

- Defines how the `pom.xml` will be generated.

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
- Any `${}` (e.g. `${libVer}`) in the json template will be replaced by the same config in coldConfig.json.

---

#### Java config - `dependencyMap`

- Stores the dependency mapping for generated the required _`import ...`_ string in java class.
- for any annotation dependency `@` will be the key-prefix. E.g. `@Data`
- Example:

```json
{
    "dependencyMap": {
        "@Data": "lombok.Data",
        "Set": "java.util.Set"
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

#### Java config - `annotateDefaultVal`

- Defines the default value for each annotation if any.
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

---

### `Javascript` config

The javascript config is mapped in `coldConfig.json`.`definition`.`javascript`.

Here are the key components of the javascript config.

| key               | desc                                                    |
| ----------------- | ------------------------------------------------------- |
| packageJavascript | the definition for generating javascript `package.json` |
| packageMongoose   | the definition for generating mongoose `package.json`   |
| javascriptTypeMap | mapping for javascript type conversion                  |
| mongooseTypeMap   | mapping for mongoose type conversion                    |
| dependencyMap     | define dependency needed for specific type              |

---

#### Javascript config - `packageJavascript` / `packageMongoose`

- Same as `package.json`

---

#### Javascript config - `javascriptTypeMap` / `mongooseTypeMap`

- Type conversion mapping
- Mapping example:

```json
{
    "javascriptTypeMap": {
        "string": ["String", "ObjectId"]
    },
    "mongooseTypeMap": {
        "Schema.Types.ObjectId": "ObjectId"
    }
}
```

- Generated

```js
// javascript
...
export interface ... {
    id?: string;
    ...
}

// mongoose
... new Schema ({
    id: Schema.Types.ObjectId,
    ...
})
```

---

#### Javascript config - `dependencyMap`

- defines the import dependency for specific type
- Example:

```json
{
    "dependencyMap": {
        "Moment": "moment"
    }
}
```

- Generated:

```js
import { Moment } from 'moment';
...
export interface ... {
    lastUpdatedDate?: Moment;
}
```

---

### `Typescript` config

The typescript config is mapped in `coldConfig.json`.`definition`.`typescript`.

Here are the key components of the typescript config.

| key      | desc                                                     |
| -------- | -------------------------------------------------------- |
| tsconfig | the definition for generating javascript `tsconfig.json` |

#### Typescript config - `tsconfig`

- same as the `tsconfig.json` generated

---

## Domain Definition

- The domain definition is mapped in `coldConfig.json`.`definition`.`domain`.
- The definition object types are mainly based on Java.

### Class Definition

- A class is defined as an object with `"type": "obj"`. Object without this property will be treated as a directory / package.
- Here are the 3 main components of a class:

| key          | desc                                                        |
| ------------ | ----------------------------------------------------------- |
| `type`       | indicate the object is a class by `"type": "obj"`           |
| `attributes` | defines the attributes of the class                         |
| `properties` | defines the class properties e.g. annotations and extension |

- Example:

```JSON
{
    "packageA" : {
        "ClassA": {
            "type": "obj",
            "attributes": {
                "classAField": { "type": "boolean" }
            },
            "properties": {
                "annotate" : "Data"
            }
        }
    }

}
```

- Generated java:

```java
package com.cold.common.coldcommonlib.domain.packagea;

import lombok.Data;

@Data
public class ClassA {

    private boolean classAField;

    public ClassA classAField(boolean classAField) {
        this.classAField = classAField;
        return this;
    }

}
```

- Generated javascript:

```js
export interface IClassA {
    classAField?: boolean;
}

export class ClassA implements IClassA {
    constructor(
        public classAField?: boolean,
    ){}
}
```

- Generated Mongoose:

```js
import { Schema } from "mongoose";

const ClassASchema = new Schema ({
    classAField: Boolean,
});

export { ClassASchema };

```

---

#### Class Definition - `attributes`

- the `attributes` key indicates the object storing the class attributes.
- Here are the main components of an attribute object:

| key         | desc                                                | example                   |
| ----------- | --------------------------------------------------- | ------------------------- |
| `type`      | type of attribute                                   | `"type": "String"`        |
| `injection` | type of class for injecting into the attribute type | `"injection": "String"`   |
| `annotate`  | annotation of the attribute                         | `"annotate": "NotNull"`   |
| `desc`      | description of the attribute                        | `"desc": "A short desc."` |

##### attributes obj - `type`

- Java: directly write the same value
- Javascript: base on the `javascriptTypeMap`
- Mongoose: base on the `mongooseTypeMap`

##### attributes obj - `injection`

- Inject the defined class into the attribute type.
- Can be a string or an array
- Example:

```json
"ClassA": {
    "type": "obj",
    "attributes": {
        "classAField1": { "type": "List", "injection" : "String" },
        "classAField2": { "type": "Map", "injection" : [ "String", "String"] }
    },
    "properties": { "annotate" : "Data" }
}
```

- Java:

```java
...
@Data
public class ClassA {
    private List<String> classAField1;
    private Map<String,String> classAField2;
...
}
```

- Javascript:

```js
export interface IClassA {
    classAField1?: string[];
    classAField2?: Map<string,string>;
}

export class ClassA implements IClassA {
    constructor(
        public classAField1?: string[],
        public classAField2?: Map<string,string>,
    ){}
}
```

- Mongoose:

```js
const ClassASchema = new Schema ({
    classAField1: [ String ],
    classAField2: Map,
});
```

##### attributes obj - `annotate`

- annotation is mainly for java code generation.
- it can be a string / an object / a array.
- Example:

```json
"attributes": {
    "classAField1": { "type": "String", "annotate" : "NotNull" },
    "classAField2": { "type": "String", "annotate": [
        { "NotNull" : { "message" : "custAcctId cannot be null" }},
        { "Length" : { "min" : 15, "max" : 15, "message" : "Invalid custAcctId" } }
    ]}
},
```

- Generated Java:

```java
@NotNull
private String classAField1;

@NotNull(message = "custAcctId cannot be null")
@Length(min = 15, max = 15, message = "Invalid custAcctId")
private String classAField2;
```

##### attributes obj - `desc`

- Defines the comment of the attribute
- Can be a string or an array of string

```json
"classAField1": { "type": "String", "desc" : "a desc" },
"classAField2": { "type": "String", "desc": [ "desc line 1", "desc line 2" ]}
```

- Generated desc:

```java
/** a desc */
private String classAField1;

/**
    * desc line 1
    * desc line 2
*/
private String classAField2;
```
