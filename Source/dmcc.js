var tag_filter     = document.getElementById( 'tag_filter' );
var ch_proj_div    = document.getElementById( 'choose_proj' );
var ch_targ_div    = document.getElementById( 'choose_target' );
var submit_form    = document.getElementById( 'submit_form' );
var submit_btn     = document.getElementById( 'submission_button' );
var file_input     = document.getElementById( 'file_input' );
var file_box       = document.getElementById( 'file_container' );
var required_files = document.getElementById( 'required_files' );
var response_code  = document.getElementById( 'response_code' );
var response_err   = document.getElementById( 'response_err' );
var response_out   = document.getElementById( 'response_out' );
var build_success  = document.getElementById( 'build_success' );
var build_failure  = document.getElementById( 'build_failure' );

var target_list = null;
var target_radios = [];

var selected_project       = null;
var selected_target        = null;
var files_to_submit        = [];
var files_to_submit2       = [];
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
        target_radios.push( ielem );
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
    removeAllChildren( ch_targ_div );
    if( "targets" in selected_proj )
    {
        var targs = selected_proj.targets;
        target_list = document.createElement( "select" );
        target_list.multiple = true;
        for( var i = 0 ; i < targs.length; i++ )
        {
            var opt_elem = document.createElement( "option" );
            opt_elem.innerHTML = targs[i].name;
            opt_elem.target = targs[i];
            opt_elem.addEventListener( "click",
                                       makeTargetSelectionCallback( opt_elem ) );

            target_list.appendChild( opt_elem );
        }
        ch_targ_div.appendChild( target_list );
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
    selected_target = elem.target;
    if( 'deps' in selected_target )
    {
        for( var i = 0; i < selected_target.deps.length; i++ )
        {
            var name = selected_target.deps[i];
            selected_target.deps[i] = { name: name, satisfied: false };
        }
    }
    else
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
        var dep_elem = document.createElement( 'li' );
        dep_elem.className += " monospace";
        var dep_txt = document.createElement( 'span' );
        var dep = selected_target.deps[ i ];
        dep_elem.className += dep.satisfied ? " selected_file" : " unselected_file";
        dep_txt.innerHTML = dep.name;
        dep_elem.appendChild( dep_txt );
        list.appendChild( dep_elem );
    }
    required_files.appendChild( list );

    var not_required = [];
    for( var i = 0; i < files_to_submit.length; i++ )
    {
        if( !files_to_submit[ i ].isRequired )
            not_required.push( files_to_submit[ i ] );
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
    if( !( 'files' in elem ) )
    {
        console.log( "ERROR NO FILES" );
        return;
    }
    var files = file_input.files;
    for( var i = 0; i < files.length; i++ )
    {
        files[i].isRequired = false;
        for( var j = 0; j < selected_target.deps.length; j++ )
        {
            if( selected_target.deps[ j ].name == files[ i ].name )
            {
                selected_target.deps[ j ].satisfied = true;
                files[i].isRequired = true;
                break;
            }
        }
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
    var all_satisfied = true;
    for( var i = 0; i < selected_target.deps.length; i++ )
    {
        if( !selected_target.deps[ i ].satisfied )
        {
            all_satisfied = false;
            break;
        }
    }
    submit_btn.disabled = !all_satisfied;

    if( files_to_submit.length < 1 )
    {
        var msg = document.createElement( 'p' );
        msg.innerHTML = "No files selected";
        file_box.appendChild( msg );
        return;
    }
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
    if( submission_in_progress )
        return;

    for( var i = 0; i < files_to_submit.length; i++ )
    {
        if( file == files_to_submit[ i ] )
        {
            files_to_submit.splice( i, 1 );
            break;
        }
    }
    for( var i = 0; i < selected_target.deps.length; i++ )
    {
        if( selected_target.deps[ i ].name == file.name )
        {
            selected_target.deps[ i ].satisfied = false;
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
    file_input.disabled    = true;
    submit_btn.disabled    = true;
    target_list.disabled   = true;
    tag_filter.disabled    = true;
    for( var i = 0; i < target_radios.length; i++ )
    {
        target_radios[ i ].disabled = true;
    }

    response_out.innerHTML = "Submission in progress";

    var id_req = new XMLHttpRequest();
    id_req.addEventListener( "load",  onSubIdTxComplete, false );
    id_req.addEventListener( "error", onSubIdTxFailed,   false );
    id_req.addEventListener( "abort", onSubIdTxCanceled, false );
    var qs = buildQueryString( [ [ 'path', selected_proj.path ] ] );
    id_req.open( 'GET', 'submission_init' + qs );
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
    if( this.status !== 200 )
    {
        alert( 'An error occurred!' );
        return;
    }

    files_to_submit2 = files_to_submit.slice();
    for( var i = 0; i < files_to_submit.length; i++ )
    {
        var f = files_to_submit[ i ];
        var file_req = new XMLHttpRequest();
        file_req.localRef = f;
        file_req.addEventListener( "load",  onFileTxComplete, false );
        file_req.addEventListener( "error", onFileTxFailed,   false );
        file_req.addEventListener( "abort", onFileTxCanceled, false );
        file_req.open( 'POST', 'submit_file', true );
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
    console.log( "File received " + this.localRef.name );
    for( var i = 0; i < files_to_submit2.length; i++ )
    {
        if( this.localRef == files_to_submit2[ i ] )
        {
            files_to_submit2.splice( i, 1 );
            break;
        }
    }
    if( files_to_submit2.length < 1 )
    {
        onUploadsComplete();
    }
}

function onUploadsComplete()
{
    var targ_req = new XMLHttpRequest();
    targ_req.addEventListener( "load",  onTargTxComplete, false );
    targ_req.addEventListener( "error", onTargTxFailed,   false );
    targ_req.addEventListener( "abort", onTargTxCanceled, false );
    var qs = buildQueryString( [ [ 'submission_id', submission_id ],
                                 [ 'target', selected_target.name ] ] );
    targ_req.open( 'GET', 'build_target' + qs, true );
    targ_req.send();
}

function onTargTxFailed( evt ) {
    alert( "An error occurred while sending the targ." );
}

function onTargTxCanceled( evt ) {
    alert( "Sending has been canceled by the user." );
}

function onTargTxComplete( evt ) {
    if( this.status == 200 )
    {
        var fun_stuff = JSON.parse( this.responseText );
        if( fun_stuff.code == 0 )
        {
            build_success.style.display = 'inline';
        }
        else
        {
            build_failure.style.display = 'inline';
        }
        response_err.innerHTML  = "Error output: "+fun_stuff.errData;
        response_out.innerHTML  = "Informational output: "+fun_stuff.outData;
        alert( "Done" );
    }
    else
    {
        alert( "Target failed: " + this.responseText );
    }
}

/* Utilities */

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
