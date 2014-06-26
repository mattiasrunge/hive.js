#!/bin/bash

#############################################################################
## Load configuration
#############################################################################

DIR=$(dirname $0)

# Default values
SERVER=${HIVE_SERVER:-"http://localhost:8081"}
USERNAME=${HIVE_USERNAME:-"admin"}
PASSWORD=${HIVE_PASSOWRD:-"admin123"}

#############################################################################
## Parse command line arguments 
#############################################################################

usage() { echo "Usage: $0 [-c <upload|download|reserve|unreserve|status>] [-r <repositoryId> ] [-g <groupId>] [-a <artifactId>] [-v <version>] [-f <file>] [-p <params>]" 1>&2; exit 1; }

while getopts ":r:c:g:a:v:f:p:" o; do
    case "${o}" in
        c)
            c=${OPTARG}
            ((c == "upload" || c == "download" || c == "reserve" || c == "unreserve" || c == "status")) || usage
            ;;
        r)
            r=${OPTARG}
            ;;
        g)
            g=${OPTARG}
            ;;
        a)
            a=${OPTARG}
            ;;
        v)
            v=${OPTARG}
            ;;
        f)
            f=${OPTARG}
            ;;
        p)
            p=${OPTARG}
            ;;
        *)
            usage
            ;;
    esac
done
shift $((OPTIND-1))

if [ "${c}" != "status" ]; then
  if [ -z "${c}" ] || [ -z "${r}" ]; then
    usage
  elif [ "${c}" == "upload" ]; then
    if [ -z "${g}" ] || [ -z "${v}" ] || [ -z "${f}" ]; then
      usage
    fi
  elif [ "${c}" == "download" ]; then
    if [ -z "${g}" ] || [ -z "${a}" ] || [ -z "${v}" ] || [ -z "${f}" ]; then
      usage
    fi
  elif [ "${c}" == "reserve" ]; then
    if [ -z "${g}" ] || [ -z "${a}" ]; then
      usage
    fi
  elif [ "${c}" == "unreserve" ]; then
    if [ -z "${g}" ] || [ -z "${a}" ] || [ -z "${v}" ]; then
      usage
    fi
  fi
fi


#############################################################################
## Define variables
#############################################################################

REPOSITORYID="${r}"
GROUPID="${g}"
ARTIFACTID="${a}"
VERSION="${v}"
FILE="${f}"
GROUPPATH=${GROUPID//\./\/} 
PARAMS="?${p}"

if [ -n "$FILE" ]; then
  FILENAME=$(basename $FILE)
  PACKAGE=`rev <<< "$FILENAME" | cut -d"." -f1 | rev`

  if [ -z $ARTIFACTID ]; then
    ARTIFACTID=`rev <<< "$FILENAME" | cut -d"." -f2- | rev`
  fi
fi


#############################################################################
## Upload an artifact
#############################################################################

if [ "${c}" == "upload" ]; then
  echo "RepositoryId: $REPOSITORYID"
  echo "GroupId: $GROUPID"
  echo "ArtifactId: $ARTIFACTID"
  echo "Version: $VERSION"
  echo "File: $FILE"
  echo "Package: $PACKAGE"
  echo "Params: $PARAMS"

  ARTIFACTSHA1=$(sha1sum $FILE | cut -d" " -f1)
  ARTIFACTMD5=$(md5sum $FILE | cut -d" " -f1)
  
  POMFILE=$(mktemp -q)
  cat $DIR/../resources/template.pom > $POMFILE
  sed -i s/{group}/$GROUPID/g $POMFILE
  sed -i s/{artifact}/$ARTIFACTID/g $POMFILE
  sed -i s/{version}/$VERSION/g $POMFILE
  sed -i s/{package}/$PACKAGE/g $POMFILE
  POMSHA1=$(sha1sum $POMFILE | cut -d" " -f1)
  POMMD5=$(md5sum $POMFILE | cut -d" " -f1)

  echo curl -f -u $USERNAME:$PASSWORD -X PUT -T $FILE "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.$PACKAGE$PARAMS"
  curl -f -u $USERNAME:$PASSWORD -X PUT -T $FILE "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.$PACKAGE$PARAMS"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""

  echo curl -f -u $USERNAME:$PASSWORD --request PUT "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.$PACKAGE.sha1$PARAMS" -d "$ARTIFACTSHA1"
  curl -f -u $USERNAME:$PASSWORD --request PUT "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.$PACKAGE.sha1$PARAMS" -d "$ARTIFACTSHA1"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""

  echo curl -f -u $USERNAME:$PASSWORD --request PUT "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.$PACKAGE.md5$PARAMS" -d "$ARTIFACTMD5"
  curl -f -u $USERNAME:$PASSWORD --request PUT "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.$PACKAGE.md5$PARAMS" -d "$ARTIFACTMD5"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""

  echo curl -f -u $USERNAME:$PASSWORD -X PUT -T $POMFILE "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.pom$PARAMS"
  curl -f -u $USERNAME:$PASSWORD -X PUT -T $POMFILE "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.pom$PARAMS"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""

  echo curl -f -u $USERNAME:$PASSWORD --request PUT "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.pom.sha1$PARAMS" -d "$POMSHA1"
  curl -f -u $USERNAME:$PASSWORD --request PUT "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.pom.sha1$PARAMS" -d "$POMSHA1"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""

  echo curl -f -u $USERNAME:$PASSWORD --request PUT "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.pom.md5$PARAMS" -d "$POMMD5"
  curl -f -u $USERNAME:$PASSWORD --request PUT "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.pom.md5$PARAMS" -d "$POMMD5"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""
  
  echo curl -f -u $USERNAME:$PASSWORD "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/regenerate"
  curl -f -u $USERNAME:$PASSWORD "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/regenerate"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""
elif [ "${c}" == "download" ]; then 
  echo wget --user=$USERNAME --password=$PASSWORD "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.$PACKAGE" -O $FILE
  wget -nv --user=$USERNAME --password=$PASSWORD "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/$ARTIFACTID-$VERSION.$PACKAGE" -O $FILE
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""
elif [ "${c}" == "reserve" ]; then 
  #echo curl -f -u $USERNAME:$PASSWORD "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/reserve"
  curl -f -u $USERNAME:$PASSWORD "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/reserve"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""
elif [ "${c}" == "unreserve" ]; then 
  echo curl -f -u $USERNAME:$PASSWORD "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/unreserve"
  curl -f -u $USERNAME:$PASSWORD "$SERVER/$REPOSITORYID/$GROUPPATH/$ARTIFACTID/$VERSION/unreserve"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""
elif [ "${c}" == "status" ]; then
  curl -f "$SERVER/status"
  if [[ $? != 0 ]]; then
    exit $?
  fi
  echo ""
fi

