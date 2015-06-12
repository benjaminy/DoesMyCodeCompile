// Comment ...

var path         = require( 'path' );
var finalhandler = require( 'finalhandler' );
var http         = require( 'http' );
var serveStatic  = require( 'serve-static' );
var multiparty   = require( 'multiparty' );
var util         = require( 'util' );
var fs           = require( 'fs' );
var mkdirp       = require( 'mkdirp' );
var qs           = require( 'querystring' );

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

    var cbCalled = false;
    function done( err )
    {
        if( !cbCalled )
        {
            cb( err );
            cbCalled = true;
        }
    }
}

function onFileReceived( req, res, err, fields, files )
{
    if( err )
    {
        res.writeHead( 400, { 'content-type': 'text/plain' } );
        res.end( "invalid request: " + err.message );
        return;
    }
    console.log( 'received fields:\n\n ' + util.inspect(fields) );
    console.log( '\n\n');
    console.log( 'received files:\n\n ' + util.inspect(files) );
    var f = files.file[ 0 ];
    var id = fields.submission_id[ 0 ];
    var submission_dir = path.join( '..', 'Submissions', id );
    copyFile( f.path, path.join( submission_dir, f.originalFilename ), function( err )
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
    return function( err, fields, files )
        {
            onFileReceived( req, res, err, fields, files );
        };
}

function onFileSubmit( req, res )
{
    // console.log( req );
    // assert: request.method == 'POST'
    var form = new multiparty.Form();

    form.parse( req, makeFileReceivedCallback( req, res ) );
}

function onSubId( req, res )
{
    var qs_params = qs.parse( req.url.split( "?" )[ 1 ] );
    if( 'path' in qs_params )
    {
        var mk_path = qs_params.path;
    }
    else
    {
        sendSimpleResponse( res, 400, "No makefile path specified" );
        return;
    }
    var body = randomID( 8 );
    var submission_dir = path.join( '..', 'Submissions', body );
    mkdirp( submission_dir, function( err )
    {
        if( err )
        {
            console.error( err );
            sendSimpleResponse( res, 500, "Failed to create submission dir" );
            return;
        }
        copyFile( path.join( '..', 'BuildRules', mk_path ),
                  path.join( submission_dir, 'Makefile' ), function( err )
        {
            if( err )
            {
                console.error( err );
                sendSimpleResponse( res, 500, "Error copying Makefile" );
            }
            else
            {
                sendSimpleResponse( res, 200, body );
            }
        } );
    } );
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
        sendSimpleResponse( res, 400, "Need id and target" );
        return;
    }
    console.log( "target" );
    console.log( target );
    sendSimpleResponse( res, 200, "You asked for "+target );
}

function serveDynamic( req, res )
{
    var get_sub_code = req.url.indexOf( "submission_init" );
    var submit_file  = req.url.indexOf( "submit_file" );
    var build_target = req.url.indexOf( "build_target" );
    if( -1 < get_sub_code && get_sub_code < 2 )
    {
        onSubId( req, res );
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

/* Misc utilities */

function sendSimpleResponse( res, code, body )
{
    res.writeHead( code, {
        'Content-Length': body.length,
        'Content-Type': 'text/plain' } );
    res.write( body );
    res.end();
}


runServer();

// <?php

// $file_count = $_GET["file_count"];

// $code_length = 8;

// $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
// $code = '';
// for( $p = 0; $p < $code_length; $p++ )
// {
//     $code .= $chars[ mt_rand( 0, strlen( $chars ) ) ];
// }

// // Eventually garbage collect directories

// $dir = "Builds".DIRECTORY_SEPARATOR.$code;
// $rc = mkdir( $dir );
// if( !$rc )
// {
//     http_response_code( 404 );
//     exit( 1 );
// }

// echo $code;

// ?>
