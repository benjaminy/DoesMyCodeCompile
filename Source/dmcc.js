var tag_filter  = document.getElementById( 'tag_filter' );
var builds_div  = document.getElementById( 'builds' );
var add_form    = document.getElementById( 'add_form' );
var submit_form = document.getElementById( 'submit_form' );
var file_input  = document.getElementById( 'file_input' );
var add_btn     = document.getElementById( 'add_files_btn' );
var submit_btn  = document.getElementById( 'submit_files_btn' );
var file_box    = document.getElementById( 'file_container' );

function loadDMCC()
{
    builds_div.innerHTML = "Retrieving build rules. 0%";
    var builds_req = new XMLHttpRequest();
    builds_req.addEventListener( "progress", buildsProgress, false );
    builds_req.addEventListener( "load",     buildsComplete, false );
    builds_req.addEventListener( "error",    buildsFailed,   false );
    builds_req.addEventListener( "abort",    buildsCanceled, false );
    builds_req.open( "get", "build_rules.json" );
    builds_req.send();
}

// progress on transfers from the server to the client (downloads)
function buildsProgress( evt ) {
    if( evt.lengthComputable ) {
        var percentComplete = evt.loaded / evt.total;
        // console.log( percentComplete );
        builds_div.innerHTML = "Retrieving build rules. "+
            ( 100.0 * percentComplete ).toFixed( 0 ) +"%";
    }
    else {
        builds_div.innerHTML = "Retrieving build rules. ???%";
    }
}

function buildsFailed( evt ) {
    alert("An error occurred while transferring the file.");
}

function buildsCanceled( evt ) {
    alert("The transfer has been canceled by the user.");
}

function buildsComplete( evt ) {
    console.log( "The transfer is complete." );
    console.log( evt );
    console.log( this );
    builds = JSON.parse( this.responseText );
    console.log( builds );
    removeAllChildren( builds_div );
    for( var i = 0; i < builds.length; i++ )
    {
        var id = "build_rule_"+i;
        var lelem = document.createElement( "label" );
        lelem.for = id;
        lelem.className = "build-item";
        var ielem = document.createElement( "input" );
        ielem.id    = id;
        ielem.type  = "radio";
        ielem.name  = "build_rule";
        ielem.build_path = builds[i].path;
        ielem.addEventListener( "click", makeBuildSelectionCallback( ielem ) );
        var selem = document.createElement( "span" );
        selem.innerHTML = builds[i].path;

        builds_div.appendChild( lelem );
        lelem.appendChild( ielem );
        lelem.appendChild( selem );
    }

// <input name="year" type="radio" value="F" onclick="alert('CS3')">

}

function makeBuildSelectionCallback( elem )
{
    return function() { buildSelected( elem ); }
}

function buildSelected( elem )
{
    console.log( elem.build_path );
    console.log( this );
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

/* Misc utils */

function removeAllChildren( elem )
{
    while( elem.firstChild )
    {
        elem.removeChild( elem.firstChild );
    }
}

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
