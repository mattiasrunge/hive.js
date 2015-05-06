# hive.js
A somewhat maven2 compatible repository with some extra features.

## Background
hive.js strives to be a lightweight alternativ to servers such as Nexus. It does not implement all the advanced features but have a few additions of it's own.

## Features
* Maven 2 compatible repository
* Easy upload and download with the bundled bash client
* Reserve a new version before an upload
* Unreserve a reserved version
* Serverside regeneration of the maven-metadata.xml
* Plugin based version schemes
* Integration with a Message Bus for new artifacts
* Plugin based message creation
 
## Start the server
```bash
./bin/hive.bin.js server
```
 
## Client commands

### Generic
```bash
./bin/hive-client.sh
Usage: ./bin/client.sh [-c <upload|download|reserve|unreserve|status>] [-r <repositoryId> ] [-g <groupId>] [-a <artifactId>] [-v <version>] [-f <file>] [-p <params>]
```

### Checking server status
```bash
./bin/hive-client.sh -c status
OK
```

### Reserving a revision
This will reserve and return the next valid revision, can be used before a build.
```bash
./bin/hive-client.sh -c reserve -r <RepositoryId> -g <GroupId> -a <ArtifactId>
R1A
```

### Unreserving a revision
This will unreserve a previously reserved revision, can be used if a build fails.
```bash
./bin/hive-client.sh -c unreserve -r <RepositoryId> -g <GroupId> -a <ArtifactId> -v <R-State>
```

### Upload an artifact
This will upload the <Filename> as an artifact and supply the MB with params in a URL-encoded manner.
```bash
./bin/hive-client.sh -c upload -r <RepositoryId> -g <GroupId> -a <ArtifactId> -v <R-State> -f <Filename> -p "inputEventIds%5b%5d=<Id1>&inputEventIds%5b%5d=<Id2>"
```

### Download an artifact
This will save the artifact to the <Filename>.
```bash
./bin/hive-client.sh -c download -r <RepositoryId> -g <GroupId> -a <ArtifactId> -v <R-State> -f <Filename>
OK
```

## Creating a new repository
To create a new repository for use just create an empty directory in the repository path as specified in the configuration file.

## Changing the version scheme to R-State for a repository
1. Open the configuration file.
2. Add a new key to the "repos" hash: ```json "repos": { "<repositoryId>": { "versionScheme": "rstate" } } ```
3. Restart the hive server
