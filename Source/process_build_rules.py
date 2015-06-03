#!/usr/bin/env python3

import sys
import os
import subprocess
import json
import shutils
import argparse

DMMC_ROOT  = ".."
LOG_FILE   = open( "build_rules.log", "w" )
RULES_DIR  = os.path.join( DMCC_ROOT, "BuildRules" )
DEPLOY_DIR = os.path.join( DMCC_ROOT, "Deploy" )
MAKE_DIR   = os.path.join( DMCC_ROOT, "Build", "Make" )
RULES_INFO = os.path.join( DEPLOY_DIR, "build_rules.json" )

class EmptyObject:
    pass

def clearMakeDir():
    for f in os.listdir( MAKE_DIR ):
        path = os.path.join( MAKE_DIR, f )
        if os.path.isdir( path ):
            shutils.rmtree( path, ignore_errors=True )
        else if f != ".gitignore":
            os.path.unlink( path )

# TODO: The purpose of the next few lines is to figure out if there are
# any new makefiles to process.  Can we get make to do this somehow?

def mostRecentTimestampInTree( path, filt ):
    # print( path + str( type( path ) ) )
    if os.path.isfile( path ):
        # print( "Is file" )
        if filt( path ):
            return os.path.getmtime( path )
        else:
            return None
    elif os.path.isdir( path ):
        # print( "Is dir" )
        most_recent = None
        for f in os.listdir( path ):
            f_recent = mostRecentTimestampInTree(
                os.path.join( path, f ), filt )
            if ( ( not f_recent is None ) and
                 ( most_recent is None or f_recent > most_recent ) ):
                most_recent = f_recent
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

def runMake( mkfile, target, extra_opts, cwd=None ):
    m = [ "make"] + extra_opts + ["-s", "-f", mkfile, target ]
    if cwd is None:
        process = subprocess.Popen( m, stdout=PIPE )
    else:
        process = subprocess.Popen( m, stdout=PIPE, cwd=cwd )
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
        ( has_tags, tags_output, tags_err ) = runMake( full_path, "tags", [] )
        if has_tags == 0:
            for tag in tags_output:
                tags.push( tag )
        proj.tags = tags

        ( has_targs, targs_output, targs_err ) = runMake( full_path, "targets", [] )
        targets = []
        if has_targs == 0:
            for target_name in targs_output:
                target = EmptyObject()
                target.name = target_name
                clearMakeDir()
                ( has_targs, targs_output, targs_err ) = runMake( full_path, "targets", [] )
                targets.push( target )

        projects.append( proj )

    else:
        # Interesting. What is f?
        pass

    fname_tags.pop()

print json.dumps( projects )
