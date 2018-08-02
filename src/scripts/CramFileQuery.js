'use strict';
import {json, tsv} from 'd3-fetch';
import {select, selectAll} from 'd3-selection';
import {getGtexUrls,
    parseTissues
} from './modules/gtexDataParser';
import Toolbar from './modules/Toolbar';
import {googleFunc} from './modules/googleUser';

/*
TODO:
first build a data matrix with the following structure
{
    col: tissues
    row: data types
    data: [ objects with col and row and value ]
}
 */

/**
 * Render the google signed in button (if there isn't one provided already)
 * @param callback {Function}
 */
export function renderSignInButton(callback=googleFunc().signInButton){
    callback();
}

/**
 * Define the Google sign out function
 * @param callback {Function}
 */
export function signOut(callback=googleFunc().signOut){
    callback();
}

/**
 * build the data matrix table
 * @param tableId {String}
 * @param datasetId {String}
 * @param googleFunc {Object} with function attributes: checkSignedIn, getUser
 * @param urls
 */

export function launch(tableId, datasetId='gtex_v7', googleFuncDict=googleFunc(), urls=getGtexUrls()){
    const promises = [
        // TODO: urls for other datasets
        json(urls.tissue),
        tsv(urls.rnaseqCram),
        tsv(urls.wgsCram),
        tsv(urls.sample),
    ];

    Promise.all(promises)
        .then(function(args){
            let tissues = parseTissues(args[0]);
            const cram = {
                rnaseq: args[1].reduce((a, d)=>{a[d.sample_id.toUpperCase()]=d; return a;}, {}),
                wgs: args[2].reduce((a, d)=>{a[d.sample_id.toUpperCase()]=d; return a;}, {})
            };
            let samples = args[3]
                .filter((s)=>s.datasetId==datasetId)
                .map((s)=>{
                    switch (s.dataType){
                        case "WGS": {
                            if (!cram.wgs.hasOwnProperty(s.sampleId)) throw s.sampleId + ' has no cram files';
                            s.cramFile = cram.wgs[s.sampleId];
                            break;
                        }
                        case "RNASEQ": {
                            if (!cram.rnaseq.hasOwnProperty(s.sampleId)) throw s.sampleId + ' has no cram files';
                            s.cramFile = cram.rnaseq[s.sampleId];
                            s.dataType = 'RNA-Seq';
                            break;
                        }
                        default:
                            // do nothing
                    }
                    return s;
                });
            const theMatrix = _buildMatrix(datasetId, samples, tissues);
            _renderMatrixTable(tableId, theMatrix, googleFuncDict, urls);
            _addFilters(tableId, theMatrix, samples, tissues, googleFuncDict, urls);

        })
        .catch(function(err){console.error(err)});
}

function _addFilters(tableId, mat, samples, tissues, googleFuncDict, urls){
    const __filter = ()=>{
        const sex = select('input[name="sex"]:checked').node().value;
        const age = select('input[name="age"]:checked').node().value;
        if (sex == 'both' && age == 'all'){
            _renderMatrixTable(tableId, _buildMatrix(mat.datasetId, samples, tissues), googleFuncDict, urls);
        } else {
            let filteredMat = undefined;
            if (sex == 'both') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.ageBracket==age), tissues);
            else if (age == 'all') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex), tissues);
            else filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex && s.ageBracket==age), tissues);
            _renderMatrixTable(tableId, filteredMat, googleFuncDict, urls);
        }
    };
    select('#filter-menu').selectAll('input[name="sex"]').on('change', __filter);
    select('#filter-menu').selectAll('input[name="age"]').on('change', __filter);
}

function _buildMatrix(datasetId, samples, tissues){
    const __buildHash = function(dataType){
        return samples.filter((s)=>s.dataType==dataType).reduce((a, d)=>{
            if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
            a[d.tissueId]= a[d.tissueId]+1;
            return a;
        }, {});
    };
    const columns = [
        {
            label: 'RNA-Seq',
            id: 'RNA-Seq',
            data: __buildHash('RNA-Seq')
            // id: 'RNASEQ',
            // data: __buildHash('RNASEQ')
        },
        {
            label: 'WES',
            id: 'WES',
            data: __buildHash('WES')
        },
        {
            label: 'WGS',
            id: 'WGS',
            data: __buildHash('WGS')
        }
    ];
    const rows = tissues.map((t)=>{
        t.id = t.tissueId;
        t.label = t.tissueName;
        columns.forEach((col)=>{
            t[col.id] = col.data[t.id] || undefined;
        });
        return t;
    });

    return {
        datasetId: datasetId,
        X: rows,
        Y: columns,
        data: samples
    };
}


/**
 * Render the matrix in an HTML table format
 * @param tableId {String} the DOM ID of the table
 * @param mat {Object} of attr: datasetId, X--a list of x objects, Y--a list of y objects
 * @private
 */
function _renderMatrixTable(tableId, mat, googleFuncDict, urls){
    const dataset = {
        'gtex_v7': {
            label:'GTEX V7',
            bgcolor: '#2a718b'
        }
    };
    // rendering the column labels
    const theTable = select(`#${tableId}`);
    theTable.select('thead').selectAll('th')
        .data([{label:"", id:""}].concat(mat.Y))
        .enter()
        .append('th')
        .attr('scope', 'col')
        .attr('class', (d, i)=>d.id==""?'':`y${i-1}`)
        .text((d)=>d.label);

    theTable.select('.table-label').selectAll('*').remove();
    theTable.select('.table-label').append('th')
        .attr('colspan', mat.Y.length + 1)
        .text(dataset[mat.datasetId].label)
        .style('background-color',dataset[mat.datasetId].bgcolor);

    _renderCounts(theTable.select('tbody'), mat);
    _addClickEvents(tableId);
    _addToolbar(tableId, mat, googleFuncDict, urls); // rebuild the toolbar with the new matrix
}

function _renderCounts(tbody, mat){
    tbody.selectAll('.data-row').remove();
    const theRows = tbody.selectAll('.data-row')
        .data(mat.X)
        .enter()
        .append('tr')
        .classed('data-row', true);

    // rendering the row label
    theRows.append('th')
        .attr('scope', 'row')
        .attr('class', (d, i)=>`x${i}`)
        .text((d)=>d.label);

    mat.Y.forEach((y, j)=>{
        theRows.append('td')
            .attr('class', (d, i)=>{
                return d[y.id]===undefined?'':`x${i} y${j}`;
            })
            .text((d)=>d[y.id]||'');
    });

}

/**
 * Add customized column, row and cell click events
 * @param tableId {String} the dom ID of the table
 * @private
 */
function _addClickEvents(tableId){
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');

    // column labels
    select(`#${tableId}`).select('thead').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selection
           const theColumn = select(this).attr('class');
           if (select(this).attr('scope') == 'col') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theColumn}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'col');
               theCells.filter(`.${theColumn}`).classed('selected', false);
           }
           // console.log(theColumn);
        });

    // row labels
    select(`#${tableId}`).select('tbody').selectAll('th')
        .style('cursor', 'pointer')
        .on('click', function(){
           const theRow = select(this).attr('class');
           if (select(this).attr('scope') == 'row') {
               select(this).attr('scope', 'selected');
               theCells.filter(`.${theRow}`).classed('selected', true);
           } else {
               select(this).attr('scope', 'row');
               theCells.filter(`.${theRow}`).classed('selected', false);
           }
           // console.log(theRow);
        });


    // data cells
    theCells.style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selected class assignment
            select(this).classed('selected', !select(this).classed('selected'));
        })
}

/**
 *
 * @param tableId
 * @param mat
 * @private
 * Reference: https://github.com/eligrey/FileSaver.js/
 * Dependencies: googleUser.js
 */
function _addToolbar(tableId, mat, googleFuncDict, urls){
    // TODO: get rid of hard-coded dom IDs
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');
    select('#matrix-table-toolbar').selectAll('*').remove();
    const toolbar = new Toolbar('matrix-table-toolbar', undefined, true);
    toolbar.createButton('sample-download');
    toolbar.createButton('send-to-firecloud', 'fa-cloud-upload-alt');

    select('#sample-download')
        .style('cursor', 'pointer')
        .on('click', function(){
            let cells = theCells.filter(`.selected`);
            if (cells.empty()) alert('You have not selected any samples to download.');
            else {
                let downloadContent = [
                        'Sample ID',
                        'Tissue Name',
                        'Data Type',
                        'CRAM File GCP',
                        'CRAM File AWS',
                        'CRAM File MD5',
                        'CRAM File Size',
                        'CRAM Index GCP',
                        'CRAM Index AWS'
                    ].join("\t") + '\n';
                cells.each(function(d){
                    const marker = select(this).attr('class').split(' ').filter((c)=>{return c!='selected'});
                    const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                    const y = mat.Y[parseInt(marker[1].replace('y', ''))].id;
                    console.log('Download ' + x + ' : '+ y);

                    const selectedSamples = mat.data.filter((s)=>s.dataType==y&&s.tissueId==x&&s.dataType!='WES')
                        /**** WARNING: no WES cram files available ATM ****/
                        .map((s)=>{
                            console.log(s);
                            let cram = [
                                'cram_file',
                                'cram_file_aws',
                                'cram_file_md5',
                                'cram_file_size',
                                'cram_index',
                                'cram_index_aws'
                            ].map((d)=>s.cramFile[d]);
                            let columns = [s.cramFile.sample_id, s.tissueName, s.dataType].concat(cram);
                            return columns.join("\t");
                        });
                    console.log(selectedSamples);
                    downloadContent += selectedSamples.join("\n");
                });
                let file = new Blob([downloadContent], {type: 'text/plain;charset=utf-8'});
                saveAs(file, 'GTEx.cram.txt', true); // saveAs() is a FileSaver file, disable auto BOM

            }

        });

    select('#send-to-firecloud')
        .style('cursor', 'pointer')
        .on('click', function(){
            $('#fire-cloud-status').empty();
             if (!googleFuncDict.checkSignedIn()){
                 alert("You need to sign in first");
             }
             const scopes = 'profile email https://www.googleapis.com/auth/devstorage.full_control https://www.googleapis.com/auth/plus.me';
            googleFuncDict.grantScopes(scopes);
            _reportBillingProjects(googleFuncDict.getUser());
            _reportWorkspaces(googleFuncDict.getUser());

            let cells = theCells.filter(`.selected`);
            if (cells.empty()) alert('You have not selected any samples to download.');
            else {
                select('#fire-cloud-form').style("display", "block");
            }
        });

    select('#submit-to-firecloud-btn')
        .on('click', function(){
            $('#fire-cloud-status').empty();
            let cells = theCells.filter(`.selected`);
            let allSelectedSamples = [];
            cells.each(function(d) {
                const marker = select(this).attr('class').split(' ').filter((c) => {
                    return c != 'selected'
                });
                const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                const y = mat.Y[parseInt(marker[1].replace('y', ''))].id;
                console.log('Download ' + x + ' : ' + y);
                const selected = mat.data.filter((s)=>s.dataType==y&&s.tissueId==x&&s.dataType!='WES').map(d=> {
                    let temp = d.sampleId.split('-');
                    d.donorId = temp[0] + '-' + temp[1];
                    return d;
                }); // NOTE: currently we don't have WES CRAM file paths
                allSelectedSamples = allSelectedSamples.concat(selected)
            });
            console.log(allSelectedSamples.length);
            _submitToFireCloud(googleFuncDict, allSelectedSamples, urls);
            select('#fire-cloud-form').style("display", "none");
        });

    select('#cancel-firecloud-btn')
        .on('click', function(){
            select('#fire-cloud-form').style("display", "none");
            alert('Canceled!');
        })
}

/***** FireCloud API *****/
// reference: use this URL, https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=MyAccessToken, to check the access token info
// reference: https://developers.google.com/identity/sign-in/web/build-button
// dependencies: jQuery
function _reportBillingProjects(googleUser, domId="billing-project-list") {

    // let profile = googleUser.getBasicProfile();
    // console.log('ID: ' + profile.getId());
    // console.log('Name: ' + profile.getName());
    // console.log('Email: ' + profile.getEmail());
    // get the user's access token

    let token = googleUser.getAuthResponse(true).access_token;
    console.log(token);
    $.ajax({
        url: 'https://api.firecloud.org/api/profile/billing',
        type: 'GET',
        xhrFields: {
            withCredentials: false
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        contentType: 'application/json; charset=utf-8',
        success: function(response){
            // Can't figure out how to generate this form using D3... so here I'm using jQuery syntax
            $(`#${domId}`).empty();
            response.forEach((d)=>{
                $('<label>' +
                    `<input type="radio" name="billing-project" value="${d.projectName}"> ` +
                    d.projectName +
                   '</label><br/>'
                ).appendTo($(`#${domId}`));
            });

            console.log(response[0]);
        }
    });
}

function _reportWorkspaces(googleUser){
    let token = googleUser.getAuthResponse(true).access_token;
     // list User's workspaces
    $.ajax({
        url: 'https://api.firecloud.org/api/workspaces',
        type: 'GET',
        xhrFields: {
            withCredentials: false
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        },

        success: function(response){
            const workspaces = response.filter((d)=>!d.public);
            console.log(workspaces);
        },
        error: function(error){
            console.error(error);
        }
    });
}

function _submitToFireCloud(googleFuncDict, samples, urls){
    const token = googleFuncDict.getUser().getAuthResponse(true).access_token;
    const namespace = $('input[name="billing-project"]').val();
    const workspace = $('input[name="workspace"]').val();
    if(namespace === undefined) {
        alert('You must provide a billin project');
        throw("billing project is not provided");
        return;
    }
    if (workspace === undefined || workspace == ''){
        alert('You must provide a new workspace name');
        throw('workspace name is not provided');
        return;
    }
    console.log(workspace);
    console.log(samples);
    $('#spinner').show();
    // create the workspace
    $.ajax({
        url: urls.fcWorkSpace,
        type: 'POST',
        xhrFields: {
            withCredentials: false
        },
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        },
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify({
            "namespace": namespace,
            "name": workspace,
            "attributes": {},
            "authorizationDomain": []
        }),
        success: function(response){ // callback function after workspace is created
            console.log("finished creating workspace...");
            const donors = samples.map(d=>{
                if (!d.hasOwnProperty('donorId')) throw 'Sample does not contain attr donorId.';
                return d.donorId;
            }).filter((d, i, a) => a.indexOf(d) === i); // obtain unique donors
            const donorEntityString = `entities=entity:participant_id\n${donors.join('\n')}\n`;
            const donorEntityUrlEncode = encodeURI(donorEntityString);

            // submitting participant IDs
            $.ajax({
                url: `${urls.fcWorkSpace}/${namespace}/${workspace}/importEntities`,
                type: 'POST',
                xhrFields: {
                    withCredentials: false
                },
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                },
                contentType: 'application/x-www-form-urlencoded',
                dataType: 'text',
                data: donorEntityUrlEncode,
                success: function(response){
                    $('#spinner').hide();
                    // finally, submitting samples
                    // prepare the sampleEntityString for FireCloud API
                    console.log("finished importing participant IDs...");
                    let sampleEntity = [['entity:sample_id', 'participant_id', 'sample_type', 'bam_file', 'bam_index'].join('\t')];
                    sampleEntity = sampleEntity.concat(samples.map(d=>{
                        if (d.cramFile === undefined) throw "Data Error: " + d;
                        if(!d.cramFile.hasOwnProperty('cram_file')) throw "Data Error: " + d;
                        // Note: use cramFile.sample_id instead of d.sampleId to preserve the occasional mixed case sample IDs
                        return [d.cramFile.sample_id, d.donorId, d.dataTypel
                            , d.cramFile.cram_file, d.cramFile.cram_index].join('\t');
                    }));
                    const sampleEntityString = `entities=${sampleEntity.join('\n')}\n`;
                    const sampleEntityUrlEncode = encodeURI(sampleEntityString);
                    console.log(sampleEntityString);

                    $.ajax({
                        url: `${urls.fcWorkSpace}/${namespace}/${workspace}/importEntities`,
                        type: 'POST',
                        xhrFields: {
                            withCredentials: false
                        },
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                        },
                        contentType: 'application/x-www-form-urlencoded',
                        dataType: 'text',
                        data: sampleEntityUrlEncode,
                        success: function(response){
                            console.log("finished importing samples...");
                            const fcURL = `${urls.fcPortalWorkSpace}/${namespace}/${workspace}/data`;
                            $('#fire-cloud-status').html(`Submitted! <br/> Go to your <br/> <a target="_blank" href="${fcURL}">FireCloud workspace</a>`);
                        },
                        error: function(error){console.error(error)}
                    });
                },
                error: function(error){console.error(error)}
            });
        },
        error: function(error){console.error(error)}
    });
}




