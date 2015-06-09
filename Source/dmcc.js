var tag_filter  = document.getElementById( 'tag_filter' );
var ch_proj_div = document.getElementById( 'choose_proj' );
var ch_targ_div = document.getElementById( 'choose_target' );
var submit_form = document.getElementById( 'submit_form' );
var file_input  = document.getElementById( 'file_input' );
var add_btn     = document.getElementById( 'add_files_btn' );
var submit_btn  = document.getElementById( 'submit_files_btn' );
var file_box    = document.getElementById( 'file_container' );
var required_files = document.getElementById( 'required_files' );

var selected_project = null;
var selected_target  = null;
var filesToSubmit = [];

function loadDMCC()
{
    ch_proj_div.innerHTML = "Retrieving proj rules. 0%";
    var projs_req = new XMLHttpRequest();
    projs_req.addEventListener( "progress", projsTxProgress, false );
    projs_req.addEventListener( "load",     projsTxComplete, false );
    projs_req.addEventListener( "error",    projsTxFailed,   false );
    projs_req.addEventListener( "abort",    projsTxCanceled, false );
    projs_req.open( "get", "build_rules.json" );
    projs_req.send();
}

// progress on transfers from the server to the client (downloads)
function projsTxProgress( evt )
{
    if( evt.lengthComputable )
    {
        var percentComplete = evt.loaded / evt.total;
        // console.log( percentComplete );
        ch_proj_div.innerHTML = "Retrieving proj rules. "+
            ( 100.0 * percentComplete ).toFixed( 0 ) +"%";
    }
    else
    {
        ch_proj_div.innerHTML = "Retrieving proj rules. ???%";
    }
}

function projsTxFailed( evt ) {
    alert("An error occurred while transferring the file.");
}

function projsTxCanceled( evt ) {
    alert("The transfer has been canceled by the user.");
}

function projsTxComplete( evt ) {
    console.log( "The transfer is complete." );
    console.log( evt );
    console.log( this );
    projs = JSON.parse( this.responseText );
    console.log( projs );
    removeAllChildren( ch_proj_div );
    for( var i = 0; i < projs.length; i++ )
    {
        var id = "proj_rule_"+i;
        var lelem = document.createElement( "label" );
        lelem.for = id;
        lelem.className = "proj-item";
        var ielem = document.createElement( "input" );
        ielem.id    = id;
        ielem.type  = "radio";
        ielem.name  = "proj_rule";
        ielem.proj  = projs[i];
        ielem.addEventListener( "click", makeProjSelectionCallback( ielem ) );
        var selem = document.createElement( "span" );
        selem.innerHTML = projs[i].path;

        ch_proj_div.appendChild( lelem );
        lelem.appendChild( ielem );
        lelem.appendChild( selem );
    }

// <input name="year" type="radio" value="F" onclick="alert('CS3')">

}

function makeProjSelectionCallback( elem )
{
    return function() { onProjSelect( elem ); }
}

function onProjSelect( elem )
{
    console.log( elem.proj.path );
    console.log( this );
    removeAllChildren( ch_targ_div );
    if( "targets" in elem.proj )
    {
        var targs = elem.proj.targets;
        var list_elem = document.createElement( "select" );
        list_elem.multiple = true;
        for( var i = 0 ; i < targs.length; i++ )
        {
            var opt_elem = document.createElement( "option" );
            opt_elem.innerHTML = targs[i].name;
            opt_elem.target = targs[i];
            opt_elem.addEventListener( "click",
                                       makeTargetSelectionCallback( opt_elem ) );

            list_elem.appendChild( opt_elem );
        }
        ch_targ_div.appendChild( list_elem );
    }
    else
    {
        ch_targ_div.innerHTML = "Sorry, no targets";
    }
    selected_target = null;
    renderRequiredFiles();
}

function makeTargetSelectionCallback( elem )
{
    return function() { onTargetSelect( elem ); }
}

function onTargetSelect( elem )
{
    console.log( elem.target );
    console.log( this );
    selected_target = elem.target;
    if( !( 'deps' in selected_target ) )
    {
        selected_target.deps = [];
    }
    renderRequiredFiles();
}

function renderRequiredFiles()
{
    removeAllChildren( required_files );
    if( selected_target === null )
    {
        return;
    }
    for( i = 0; i < selected_target.deps.length; i++ )
    {
        var dep = document.createElement( "div" );
        var dep_txt = document.createElement( "p" );
        var img = document.createElement( "img" );
        img.src = "question-24.png";
        dep.innerHTML = selected_target.deps[ i ];
        dep.appendChild( img );
        dep.appendChild( dep_txt );
        required_files.appendChild( dep );
    }
}

function onFilesSelected( elem )
{
    console.log( elem );
    if( !( 'files' in elem ) )
    {
        console.log( "ERROR NO FILES" );
        return;
    }
    var files = file_input.files;
    for( var i = 0; i < files.length; i++ )
    {
        filesToSubmit.push( files[i] );
        // TODO: It would be nice to be able to compare files to
        // avoid duplicates. Not sure if that's possible
    }
    renderFileList();
}

function renderFileList()
{
    removeAllChildren( file_box );
    for( var i = 0; i < filesToSubmit.length; i++ )
    {
        var f = filesToSubmit[ i ];
        var box = document.createElement( "div" );
        var delete_btn = document.createElement( "img" );
        delete_btn.src = "delete-24.png";
        delete_btn.onclick = makeDeleteFileCallback( box, f )
        var name = document.createElement( "span" );
        name.innerHTML = f.name;
        box.appendChild( delete_btn );
        box.appendChild( name );
        file_box.appendChild( box );
    }
}

function makeDeleteFileCallback( div, file )
{
    return function() { onDeleteFile( div, file ); }
}

function onDeleteFile( div, file )
{
    for( var i = 0; i < filesToSubmit.length; i++ )
    {
        if( file == filesToSubmit[ i ] )
        {
            filesToSubmit.splice( i, 1 );
            break;
        }
    }
    renderFileList();
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
