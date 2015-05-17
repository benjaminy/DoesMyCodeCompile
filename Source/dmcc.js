var add_form    = document.getElementById( 'add_form' );
var submit_form = document.getElementById( 'submit_form' );
var file_input  = document.getElementById( 'file_input' );
var add_btn     = document.getElementById( 'add_files_btn' );
var submit_btn  = document.getElementById( 'submit_files_btn' );
var file_box    = document.getElementById( 'file_container' );

function logFields( path, obj, objs )
{
    if( obj !== null && typeof( obj ) === 'object' )
    {
        if( objs.indexOf( obj ) > -1 )
        {
            return;
        }
        objs.push( obj );
        for( field in obj )
        {
            try {
                logFields( path + "." + field, obj[ field ], objs );
            }
            catch( e ) {
                console.log( path + "." + field + " MISSING" );
            }
        }
    }
    else
    {
        console.log( path + " > " + obj );
    }
}

add_form.onsubmit = function( evt )
{
    console.log( evt );
    evt.preventDefault();

    var files = file_input.files;
    for( var i = 0; i < files.length; i++ )
    {
        var file_stuff = document.createElement( "p" );
        file_stuff.innerHTML = files[i].name;
        file_stuff.actual_file = files[i];
        file_box.appendChild( file_stuff );
    }
}

var submission_in_progress = false;

function got_check_id()
{
    console.log( "GOT IT" );
    console.log( this );
    if( this.status === 200 )
    {
        // File(s) uploaded.
        // uploadButton.innerHTML = 'Upload';
    }
    else
    {
        alert('An error occurred!');
        return;
    }

    
    var formData = new FormData();
    for( var i = 0; i < file_box.childNodes.length; i++ )
    {
        var elem = file_box.childNodes[i];
        console.log( file_box.childNodes[i] );
        formData.append( 'photos[]', elem.actual_file, elem.actual_file.name );
    }
}

submit_form.onsubmit = function( evt )
{
    console.log( evt );
    evt.preventDefault();

    var submission_in_progress = true;
    var new_req = new XMLHttpRequest();
    new_req.open( 'GET', 'new_req.php?file_count='+file_box.childNodes.length );
    new_req.onload = got_check_id;
    new_req.send();
}

function loadDMCC()
{
}
