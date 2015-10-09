var e_tag_filter     = document.getElementById( 'tag_filter' );
var e_choose_proj    = document.getElementById( 'choose_proj' );
var e_choose_targ    = document.getElementById( 'choose_target' );
var e_submit_form    = document.getElementById( 'submit_form' );
var e_submit_btn     = document.getElementById( 'submission_button' );
var e_file_input     = document.getElementById( 'file_input' );
var e_file_box       = document.getElementById( 'file_container' );
var e_required_files = document.getElementById( 'required_files' );
var e_response_area  = document.getElementById( 'response_area' );

var target_list = null;
var target_radios = [];

var selected_project       = null;
var selected_targets       = [];
var required_files         = [];
var files_to_submit        = [];
var files_to_submit2       = [];
var project_list           = null;
var submission_in_progress = false;
var submission_id          = null;
var targets_completed      = 0;

function onLoadDMCC()
{
    e_choose_proj.innerHTML = "Retrieving proj rules. 0%";
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
        e_choose_proj.innerHTML = "Retrieving proj rules. "+
            ( 100.0 * percentComplete ).toFixed( 0 ) +"%";
    }
    else
    {
        e_choose_proj.innerHTML = "Retrieving proj rules. ???%";
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
    removeAllChildren( e_choose_proj );
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
        ielem.addEventListener( "click", onProjSelect );
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
        e_choose_proj.appendChild( lelem );
        e_choose_proj.appendChild( document.createElement( 'br' ) );
    }
// <input name="year" type="radio" value="F" onclick="alert('CS3')">

}

function strip_visible( s )
{
    if( s.startsWith( 'visible_' ) )
    {
        return s.substring( "visible_".length );
    }
    else
    {
        return s;
    }
}

function onProjSelect( evt )
{
    var elem = evt.target;
    selected_proj = elem.proj;
    removeAllChildren( e_choose_targ );
    if( "targets" in selected_proj )
    {
        var targs = selected_proj.targets;
        target_list = document.createElement( "select" );
        target_list.multiple = true;
        target_list.addEventListener( 'change', onTargetSelectChange );
        for( var i = 0 ; i < targs.length; i++ )
        {
            var opt_elem = document.createElement( "option" );
            opt_elem.innerHTML = strip_visible( targs[i].name );
            if( 'deps' in targs[i] )
            {
                for( var j = 0; j < targs[i].deps.length; j++ )
                {
                    var name = targs[i].deps[j];
                    targs[i].deps[j] = { name: name, satisfied: false };
                }
            }
            else
            {
                targs[i].deps = [];
            }

            opt_elem.target = targs[i];
            target_list.appendChild( opt_elem );
        }
        e_choose_targ.appendChild( target_list );
    }
    else
    {
        e_choose_targ.innerHTML = "Sorry, that project has no targets";
    }
    selected_targets = [];
    renderRequiredFiles();
}

function onTargetSelectChange()
{
    /* XXX What if files are already selected? */
    selected_targets = [];
    required_files = [];
    for( var i = 0; i < target_list.length; i++ )
    {
        var opt_elem = target_list[i];
        if( !opt_elem.selected )
        {
            continue;
        }
        selected_targets.push( opt_elem.target );
        for( var j = 0; j < opt_elem.target.deps.length; j++ )
        {
            var d = opt_elem.target.deps[j];
            var already_there = false;
            for( var k = 0; k < required_files.length; k++ )
            {
                if( required_files[k].name == d.name )
                {
                    already_there = true;
                    break;
                }
            }
            if( !already_there )
                required_files.push( d );
        }
    }
    renderRequiredFiles();
}

function renderRequiredFiles()
{
    removeAllChildren( e_required_files );
    var msg = document.createElement( 'p' );
    if( required_files.length < 1 )
    {
        msg.innerHTML = "No required files for this target";
        e_required_files.appendChild( msg );
    }
    else
    {
        msg.innerHTML = "Required files for this target:";
        e_required_files.appendChild( msg );
        var list = document.createElement( 'ul' );
        for( var i = 0; i < required_files.length; i++ )
        {
            var dep_elem = document.createElement( 'li' );
            dep_elem.className += " monospace";
            var dep_txt = document.createElement( 'span' );
            var dep = required_files[i];
            dep_elem.className += dep.satisfied ? " selected_file" : " unselected_file";
            dep_txt.innerHTML = dep.name;
            dep_elem.appendChild( dep_txt );
            list.appendChild( dep_elem );
        }
        e_required_files.appendChild( list );
    }

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
    e_required_files.appendChild( msg );
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
    e_required_files.appendChild( list2 );
}

function onFilesSelected( elem )
{
    if( !( 'files' in elem ) )
    {
        console.log( "ERROR NO FILES" );
        return;
    }
    var files = e_file_input.files;
    for( var i = 0; i < files.length; i++ )
    {
        files[i].isRequired = false;
        for( var j = 0; j < required_files.length; j++ )
        {
            if( required_files[ j ].name == files[ i ].name )
            {
                required_files[ j ].satisfied = true;
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
    removeAllChildren( e_file_box );
    var all_satisfied = true;
    for( var i = 0; i < required_files.length; i++ )
    {
        if( !required_files[ i ].satisfied )
        {
            all_satisfied = false;
            break;
        }
    }
    e_submit_btn.disabled = !all_satisfied;

    if( files_to_submit.length < 1 )
    {
        var msg = document.createElement( 'p' );
        msg.innerHTML = "No files selected";
        e_file_box.appendChild( msg );
        return;
    }
    var list = document.createElement( 'ul' );
    for( var i = 0; i < files_to_submit.length; i++ )
    {
        var f = files_to_submit[ i ];
        var li = document.createElement( "li" );
        li.className += " delete_me monospace";
        li.fileObj = f;
        li.addEventListener( "click", onDeleteFile );
        var name = document.createElement( "span" );
        name.innerHTML = f.name;
        li.appendChild( name );
        list.appendChild( li );
    }
    e_file_box.appendChild( list );
}

function onDeleteFile( evt )
{
    var li = evt.target;
    var file = li.fileObj;
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
    for( var i = 0; i < required_files.length; i++ )
    {
        if( required_files[ i ].name == file.name )
        {
            required_files[ i ].satisfied = false;
            break;
        }
    }
    renderFileList();
    renderRequiredFiles();
}

e_submit_form.onsubmit = function( evt )
{
    evt.preventDefault();
    if( submission_in_progress )
    {
        alert( 'There is alread a submission in progress' );
        return;
    }
    submission_in_progress = true;
    e_file_input.disabled    = true;
    e_submit_btn.disabled    = true;
    target_list.disabled   = true;
    e_tag_filter.disabled    = true;
    for( var i = 0; i < target_radios.length; i++ )
    {
        target_radios[ i ].disabled = true;
    }

    e_response_area.innerHTML = "Submission in progress";

    var id_req = new XMLHttpRequest();
    id_req.addEventListener( "load",  onSubInitTxComplete, false );
    id_req.addEventListener( "error", onSubInitTxFailed,   false );
    id_req.addEventListener( "abort", onSubInitTxCanceled, false );
    var qs = buildQueryString( [ [ 'path', selected_proj.path ] ] );
    id_req.open( 'GET', 'submission_init' + qs );
    id_req.send();
}

function onSubInitTxFailed( evt ) {
    alert( "An error occurred while getting the submission ID." );
}

function onSubInitTxCanceled( evt ) {
    alert( "The what??? has been canceled by the user." );
}

function onSubInitTxComplete( evt ) {
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
        //e_choose_proj.innerHTML = "Retrieving proj rules. "+
        //    ( 100.0 * percentComplete ).toFixed( 0 ) +"%";
    }
    else
    {
        //e_choose_proj.innerHTML = "Retrieving proj rules. ???%";
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
    var target = selected_targets[ targets_completed ];
    var targ_req = new XMLHttpRequest();
    targ_req.addEventListener( "load",  onTargTxComplete, false );
    targ_req.addEventListener( "error", onTargTxFailed,   false );
    targ_req.addEventListener( "abort", onTargTxCanceled, false );
    var qs = buildQueryString( [ [ 'submission_id', submission_id ],
                                 [ 'target', target.name ] ] );
    targ_req.open( 'GET', 'build_target' + qs, true );
    targ_req.target = target;
    console.log( targ_req.target.name );
    targ_req.send();
}

function onTargTxFailed( evt ) {
    alert( "An error occurred while sending the targ." );
}

function onTargTxCanceled( evt ) {
    alert( "Sending has been canceled by the user." );
}

function onTargTxComplete( evt ) {
    if( targets_completed === 0 )
    {
        removeAllChildren( e_response_area );
    }
    else
    {
        e_response_area.appendChild( document.createElement( "hr" ) );
    }

    if( this.status == 200 )
    {
        result = JSON.parse( this.responseText );
        var e_code = document.createElement( "div" );
        if( result.code === 0 )
        {
            var e_s1 = document.createElement( "span" );
            var e_s2 = document.createElement( "span" );
            var e_s3 = document.createElement( "span" );
            e_s2.className += " monospace";
            e_s1.innerHTML = "Target ";
            e_s2.innerHTML = strip_visible( this.target.name );
            e_s3.innerHTML = " succeeded";
            e_code.appendChild( e_s1 );
            e_code.appendChild( e_s2 );
            e_code.appendChild( e_s3 );
            e_code.className += " build_success";
        }
        else
        {
            var e_s1 = document.createElement( "span" );
            var e_s2 = document.createElement( "span" );
            var e_s3 = document.createElement( "span" );
            e_s2.className += " monospace";
            e_s1.innerHTML = "Target ";
            e_s2.innerHTML = strip_visible( this.target.name );
            e_s3.innerHTML = " failed with error code "+result.code;
            e_code.appendChild( e_s1 );
            e_code.appendChild( e_s2 );
            e_code.appendChild( e_s3 );
            e_code.className += " build_failure";
        }
        e_response_area.appendChild( e_code );
        e_response_area.appendChild( document.createElement( "br" ) );

        var e_outA = document.createElement( "div" );
        e_outA.innerHTML = "Normal output of the target:";
        e_response_area.appendChild( e_outA );

        var e_out = document.createElement( "pre" );
        e_out.innerHTML = result.outData
        e_response_area.appendChild( e_out );
        e_response_area.appendChild( document.createElement( "br" ) );

        if( result.errData !== "" )
        {
            var e_errA = document.createElement( "div" );
            e_errA.innerHTML = "Error output of the target:";
            e_response_area.appendChild( e_errA );

            var e_err = document.createElement( "pre" );
            e_err.innerHTML = result.errData;
            e_response_area.appendChild( e_err );
        }
    }
    else
    {
        var err = document.createElement( "div" );
        err.innerHTML = "Server error!!! "+this.status;
        e_response_area.appendChild( err );
        var div = document.createElement( "div" );
        // li.className += " delete_me monospace";
        div.innerHTML = this.responseText;
        e_response_area.appendChild( div );
    }

    targets_completed++;
    if( targets_completed >= selected_targets.length )
    {
        onTargetsComplete();
    }
    else
        onUploadsComplete();
}

function onTargetsComplete()
{
    // var fun_stuff = JSON.parse( this.responseText );
    // if( fun_stuff.code == 0 )
    // {
    //     e_build_success.style.display = 'inline';
    // }
    // else
    // {
    //     e_build_failure.style.display = 'inline';
    // }
    // e_response_err.innerHTML  = "Error output: "+fun_stuff.errData;
    // e_response_out.innerHTML  = "Informational output: "+fun_stuff.outData;
    // alert( "Done" );
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
