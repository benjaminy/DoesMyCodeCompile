#!/usr/bin/env bash

LOG_FILE="build_rules.log"
RULES_DIR="../BuildRules"
DEPLOY_DIR="../Deploy"
ALL_RULES=$DEPLOY_DIR/"build_rules.json"

echo "Processing build rules" > $LOG_FILE

echo "["

FIRST_RULE=1

function stupid_no_trailing_comma_in_json() {
    if [ $1 -eq 0 ]; then
        echo ","
    fi
}

function check_makefile_for_target() {
    make -q -f $1 -s $2 > /dev/null 2>&1
    echo $?
}

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
