#!/usr/bin/env python3

import sys
import os
import subprocess

LOG_FILE   = open( "build_rules.log", "w" )
RULES_DIR  = "../BuildRules"
DEPLOY_DIR = "../Deploy"
RULES_INFO = DEPLOY_DIR + "/build_rules.json"

# TODO: The purpose of the next few lines is to figure out if there are
# any new makefiles to process.  Can we get make to do this somehow?

def mostRecentTimestampInTree( f, filt ):
    # print( f + str( type( f ) ) )
    if os.path.isfile( f ):
        # print( "Is file" )
        if filt( f ):
            return os.path.getmtime( f )
        else:
            return None
    elif os.path.isdir( f ):
        # print( "Is dir" )
        most_recent = None
        for f2 in os.listdir( f ):
            f2_recent = mostRecentTimestampInTree(
                os.path.join( f, f2 ), filt )
            if most_recent is None or f2_recent > most_recent:
                most_recent = f2_recent
        return most_recent
    else:
        print( "Is SOMETHING ELSE" )
        # Interesting. What is f?
        return None

def mkSuffix( f ):
    return os.path.basename( f ).endswith( ".mk" )
    
MOST_RECENT_RULE = mostRecentTimestampInTree( RULES_DIR, mkSuffix )
RULES_INFO_TIME  = os.path.getmtime( RULES_INFO )

# >&2 echo "Dir: $MOST_RECENT_RULE   File: $RULES_INFO_TIME"

print( RULES_INFO_TIME )
print( MOST_RECENT_RULE )

if RULES_INFO_TIME >= MOST_RECENT_RULE:
    print( "Build rules up-to-date.", file=LOG_FILE )
    for line in open( RULES_INFO ):
        print( line, end="" )
    sys.exit( 0 )
else:
    print( "More recent build rule. Updating.", file=LOG_FILE )

def stupid_no_trailing_comma_in_json( first ):
    if not first:
        print( "," )

def check_makefile_for_target( mkfile, target ):
    m = [ "make", "-q", "-s", "-f", mkfile, target ]
    process = subprocess.Popen( m, stdout=PIPE )
    ( output, err ) = process.communicate()
    return process.wait()

print( "[" )

##### Cursor

FIRST_RULE = True

def crawl( f, tags ):
    # TODO: Ignore Examples directory
    filename = os.path.basename( f )
    name_parts = filename.split( "_" );
    if len( name_parts ) > 1:
        kind = name_parts[0]
        tag_value = kind.join( " " )
    else:
        kind = ""
        tag_value = name_parts[0]
    if os.path.isfile( f ):
        if not name.endswith( ".mk" ):
            return
        print( "Processing Makefile %s ..." % f, file=LOG_FILE )

        stupid_no_trailing_comma_in_json( FIRST_RULE )
        FIRST_RULE = False
        print( "  {" )

    elif os.path.isdir( f ):
        most_recent = None
        for f2 in os.listdir( f ):
            crawl( f2, filt )
        return most_recent
    else:
        # Interesting. What is f?
        return None

# # WARNING: Spaces in filenames probably creates problems here
# find $RULES_DIR -type f | while read -r RULES_FILE; do


#     PATH_NO_PREFIX=${RULES_FILE#$RULES_DIR/}
#     echo -n "    \"path\": \"$PATH_NO_PREFIX\""

#     TAGS_CODE=$(check_makefile_for_target $RULES_FILE "tags")
#     if [ "$TAGS_CODE" == "1" ]; then
#         echo ","
#         echo "    \"tags\": ["
#         FIRST_TAG=1
#         make -f $RULES_FILE -s tags | while read -r TAG; do
#             stupid_no_trailing_comma_in_json $FIRST_TAG
#             FIRST_TAG=0
#             echo -n "      \"$TAG\""
#         done
#         echo ""
#         echo -n "    ]"
#     fi

#     TARGETS_CODE=$(check_makefile_for_target $RULES_FILE "targets")
#     if [ "$TARGETS_CODE" == "1" ]; then
#         echo ","
#         echo "    \"targets\": ["
#         FIRST_TARGET=1
#         make -f $RULES_FILE -s targets | while read -r TARGET; do
#             stupid_no_trailing_comma_in_json $FIRST_TARGET
#             FIRST_TARGET=0
#             echo -n "      \"$TARGET\""
#         done
#         echo ""
#         echo -n "    ]"
#     fi

#     echo ""
#     echo -n "  }"
# done

# echo ""
# echo "]"
