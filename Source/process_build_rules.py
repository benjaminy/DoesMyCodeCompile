#!/usr/bin/env python

import sys
import os

LOG_FILE   = open( "build_rules.log", "w" )
RULES_DIR  = "../BuildRules"
DEPLOY_DIR = "../Deploy"
ALL_RULES  = DEPLOY_DIR + "/build_rules.json"

# TODO: The purpose of the next few lines is to figure out if there are
# any new makefiles to process.  Can we get make to do this somehow?

def mostRecentTimestampInTree( f, filt ):
    if os.path.isfile( f ):
        if filt( f ):
            return os.path.getmtime( f )
        else:
            return None
    else if os.path.isdir( f ):
        most_recent = None
        for f2 in os.listdir( f ):
            f2_recent = mostReventTimestamp( f2, filt )
            if most_recent is None or f2_recent > most_recent:
                most_recent = f2_recent
        return most_recent
    else:
        # Interesting. What is f?
        return None

MOST_RECENT_RULE = mostRecentTimestampInTree $RULES_DIR
ALL_RULES_TIME   = os.path.getmtime( ALL_RULES )

# >&2 echo "Dir: $MOST_RECENT_RULE   File: $ALL_RULES_TIME"

if ALL_RULES_TIME >= MOST_RECENT_RULE:
    print( "Build rules up-to-date.", file=LOG_FILE )
    for line in open( ALL_RULES ):
        print line,
    sys.exit( 0 )
else:
    print( "More recent build rule. Updating.", file=LOG_FILE )

def stupid_no_trailing_comma_in_json( first ):
    if not first:
        print( "," )

def check_makefile_for_target( mkfile, target ):
    make -q -f $1 -s $2 > /dev/null 2>&1
    echo $?

print( "[" )

##### Cursor

FIRST_RULE=1

# WARNING: Spaces in filenames probably creates problems here
find $RULES_DIR -type f | while read -r RULES_FILE; do
    echo "Processing Makefile $RULES_FILE ..." >> $LOG_FILE

    stupid_no_trailing_comma_in_json $FIRST_RULE
    FIRST_RULE=0

    echo "  {"
    PATH_NO_PREFIX=${RULES_FILE#$RULES_DIR/}
    echo -n "    \"path\": \"$PATH_NO_PREFIX\""

    TAGS_CODE=$(check_makefile_for_target $RULES_FILE "tags")
    if [ "$TAGS_CODE" == "1" ]; then
        echo ","
        echo "    \"tags\": ["
        FIRST_TAG=1
        make -f $RULES_FILE -s tags | while read -r TAG; do
            stupid_no_trailing_comma_in_json $FIRST_TAG
            FIRST_TAG=0
            echo -n "      \"$TAG\""
        done
        echo ""
        echo -n "    ]"
    fi

    TARGETS_CODE=$(check_makefile_for_target $RULES_FILE "targets")
    if [ "$TARGETS_CODE" == "1" ]; then
        echo ","
        echo "    \"targets\": ["
        FIRST_TARGET=1
        make -f $RULES_FILE -s targets | while read -r TARGET; do
            stupid_no_trailing_comma_in_json $FIRST_TARGET
            FIRST_TARGET=0
            echo -n "      \"$TARGET\""
        done
        echo ""
        echo -n "    ]"
    fi

    echo ""
    echo -n "  }"
done

echo ""
echo "]"
