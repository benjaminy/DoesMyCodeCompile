<?php

$file_count = $_GET["file_count"];

$code_length = 8;

$chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
$code = '';
for( $p = 0; $p < $code_length; $p++ )
{
    $code .= $chars[ mt_rand( 0, strlen( $chars ) ) ];
}

// Eventually garbage collect directories

$dir = "Builds".DIRECTORY_SEPARATOR.$code;
$rc = mkdir( $dir );
if( !$rc )
{
    http_response_code( 404 );
    exit( 1 );
}

echo $code;

?>
