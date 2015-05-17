#!/usr/bin/env bash

RULES_DIR="../BuildRules"

# WARNING: Spaces in filenames probably creates problems here
for RULES_FILE in $(find $RULES_DIR -type f); do
    make -f $RULES_FILE -s tags
    make -f $RULES_FILE -s targets
done
