#!/usr/bin/env python3

import sys
import os
import subprocess
import json
import shutils

LOG_FILE   = open( "build_rules.log", "w" )
RULES_DIR  = os.path.join( "..", "BuildRules" )
DEPLOY_DIR = os.path.join( "..", "Deploy" )
MAKE_DIR   = os.path.join( "..", "Build", "Make" )
RULES_INFO = os.path.join( DEPLOY_DIR, "build_rules.json" )

class EmptyObject:
    pass

def clearMakeDir():
    for fpart in os.listdir( MAKE_DIR ):
        f = os.path.join( MAKE_DIR, fpart )
        if os.path.isdir( f ):
            shutils.rmtree( f, ignore_errors=True )
        else if f != ".gitignore":
            os.path.unlink( f )

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
            if ( ( not f2_recent is None ) and
                 ( most_recent is None or f2_recent > most_recent ) ):
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

def runMake( mkfile, target ):
    m = [ "make", "-s", "-f", mkfile, target ]
    process = subprocess.Popen( m, stdout=PIPE )
    ( output, err ) = process.communicate()
    return ( process.wait(), output, err )

projects = []

def crawl( full_path, app_path, filename, fname_tags ):
    # TODO: Ignore Examples directory
    name_parts = filename.split( "_" );
    if len( name_parts ) > 1:
        kind = name_parts[0]
        tag_value = name_parts[1:].join( " " )
    else:
        kind = ""
        tag_value = name_parts[0]
    fname_tags.append( ( kind, tag_value ) )

    if os.path.isdir( full_path ):
        for f in os.listdir( full_path ):
            crawl( os.path.join( full_path, f ),
                   os.path.join( app_path, f ),
                   f, fname_tags )

    elif os.path.isfile( full_path ):
        if not mkSuffix( filename ):
            fname_tags.pop()
            return
        print( "Processing Makefile %s ..." % app_path, file=LOG_FILE )

        proj = EmptyObject()
        proj.path = name
        tags = []
        for tag in fname_tags:
            tags.push( tag )
        ( has_tags, tags_output, tags_err ) = runMake( full_path, "tags" )
        if has_tags == 0:
            for tag in tags_output:
                tags.push( tag )
        proj.tags = tags

        ( has_targs, targs_output, targs_err ) = runMake( full_path, "targets" )
        targets = []
        if has_targs == 0:
            for target_name in targs_output:
                target = EmptyObject()
                target.name = target_name
                clearMakeDir()
                targets.push( target )

        projects.append( proj )

    else:
        # Interesting. What is f?
        pass

    fname_tags.pop()

print json.dumps( projects )
