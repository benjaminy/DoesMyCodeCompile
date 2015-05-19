#!/usr/bin/env bash

RULES_DIR="../BuildRules"
DEPLOY_DIR="../Deploy"
ALL_RULES=$DEPLOY_DIR/"build_rules.json"

echo "[" > $ALL_RULES

FIRST_RULE=1

# WARNING: Spaces in filenames probably creates problems here
for RULES_FILE in $(find $RULES_DIR -type f); do
    echo "Processing Makefile $RULES_FILE ..."

    if [ $FIRST_RULE -eq 0 ]; then
        echo "," >> $ALL_RULES
    fi
    FIRST_RULE=0
    echo "  {" >> $ALL_RULES
    PATH_NO_PREFIX=${RULES_FILE#$RULES_DIR/}
    echo -n "    path: $PATH_NO_PREFIX" >> $ALL_RULES
    make -q -f $RULES_FILE -s tags > /dev/null 2>&1
    TAGS_CODE=$?
    if [ "$TAGS_CODE" == "1" ]; then
        echo "," >> $ALL_RULES
        echo "    tags: [" >> $ALL_RULES
        FIRST_TAG=1
        for TAG in $(make -f $RULES_FILE -s tags); do
            if [ $FIRST_TAG -eq 0 ]; then
                echo "," >> $ALL_RULES
            fi
            FIRST_TAG=0
            echo -n "      \"$TAG\"" >> $ALL_RULES
        done
        echo "" >> $ALL_RULES
        echo "    ]" >> $ALL_RULES
    fi
    make -q -f $RULES_FILE -s targets > /dev/null 2>&1
    TARGETS_CODE=$?
    if [ "$TARGETS_CODE" == "1" ]; then
        for TARGET in $(make -f $RULES_FILE -s targets); do
            echo "Target $TARGET"
        done
    fi
    echo -n "  }" >> $ALL_RULES
done

echo "" >> $ALL_RULES
echo "]" >> $ALL_RULES
