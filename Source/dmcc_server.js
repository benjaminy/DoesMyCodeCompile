// Comment ...

var finalhandler = require( 'finalhandler' );
var http         = require( 'http' );
var serveStatic  = require( 'serve-static' );
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

function onFileSubmit( req, res )
{
    // assert: request.method == 'POST'
    var body = '';
    req.on( 'data', function( data )
        {
            console.log( "WHEEE "+data );
            body += data;

            // Too much POST data, kill the connection!
            if( body.length > 1e6 )
                request.connection.destroy();
        } );
    req.on( 'end', function ()
        {
            console.log( "WHEEEEND" );
            var post = qs.parse( body );

            // use post['blah'], etc.
        } );
    res.writeHead( 200, {
        'Content-Length': 3,
        'Content-Type': 'text/plain' } );
    res.write( "..." );
    res.end();
}

function serveDynamic( req, res )
{
    var get_sub_code = req.url.indexOf( "get_submission_code" );
    var submit_file  = req.url.indexOf( "submit_file" );
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
