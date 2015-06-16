// Comment ...

// ROOT
//   - Submissions/
//     - X1Y2Z3/
//       - SubmittedFiles/
//         - x.java
//         - y.py
//         - z.c
//       - targ1/
//         - Build/
//           [file copies]
//           [Makefile copy]
//         - Output/
//           stdout.txt
//           stderr.txt
//       - Makefile
//   - BuildRules

var async        = require( 'async' );
var path         = require( 'path' );
var finalhandler = require( 'finalhandler' );
var http         = require( 'http' );
var serveStatic  = require( 'serve-static' );
var multiparty   = require( 'multiparty' );
var util         = require( 'util' );
var fs           = require( 'fs' );
var mkdirp       = require( 'mkdirp' );
var qs           = require( 'querystring' );
var child_proc   = require( 'child_process' );

function onSubmissionInit( req, res )
{
    var qs_params = qs.parse( req.url.split( "?" )[ 1 ] );
    if( 'path' in qs_params )
    {
        var mk_path = qs_params.path;
    }
    else
    {
        sendSimpleResponse( res, 400, "Missing Makefile path in request" );
        return;
    }
    var sid = randomID( 8 );
    var submission_dir = path.join( '..', 'Submissions', sid );
    async.series( [
        function( cb ) { mkdirp( path.join( submission_dir, 'SubmittedFiles' ), cb ); },
        function( cb ) {
            copyFile( path.join( '..', 'BuildRules', mk_path ),
                      path.join( submission_dir, 'Makefile' ), cb );
        }
    ],
        function( err ) {
            if( err )
            {
                console.error( err );
                sendSimpleResponse( res, 500, "Failed to initialize submission" );
            }
            else
            {
                sendSimpleResponse( res, 200, sid );
            }
        } );
}

function onFileReceived( req, res, err, fields, files )
{
    if( err )
    {
        res.writeHead( 400, { 'content-type': 'text/plain' } );
        res.end( "invalid request: " + err.message );
        return;
    }
    /* TODO: error checking */
    var f = files.file[ 0 ];
    var id = fields.submission_id[ 0 ];
    var sub_dir = path.join( '..', 'Submissions', id, 'SubmittedFiles' );
    copyFile( f.path, path.join( sub_dir, f.originalFilename ), function( err )
    {
        if( err )
        {
            sendSimpleResponse( res, 500, "File copy error" )
            return;
        }
        /* "else": */
        sendSimpleResponse( res, 200, "Received " + f.originalFilename );
    } );
}

function makeFileReceivedCallback( req, res )
{
    return function( err, fields, files ) {
        onFileReceived( req, res, err, fields, files );
    };
}

function onFileSubmit( req, res )
{
    // assert: request.method == 'POST'
    ( new multiparty.Form() ).parse( req, makeFileReceivedCallback( req, res ) );
}

function onBuildTarget( req, res )
{
    var qs_params = qs.parse( req.url.split( "?" )[ 1 ] );
    if( 'submission_id' in qs_params && 'target' in qs_params )
    {
        var id = qs_params.submission_id;
        var target = qs_params.target;
    }
    else
    {
        sendSimpleResponse( res, 400, "Missing id and/or target in request" );
        return;
    }
    var    sub_dir = path.join( '..', 'Submissions', id );
    var  files_dir = path.join( sub_dir, 'SubmittedFiles' );
    var   targ_dir = path.join( sub_dir, target );
    var  build_dir = path.join( targ_dir, 'Build' );
    var output_dir = path.join( targ_dir, 'Output' );
    var fds = null;

    async.waterfall( [
        function( cb ) { mkdirp( build_dir, cb ); },
        function( _, cb ) { mkdirp( output_dir, cb ); },
        function( _, cb ) {
            copyFile( path.join( sub_dir, "Makefile" ),
                      path.join( build_dir, "Makefile" ), cb ); },
        function( cb ) { fs.readdir( files_dir, cb ); },
        function( files, cb ) {
            var fs = files.map( function( f ) { return path.join( files_dir, f ); } );
            copyFiles( fs, build_dir, cb );
        },
        function( _, cb ) {
            out_names = [ 'stdout.txt', 'stderr.txt', 'dev_stdout.txt', 'dev_stderr.txt' ];
            out_paths = out_names.map( function( f ) { return path.join( output_dir, f ) } );
            async.map( out_paths, openWriteStream, cb );
        },
        function( f, cb ) {
            fds = f;
            runMake( fds[2], fds[3], 'init', build_dir, cb );
        },
        function( code, sig, cb ) { runMake( fds[0], fds[1], target, build_dir, cb ); },
        function( code, sig, cb ) {
            res.build_code = code;
            async.map( fds, fs.close, cb );
        },
        function( _, cb ) { fs.readFile( path.join( output_dir, 'stderr.txt' ), cb ); },
        function( data, cb ) {
            res.errData = data;
            console.log( data );
            fs.readFile( path.join( output_dir, 'stdout.txt' ), cb );
        },
        function( data, cb ) {
            res.outData = data;
            console.log( data );
            cb();
        }
    ],
        function( err ) {
            console.log( 'MIRACLE' );
            if( err )
            {
                sendSimpleResponse( res, 500, "Failed to run target "+target );
                return;
            }
            /* else */
            resp_data = {
                code: res.build_code,
                errData: res.errData.toString(),
                outData: res.outData.toString()
            };
            sendSimpleResponse( res, 200, JSON.stringify( resp_data ) );
        }
    );
}

function serveDynamic( req, res )
{
    var get_sub_code = req.url.indexOf( "submission_init" );
    var submit_file  = req.url.indexOf( "submit_file" );
    var build_target = req.url.indexOf( "build_target" );
    if( -1 < get_sub_code && get_sub_code < 2 )
    {
        onSubmissionInit( req, res );
    }
    else if( -1 < submit_file && submit_file < 2 )
    {
        onFileSubmit( req, res );
    }
    else if( -1 < build_target && build_target < 2 )
    {
        onBuildTarget( req, res );
    }
    else
    {
        finalhandler( req, res )();
    }
}

var serveFiles =
    serveStatic( '.', { 'index': [ 'index.html', 'index.htm' ] } );

function onRequest( req, res )
{
    serveFiles( req, res, function() { serveDynamic( req, res ); } );
}

function runServer()
{
    var server = http.createServer( onRequest );
    server.listen( 8081 );
    console.log( "Does My Code Compile server listening." );
}

/* Utilities */

function openWriteStream( p, cb ) {
    var ws = fs.createWriteStream( p );
    ws.on( 'open',  function( fd  ) { cb( null, fd ); } );
    ws.on( 'error', function( err ) { cb( err ); } );
}

function runMake( ofd, efd, t, d, cb )
{
    var done = false;
    function after( err, code, sig )
    {
        if( done )
            return;
        done = true;
        cb( err, code, sig );
    }

    var io = [ 0, ofd, efd ];
    var p = child_proc.spawn( 'gtimeout', [ '10s', 'make', t ], { cwd: d, stdio: io } );
    p.on( 'error', after );
    p.on( 'exit', function( code, sig ) { after( null, code, sig ); } );
}

function randomChar()
{
    var chars = [ '0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F' ];
    return chars[ Math.floor( Math.random() * chars.length ) ];
}

function randomID( len )
{
    id = "";
    for( i = 0; i < len; i++ )
    {
        id += randomChar();
    }
    return id;
}

function copyFile( sourcePath, destPath, cb )
{
    var cbCalled = false;
    function done( err )
    {
        if( !cbCalled )
        {
            cb( err );
            cbCalled = true;
        }
    }

    var rd = fs.createReadStream( sourcePath );
    rd.on( "error", function( err )
        {
            done( err );
        } );

    var wr = fs.createWriteStream( destPath );
    wr.on( "error", function( err )
        {
            done( err );
        } );
    wr.on( "close", function( ex )
        {
            done();
        } );

    rd.pipe( wr );
}

function copyFiles( source_paths, dest_dir, final_cb )
{
    function copyToDir( source, cb )
    {
        var dest = path.join( dest_dir, path.basename( source ) );
        copyFile( source, dest, cb );
    }
    async.map( source_paths, copyToDir, final_cb );
}

function sendSimpleResponse( res, code, body )
{
    res.writeHead( code, {
        'Content-Length': body.length,
        'Content-Type': 'text/plain' } );
    res.write( body );
    res.end();
}

runServer();
