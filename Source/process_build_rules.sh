#!/usr/bin/env bash

RULES_DIR="../BuildRules"
DEPLOY_DIR="../Deploy"
ALL_RULES=$DEPLOY_DIR/"build_rules.json"

echo "{" > $ALL_RULES

# WARNING: Spaces in filenames probably creates problems here
for RULES_FILE in $(find $RULES_DIR -type f); do
    echo $RULES_FILE
    make -f $RULES_FILE -s tags
    make -f $RULES_FILE -s targets
done

echo "}" >> $ALL_RULES
