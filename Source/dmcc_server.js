// Comment ...

var finalhandler = require( 'finalhandler' );
var http         = require( 'http' );
var serveStatic  = require( 'serve-static' );
var multiparty   = require( 'multiparty' );
var util         = require( 'util' );
var fs           = require( 'fs' );

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
    var f = files.file[ 0 ];
    copyFile( f.path, '/tmp/' + f.originalFilename, cb );
    console.log( 'received fields:\n\n ' + util.inspect(fields) );
    console.log( '\n\n');
    console.log( 'received files:\n\n ' + util.inspect(files) );

            // res.writeHead(200, {'content-type': 'text/plain'});
            // res.write('received fields:\n\n '+util.inspect(fields));
            // res.write('\n\n');
            // res.end('received files:\n\n '+util.inspect(files));
        } );


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
}

function makeFileReceivedCallback( req, res )
{
    return function( err, fields, files ) { onFileReceived( req, res, err, fields, fields ); }
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



function serveDynamic( req, res )
{
    var get_sub_code = req.url.indexOf( "get_submission_id" );
    var submit_file  = req.url.indexOf( "file" );
    if( -1 < get_sub_code && get_sub_code < 2 )
    {
        var body = randomID( 8 );
        res.writeHead( 200, {
            'Content-Length': body.length,
            'Content-Type': 'text/plain' } );
        res.write( body );
        res.end();
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
