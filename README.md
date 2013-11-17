hive.js
=======

A somewhat maven2 compatible repository with some extra features.

Background
----------
hive.js strives to be a lightweight alternativ to servers such as Nexus. It does not implement all the advanced features but have a few additions of it's own.

Features
--------
* Maven 2 compatible repository
* Easy upload and download with the bundled bash client
* Reserve a new version before an upload
* Unreserve a reserved version
* Serverside regeneration of the maven-metadata.xml
* Plugin based version schemes
* Integration with a Message Bus for new artifacts
* Plugin based message creation
 
Start the server
----------------
```bash
./bin/hive.bin.js server
```
 
Client commands
----------------
```bash
./bin/hive-client.sh
Usage: ./bin/client.sh [-c <upload|download|reserve|unreserve|status>] [-r <repositoryId> ] [-g <groupId>] [-a <artifactId>] [-v <version>] [-f <file>] [-p <params>]
```
