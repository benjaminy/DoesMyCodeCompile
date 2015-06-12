var tag_filter     = document.getElementById( 'tag_filter' );
var ch_proj_div    = document.getElementById( 'choose_proj' );
var ch_targ_div    = document.getElementById( 'choose_target' );
var submit_form    = document.getElementById( 'submit_form' );
var submit_btn     = document.getElementById( 'submission_button' );
var file_input     = document.getElementById( 'file_input' );
var file_box       = document.getElementById( 'file_container' );
var required_files = document.getElementById( 'required_files' );
var response_area  = document.getElementById( 'response_area' );

var selected_project       = null;
var selected_target        = null;
var files_to_submit        = [];
var project_list           = null;
var submission_in_progress = false;
var submission_id          = null;

function onLoadDMCC()
{
    ch_proj_div.innerHTML = "Retrieving proj rules. 0%";
    var projs_req = new XMLHttpRequest();
    projs_req.addEventListener( "progress", onProjListTxProgress, false );
    projs_req.addEventListener( "load",     onProjListTxComplete, false );
    projs_req.addEventListener( "error",    onProjListTxFailed,   false );
    projs_req.addEventListener( "abort",    onProjListTxCanceled, false );
    projs_req.open( "get", "build_rules.json" );
    projs_req.send();
}

// progress on transfers from the server to the client (downloads)
function onProjListTxProgress( evt )
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

function onProjListTxFailed( evt ) {
    alert("An error occurred while transferring the file.");
}

function onProjListTxCanceled( evt ) {
    alert("The transfer has been canceled by the user.");
}

function onProjListTxComplete( evt ) {
    console.log( "Project list transfer complete." );
    project_list = JSON.parse( this.responseText );
    renderProjectList();
}

function renderProjectList()
{
    if( project_list === null )
    {
        // log error
        return;
    }
    removeAllChildren( ch_proj_div );
    for( var i = 0; i < project_list.length; i++ )
    {
        var id = "proj_rule_"+i;
        var lelem = document.createElement( "label" );
        lelem.for = id;
        var ielem = document.createElement( "input" );
        ielem.id    = id;
        ielem.type  = "radio";
        ielem.name  = "proj_rule";
        ielem.proj  = project_list[i];
        ielem.addEventListener(
            "click", makeProjSelectionCallback( ielem ) );
        var tags = project_list[i].tags;
        lelem.appendChild( ielem );
        for( var j = 0; j < tags.length; j++ )
        {
            var s = document.createElement( "span" );
            s.className += " tag";
            s.title = tags[ j ].kind;
            s.innerHTML = tags[ j ].tag;
            lelem.appendChild( s );
            var space = document.createElement( "span" );
            space.innerHTML = " ";
            lelem.appendChild( space );
        }
        ch_proj_div.appendChild( lelem );
        ch_proj_div.appendChild( document.createElement( 'br' ) );
    }
// <input name="year" type="radio" value="F" onclick="alert('CS3')">

}

function makeProjSelectionCallback( elem )
{
    return function() { onProjSelect( elem ); }
}

function onProjSelect( elem )
{
    selected_proj = elem.proj;
    console.log( selected_proj.path );
    console.log( this );
    removeAllChildren( ch_targ_div );
    if( "targets" in selected_proj )
    {
        var targs = selected_proj.targets;
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
        ch_targ_div.innerHTML = "Sorry, that project has no targets";
    }
    selected_target = null;
    renderRequiredFiles();
}

function makeTargetSelectionCallback( elem )
{
    return function() { onTargetSelect( elem ); }
}

// XXX Something is broken here wrt multiple target selection.
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
    var msg = document.createElement( 'p' );
    if( selected_target.deps.length < 1 )
    {
        msg.innerHTML = "No required files for this target";
        required_files.appendChild( msg );
        return;
    }
    msg.innerHTML = "Required files for this target:";
    required_files.appendChild( msg );
    var list = document.createElement( 'ul' );
    for( var i = 0; i < selected_target.deps.length; i++ )
    {
        var dep = document.createElement( 'li' );
        dep.className += " monospace";
        var dep_txt = document.createElement( 'span' );
        var selected = false;
        for( var j = 0; j < files_to_submit.length; j++ )
        {
            if( files_to_submit[ j ].name == selected_target.deps[ i ] )
            {
                selected = true;
                break;
            }
        }
        dep.className += selected ? " selected_file" : " unselected_file";
        dep_txt.innerHTML = selected_target.deps[ i ];
        dep.appendChild( dep_txt );
        list.appendChild( dep );
    }
    required_files.appendChild( list );

    var not_required = [];
    for( var i = 0; i < files_to_submit.length; i++ )
    {
        var f = files_to_submit[ i ];
        for( var j = 0; j < selected_target.deps.length; j++ )
        {
            if( f.name == selected_target.deps[ j ] )
            {
                f = null;
                break;
            }
        }
        if( f !== null )
            not_required.push( f );
    }
    if( not_required.length < 1 )
    {
        return;
    }
    var msg = document.createElement( 'p' );
    msg.innerHTML = "Selected files not required by this target:";
    required_files.appendChild( msg );
    var list2 = document.createElement( 'ul' );
    for( var i = 0; i < not_required.length; i++ )
    {
        var nr = document.createElement( 'li' );
        nr.className += " monospace";
        var nr_txt = document.createElement( 'span' );
        nr_txt.innerHTML = not_required[ i ].name;
        nr.appendChild( nr_txt );
        list2.appendChild( nr );
    }
    required_files.appendChild( list2 );
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
        files_to_submit.push( files[i] );
        // TODO: It would be nice to be able to compare files to
        // avoid duplicates. Not sure if that's possible
    }
    renderFileList();
    renderRequiredFiles();
}

function renderFileList()
{
    removeAllChildren( file_box );
    if( files_to_submit.length < 1 )
    {
        submit_btn.disabled = true;
        var msg = document.createElement( 'p' );
        msg.innerHTML = "No files selected";
        file_box.appendChild( msg );
        return;
    }
    // TODO: disable submission button unless all required files are there
    submit_btn.disabled = false;
    var list = document.createElement( 'ul' );
    for( var i = 0; i < files_to_submit.length; i++ )
    {
        var f = files_to_submit[ i ];
        var li = document.createElement( "li" );
        li.className += " delete_me monospace";
        li.addEventListener( "click", makeDeleteFileCallback( f ), false );
        var name = document.createElement( "span" );
        name.innerHTML = f.name;
        li.appendChild( name );
        list.appendChild( li );
    }
    file_box.appendChild( list );
}

function makeDeleteFileCallback( file )
{
    return function() { onDeleteFile( file ); }
}

function onDeleteFile( file )
{
    for( var i = 0; i < files_to_submit.length; i++ )
    {
        if( file == files_to_submit[ i ] )
        {
            files_to_submit.splice( i, 1 );
            break;
        }
    }
    renderFileList();
    renderRequiredFiles();
}

submit_form.onsubmit = function( evt )
{
    evt.preventDefault();
    if( submission_in_progress )
    {
        alert( 'There is alread a submission in progress' );
        return;
    }
    submission_in_progress = true;
    response_area.innerHTML = "Submission in progress";

    var id_req = new XMLHttpRequest();
    id_req.addEventListener( "load",  onSubIdTxComplete, false );
    id_req.addEventListener( "error", onSubIdTxFailed,   false );
    id_req.addEventListener( "abort", onSubIdTxCanceled, false );
    var qs = buildQueryString( [ [ 'file_count', files_to_submit.length ],
                                 [ 'target', selected_target ],
                                 [ 'path', selected_proj.path ] ] );
    id_req.open( 'GET', 'get_submission_id' + qs );
    id_req.send();
}

function onSubIdTxFailed( evt ) {
    alert( "An error occurred while getting the submission ID." );
}

function onSubIdTxCanceled( evt ) {
    alert( "The what??? has been canceled by the user." );
}

function onSubIdTxComplete( evt ) {
    console.log( "Received submission ID: "+this.responseText );
    submission_id = this.responseText;
    renderProjectList();
    if( this.status !== 200 )
    {
        alert( 'An error occurred!' );
        return;
    }

    for( var i = 0; i < files_to_submit.length; i++ )
    {
        var f = files_to_submit[ i ];
        // console.log( f );
        var file_req = new XMLHttpRequest();
        file_req.addEventListener( "load",  onFileTxComplete, false );
        file_req.addEventListener( "error", onFileTxFailed,   false );
        file_req.addEventListener( "abort", onFileTxCanceled, false );
        file_req.open( 'POST', 'file', true );
        var form_data = new FormData();
        form_data.append( 'submission_id', submission_id );
        form_data.append( 'file', f, f.name );
        file_req.send( form_data );
    }
}

// progress on transfers from the server to the client (downloads)
function onFileTxProgress( evt )
{
    if( evt.lengthComputable )
    {
        var percentComplete = evt.loaded / evt.total;
        // console.log( percentComplete );
        //ch_proj_div.innerHTML = "Retrieving proj rules. "+
        //    ( 100.0 * percentComplete ).toFixed( 0 ) +"%";
    }
    else
    {
        //ch_proj_div.innerHTML = "Retrieving proj rules. ???%";
    }
}

function onFileTxFailed( evt ) {
    alert( "An error occurred while sending the file." );
}

function onFileTxCanceled( evt ) {
    alert( "Sending has been canceled by the user." );
}

function onFileTxComplete( evt ) {
    console.log( "File sending complete." );
    // project_list = JSON.parse( this.responseText );
    // renderProjectList();
}

/* Misc utils */

function buildQueryString( params )
{
    if( params.length < 1 )
    {
        return "";
    }
    var qs = "?";
    for( var i = 0; i < params.length; i++ )
    {
        p = params[ i ];
        qs += encodeURIComponent( ""+p[0] ) + "=";
        qs += encodeURIComponent( ""+p[1] );
        if( i + 1 < params.length )
            qs += "&";
    }
    return qs;
}

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
