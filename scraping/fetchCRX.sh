#!/bin/bash

# fetchCRX.sh
#
# Fetches a CRX extension archive given ID or file name containing IDs.
#
# CRX files are created in the current directory with names ID.crx (where ID is
# the extension's unique ID).
#
# Help from:
# https://github.com/brave/release-tools/blob/master/bin/updateExtensions.js#L254
#
# Sid Stamm <sstamm@brave.com>
# June 2018
#

CHROME_VERSION=67.0.3396.87
URL_PREFIX="https://clients2.google.com/service/update2/crx?response=redirect&prodversion=${CHROME_VERSION}&x=id%3D"
URL_SUFFIX="%26uc%26lang%3Den-US&prod=chrome"
OUTPUT_DIR=output

# Sample ID
ID=dhdgffkkebhmkfjojejmpbldmpobfkfo

if [ "$#" -gt 1 ] ; then
  echo "Usage: ./fetchCRX.sh <id>|<file>"
  echo "   The file must contain one ID per line."
  echo "       e.g., ./fetchCRX.sh ${ID}"
  echo "       e.g., ./fetchCRX.sh id-file.txt"
  exit 1
fi

mkdir -p $OUTPUT_DIR

# No arguments, use stdin
if [ "$#" -eq 0 ] ; then
  echo "Obtaining IDs from stdin..."
  while read LINE ; do
    wget -q --show-progress "${URL_PREFIX}${LINE}${URL_SUFFIX}" -O "${OUTPUT_DIR}/${LINE}.crx"
  done
  echo "Done."
  exit 0
fi

# One argument: either an ID or a file
if [ -f $1 ] ; then
  while read LINE ; do
    echo "Processing ${LINE}"
    wget --no-check-certificate -N --timeout=10 --tries=1 "${URL_PREFIX}${LINE}${URL_SUFFIX}" -O "${OUTPUT_DIR}/${LINE}.crx"
  done < $1
  echo "Done."
else
    #echo $1
    #echo "${URL_PREFIX}$1${URL_SUFFIX}"
    wget --no-check-certificate -N --timeout=10 --tries=1 "${URL_PREFIX}$1${URL_SUFFIX}" -O "${OUTPUT_DIR}/$1.crx"
fi


# ARGC=$#
# i=1
# while [ $i -le $ARGC ]; do
#   ID="${!i}"
#   wget "${URL_PREFIX}${ID}${URL_SUFFIX}" -O "${ID}.crx"
#   i=$((i+1))
# done

