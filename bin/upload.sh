#!/bin/bash

# Upload file
curl -u admin:admin123 -X PUT -T dummy.txt http://localhost:8081/repo1/com/test/hej/dummy/1.0.31/dummy-1.0.31.txt

# Create file.md5
# Upload file.md5

# Create file.sha1
# Upload file.sha1

# Create file.pom
# Upload file.pom

# Create file.pom.md5
# Upload file.pom.md5

# Create file.pom.sha1
# Upload file.pom.sha1

# Download maven-metadata.xml
wget http://localhost:8081/repo1/com/test/hej/dummy/maven-metadata.xml

# Update maven-metadata.xml
# Upload maven-metadata.xml

# Create maven-metadata.xml
# Upload maven-metadata.xml

# Create maven-metadata.xml
# Upload maven-metadata.xml
