// Comment ...

var path         = require( 'path' );
var finalhandler = require( 'finalhandler' );
var http         = require( 'http' );
var serveStatic  = require( 'serve-static' );
var multiparty   = require( 'multiparty' );
var util         = require( 'util' );
var fs           = require( 'fs' );
var mkdirp       = require( 'mkdirp' );

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
        try
        {
            var p = path.join( submission_dir, "expected_file_count.txt" );
            var expected_files = parseInt( fs.readFileSync( p ).toString() );
            if( isNaN( expected_files ) )
                throw new Exception( 'num' );
            p = path.join( submission_dir, "received_file_count.txt" );
            var received_files = parseInt( fs.readFileSync( p ).toString() );
            if( isNaN( expected_files ) )
                throw new Exception( 'num' );
        }
        catch( e )
        {
        }
    } );

            // res.writeHead(200, {'content-type': 'text/plain'});
            // res.write('received fields:\n\n '+util.inspect(fields));
            // res.write('\n\n');
            // res.end('received files:\n\n '+util.inspect(files));
} //);


    // var body = '';
    // req.on( 'data', function( data )
    //     {
    //         // console.log( "WHEEE "+data );
    //         body += data;

    //         // Too much POST data, kill the connection!
    //         if( body.length > 1e6 )
    //             request.connection.destroy();
    //     } );
    // req.on( 'end', function ()
    //     {
    //         console.log( "A" );
    //         console.log( body );
    //         console.log( "B" );
    //         // var post = qs.parse( body );
    //         // console.log( "WHEEEEND "+post['name']+" "+post['file'] );
    //         // console.log( post );
    //         // for( field in post )
    //         // {
    //         //     console.log( "HUH "+field+" "+post[ field ] );
    //         // }
    //         // use post['blah'], etc.
    //     } );
    // res.writeHead( 200, {
    //     'Content-Length': 3,
    //     'Content-Type': 'text/plain' } );
    // res.write( "..." );
    // res.end();
//}

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




// var http = require('http')
//   , util = require('util')
//   , multiparty = require('../')
//   , PORT = process.env.PORT || 27372

// var server = http.createServer(function(req, res) {
//   } else if (req.url === '/upload') {
//   } else {
//     res.writeHead(404, {'content-type': 'text/plain'});
//     res.end('404');
//   }
// });
// server.listen(PORT, function() {
//   console.info('listening on http://0.0.0.0:'+PORT+'/');
// });

function onSubId( req, res )
{
    console.log( req.url );
    var qs_params = req.url.split( "?" )[ 1 ].split( '&' );
    var target = null;
    var mk_path = null;
    for( var i = 0; i < qs_params.length; i++ )
    {
        var parts = qs_params[ i ].split( '=' );
        var key = decodeURIComponent( parts[ 0 ] );
        var val = decodeURIComponent( parts[ 1 ] );
        if( key == 'target' ) {
            target = val;
        }
        if( key == 'path' ) {
            mk_path = val;
        }
    }
    if( target === null || mk_path === null )
    {
        sendSimpleResponse( res, 400, "No target and/or path specified" );
        return;
    }
    var body = randomID( 8 );
    var submission_dir = path.join( '..', 'Submissions', body );
    mkdirp( submission_dir, function( err )
    {
        if( err )
        {
            console.error( err );
            sendSimpleResponse(
                res, 500, "Failed to create submission directory" );
            return;
        }
        var wr = fs.createWriteStream( path.join( submission_dir, 'targets' ) );
        wr.on( "error", function( err )
        {
            console.error( err );
            sendSimpleResponse( res, 500, "Failed to write target" );
        } );
        wr.on( "close", function( ex )
        {
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
        wr.end( target );

    } );
}

function serveDynamic( req, res )
{
    var get_sub_code = req.url.indexOf( "get_submission_id" );
    var submit_file  = req.url.indexOf( "file" );
    if( -1 < get_sub_code && get_sub_code < 2 )
    {
        onSubId( req, res );
    }
    else if( -1 < submit_file && submit_file < 2 )
    {
        onFileSubmit( req, res );
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
