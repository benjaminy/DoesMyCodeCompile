#!/usr/bin/env python3

import string
import sys
import os
import subprocess
import json
import argparse

DMCC_ROOT   = os.path.join( os.getcwd(), ".." )
LOG_FILE    = open( "build_rules.log", "w" )
RULES_DIR   = os.path.join( DMCC_ROOT, "BuildRules" )
DEPLOY_DIR  = os.path.join( DMCC_ROOT, "Deploy" )
MAKE_DIR    = os.path.join( DMCC_ROOT, "Build", "Make" )
RULES_INFO  = os.path.join( DEPLOY_DIR, "build_rules.json" )
WHITE_PUNCT = string.punctuation + string.whitespace

# TODO:
# make -rpn -f BuildRules/Examples/_simple_java01.mk | sed -n -e '/^$/ { n ; /^[^ ]*:/p; }'

def clearMakeDir():
    process = subprocess.Popen( [ "git", "clean", "-f", "-x" ], cwd=MAKE_DIR )
    return process.wait()

# TODO: The purpose of the next few lines is to figure out if there are
# any new makefiles to process.  Can we get make to do this somehow?

def mostRecentTimestampInTree( path, filt ):
    # print( path + str( type( path ) ) )
    if os.path.isfile( path ):
        if filt( path ):
            return os.path.getmtime( path )
        else:
            return None
    elif os.path.isdir( path ):
        most_recent = None
        for f in os.listdir( path ):
            recent = mostRecentTimestampInTree(
                os.path.join( path, f ), filt )
            if ( ( not recent is None ) and
                 ( most_recent is None or recent > most_recent ) ):
                most_recent = recent
        return most_recent
    else:
        print( "Interesting. What kind of thing is 'path'?" )
        return None

def mkSuffix( path ):
    return os.path.basename( path ).endswith( ".mk" )

MOST_RECENT_RULE = mostRecentTimestampInTree( RULES_DIR, mkSuffix )
RULES_INFO_TIME  = os.path.getmtime( RULES_INFO )

# >&2 echo "Dir: $MOST_RECENT_RULE   File: $RULES_INFO_TIME"

# print( RULES_INFO_TIME )
# print( MOST_RECENT_RULE )

if RULES_INFO_TIME >= MOST_RECENT_RULE:
    print( "Build rules up-to-date.", file=LOG_FILE )
    for line in open( RULES_INFO ):
        print( line, end="" )
    sys.exit( 0 )
else:
    print( "More recent build rule. Updating ...", file=LOG_FILE )

def runMake( mkfile, target, extra_opts, cwd=None ):
    # -s = silent (don't echo commands)
    # -f = provide makefile name
    if cwd is None:
        m = [ "make" ] + extra_opts + [ "-s", "-f", mkfile, target ]
        process = subprocess.Popen( m,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE )
    else:
        m = [ "make" ] + extra_opts + [ "-s", "-f", mkfile, target ]
        process = subprocess.Popen( m, cwd=cwd,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE )
    ( output_bytes, err_bytes ) = process.communicate()
    if output_bytes is None:
        output = None
    else:
        output = output_bytes.decode( "utf-8" )
    if err_bytes is None:
        err = None
    else:
        err = err_bytes.decode( "utf-8" )
    return ( process.wait(), output, err )

def tag_foo( tag_string ):
    name_parts = tag_string.split( "_" );
    if len( name_parts ) > 1:
        kind = name_parts[0]
        tag_value = " ".join( name_parts[1:] )
    else:
        kind = ""
        tag_value = name_parts[0]
    if tag_value.endswith( ".mk" ):
        tag_value = tag_value[ 0 : len( tag_value ) - 3 ]
    return ( kind, tag_value )

projects = []

def processMakefile( full_path, app_path, fname_tags ):
    print( "Processing Makefile %s ..." % app_path, file=LOG_FILE )
    # print( "Processing Makefile %s ..." % app_path )

    proj = { 'path': app_path }
    tags = []
    for ( kind, tag_value ) in fname_tags:
        tags.append( { 'kind':kind, 'tag':tag_value } )
    ( has_tags, tags_output, tags_err ) = runMake( full_path, "tags", [] )
    for tag in ( tags_output.splitlines() if has_tags == 0 else [] ):
        ( kind, tag_value ) = tag_foo( tag )
        tags.append( { 'kind':kind, 'tag':tag_value } )
    proj[ "tags" ] = tags

    ( has_targs, targs_output, targs_err ) = runMake( full_path, "targets", [] )
    targets = []
    for target_name in ( targs_output.splitlines() if has_targs == 0 else [] ):
        target = { 'name': target_name }
        clearMakeDir()
        runMake( full_path, "init", [], cwd=MAKE_DIR )
        ( _, sOut, sErr ) = runMake(
            full_path, target_name, [ "-k" ], cwd=MAKE_DIR )
        deps = []
        for err_line in ( [] if sErr is None else sErr.splitlines() ):
            preFile  = "No rule to make target"
            postFile = "needed by"
            pre  = err_line.find( preFile )
            post = err_line.find( postFile )
            if pre != -1 and post != -1:
                dep = err_line[ pre + len( preFile ) : post ]
                deps.append( dep.strip( WHITE_PUNCT ) )
        if len( deps ) > 0:
            target[ "deps" ] = deps
        targets.append( target )

    if len( targets ) > 0:
        proj[ "targets" ] = targets
    projects.append( proj )

def crawl( full_path, app_path, filename, fname_tags ):
    if app_path == "Examples" and False: # TODO: config
        return

    fname_tags = fname_tags[:]
    if filename != "":
        fname_tags.append( tag_foo( filename ) )

    if os.path.isdir( full_path ):
        for f in os.listdir( full_path ):
            crawl( os.path.join( full_path, f ),
                   os.path.join( app_path, f ),
                   f, fname_tags )

    elif os.path.isfile( full_path ):
        if not mkSuffix( filename ):
            return
        processMakefile( full_path, app_path, fname_tags )
    else:
        # Interesting. What is f?
        pass

crawl( RULES_DIR, "", "", [] )

print( json.dumps( projects ) )
