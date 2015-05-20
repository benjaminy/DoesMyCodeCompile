#!/usr/bin/env bash

LOG_FILE="build_rules.log"
RULES_DIR="../BuildRules"
DEPLOY_DIR="../Deploy"
ALL_RULES=$DEPLOY_DIR/"build_rules.json"

# TODO: The purpose of the next few lines is to figure out if there are
# any new makefiles to process.  Can we get make to do this somehow?
MOST_RECENT_RULE=$(find $RULES_DIR -type f -print0 | xargs -0 stat -f "%m %N" | sort -rn | head -1 | cut -f1 -d" ")
ALL_RULES_TIME=$(stat -f "%m %N" $ALL_RULES | cut -f1 -d" ")

# >&2 echo "Dir: $MOST_RECENT_RULE   File: $ALL_RULES_TIME"

if [ $ALL_RULES_TIME -gt $MOST_RECENT_RULE ]; then
    echo "Build rules up-to-date." > $LOG_FILE
    cat $ALL_RULES
    exit 0
else
    echo "More recent build rule. Updating." > $LOG_FILE
fi

function stupid_no_trailing_comma_in_json() {
    if [ $1 -eq 0 ]; then
        echo ","
    fi
}

function check_makefile_for_target() {
    make -q -f $1 -s $2 > /dev/null 2>&1
    echo $?
}

echo "["

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
