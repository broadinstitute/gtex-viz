'use strict';
import {json, tsv} from 'd3-fetch';
import {select, selectAll} from 'd3-selection';
import {getGtexUrls,
    parseTissues
} from './modules/gtexDataParser';
import Toolbar from './modules/Toolbar';
import {googleFunc} from './modules/googleUser';

/**
 * Render the google sig-in button
 * @param callback {Function}, the default function is googleFunc().signInButton
 */
export function renderSignInButton(callback=googleFunc().signInButton){
    callback();
}

/**
 * Define the Google sign out function
 * @param callback {Function}, the default is googleFunc().signOut
 */
export function signOut(callback=googleFunc().signOut){
    callback();
}

/**
 * build the summary table
 * @param tableId {String}: a DOM table ID
 * @param datasetId {String}: a dataset ID
 * @param googleFunc {Object} with function attributes: checkSignedIn, getUser
 * @param urls {Object}: API URLs
 */

export function launch(tableId, datasetId='gtex_v7', googleFuncDict=googleFunc(), urls=getGtexUrls()){
    const promises = [
        json(urls.tissue),
        tsv(urls.rnaseqCram), // rnaseq cram file info
        tsv(urls.wgsCram), // wgs cram file info
        tsv(urls.sample), // GTEx sample TSV file: for better performance
    ];

    Promise.all(promises)
        .then(function(args){
            let tissues = parseTissues(args[0]); // get GTEx tissue objects
            const cram = {
                rnaseq: args[1].reduce((a, d)=>{a[d.sample_id.toUpperCase()]=d; return a;}, {}),
                wgs: args[2].reduce((a, d)=>{a[d.sample_id.toUpperCase()]=d; return a;}, {})
            };
            // parse Samples
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
                            s.dataType = 'RNA-Seq'; // replace RNASEQ with RNA-Seq
                            break;
                        }
                        default:
                            // so far, we do not have cram files for other data types, so do nothing
                    }
                    return s;
                });
            samples = _checkRnaSeqWithGenotype(samples);
            const theMatrix = _buildMatrix(datasetId, samples, tissues);
            _renderMatrixTable(tableId, theMatrix, googleFuncDict, urls);
            _addFilters(tableId, theMatrix, samples, tissues, googleFuncDict, urls);

        })
        .catch(function(err){console.error(err)});
}

/**
 * Check RNA-Seq samples for subjects with genotype data and assign RNA-Seq-WGS to the custom private sample attribute: _type.
 * TODO: find a better way than assigning a private attribute to flag customized sample groups.
 * @param samples: a list of sample objects with required attributes: dataType, subjectId, tissueSiteDetailId
 * @returns: a new list of samples
 * @private
 */
function _checkRnaSeqWithGenotype(samples){
    // find subjects that have genotype data
    const wgsHash = samples.filter((s) => {
        if(!s.hasOwnProperty('dataType')) {
            console.error(s);
            throw 'Parse Error: required attribute is missing: dataType';
        }
        return s.dataType == 'WGS';
    }).reduce((a, d) => {
        if (!d.hasOwnProperty('subjectId')) throw 'Parse Error: required attribute is missing.';
        a[d.subjectId] = 1;
        return a;
    }, {});
    const attr = 'tissueSiteDetailId';
    return samples.map((s)=>{
        if(!s.hasOwnProperty('dataType') || !s.hasOwnProperty('subjectId')) throw 'Parse Error: required attribute is missing.';
        if (s.dataType == 'RNA-Seq' && wgsHash.hasOwnProperty(s.subjectId)){
            s._type = 'RNA-Seq-WGS'; // modified the _type to RNA-Seq-WGS
        }
        return s;
    });
}

/**
 *
 * @param datasetId {String}
 * @param samples {List} a list of sample objects in dataset ID
 * @param tissues {List}
 * @returns {{datasetId: *, X: *, Y: *[], data: *}}
 * @private
 */
function _buildMatrix(datasetId, samples, tissues){
    const __buildHash = function(dataType){
        const attr = 'tissueSiteDetailId';
        return samples.filter((s)=>{
            if(!s.hasOwnProperty('dataType')) {
                console.error(s);
                throw 'Parse Error: required attribute is missing: _type or dataType';
            }
            if (dataType == 'RNA-Seq-WGS') return s._type == dataType;
            else return s.dataType==dataType;
        }).reduce((a, s)=>{
            if(!s.hasOwnProperty(attr)){
                console.error(s);
                throw 'Parse Error: required attribute is missing:' + attr;
            }
            if(a[s[attr]]===undefined) a[s[attr]] = [];
            a[s[attr]].push(s);
            return a;
        }, {});
    };

    const columns = [
        {
            label: 'RNA-Seq',
            id: 'RNA-Seq',
            data: __buildHash('RNA-Seq') // lists of RNA-Seq samples indexed by tissueSiteDetailId
        },
        {
            label: 'RNA-Seq With WGS',
            id: 'RNA-Seq-WGS',
            data: __buildHash('RNA-Seq-WGS')
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
        ['tissueSiteDetailId', 'tissueSiteDetail'].forEach((d)=>{
            if (!t.hasOwnProperty(d)) {
                console.error(t);
                throw 'Tissue parsing error: required attribute is missing: ' + d;
            }
        });
        t.id = t.tissueSiteDetailId;
        t.label = t.tissueSiteDetail;
        columns.forEach((col)=>{
            t[col.id] = col.data[t.id] || undefined;
        });
        return t;
    });

    return {
        datasetId: datasetId,
        X: rows,
        Y: columns,
        data: samples // not sure if this is needed.
    };
}

/**
 *
 * @param tableId {String}
 * @param mat {Object}: generated by __buildMatrix()
 * @param samples {List} a list of sample objects
 * @param tissues {List} a list of tissue objects
 * @param googleFuncDict {Object} with function attributes: checkSignedIn, getUser
 * @param urls {Object}: API URLs
 * @private
 */
function _addFilters(tableId, mat, samples, tissues, googleFuncDict, urls){
    const __filter = ()=>{
        let sex = $('input[name="sex"]:checked').val(); // jQuery syntax for DOM manipulations
        let ages = [];
        $('.ageBox').each(function(){
            if ($(this).is(":checked")) ages.push($(this).val());
            if(ages.length < 6) $('input[name="allAges"]').prop('checked', false);
            if(ages.length == 6) $('input[name="allAges"][value="all"]').prop('checked', true);
        });
        if (sex == 'both' && ages.length == 6){
            _renderMatrixTable(tableId, _buildMatrix(mat.datasetId, samples, tissues), googleFuncDict, urls);
        } else {
            let filteredMat = undefined;
            if (sex == 'both') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>ages.indexOf(s.ageBracket)>=0), tissues);
            else if (ages.length == 6) filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex), tissues);
            else filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex && ages.indexOf(s.ageBracket)>=0), tissues);
            _renderMatrixTable(tableId, filteredMat, googleFuncDict, urls);
        }
    };

    // Define input change events:
    $('input[name="sex"]').change(__filter);
    $('.ageBox').each(function(){
        $(this).change(__filter);
    });
    $('input[name="allAges"]').change(function(){
        let val = $(this).val();
        switch(val){
            case 'all': {
                $('.ageBox').prop('checked', true);
                __filter();
                break;
            }
            case 'reset': {
                $('.ageBox').prop('checked', false);
                break;
            }
            default:
                // do nothing
        }
    });
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

/**
 * Render sample counts in the summary table
 * @param tbody {Object} a D3 select object
 * @param mat {Object} generated by _buildMatrix()
 * @private
 */
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
        .text((d)=>{
            return d.label
        });

    // rendering sample counts
    mat.Y.forEach((y, j)=>{
        theRows.append('td')
            .attr('class', (d, i)=>{
                return d[y.id]===undefined?'':`x${i} y${j}`;
            })
            .text((d)=>{
                let counts = d[y.id]?d[y.id].length : '';
                return counts;
            });
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
        });


    // data cells
    theCells.style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selected class assignment
            select(this).classed('selected', !select(this).classed('selected'));
        })
}

/**
 * Add a tool bar
 * @param tableId
 * @param mat
 * @private
 * Reference: https://github.com/eligrey/FileSaver.js/
 * Dependencies: googleUser.js
 */
function _addToolbar(tableId, mat, googleFuncDict, urls){
    // TODO: get rid of hard-coded dom IDs
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');

    // create the toolbar and buttons
    select('#matrix-table-toolbar').selectAll('*').remove();
    const toolbar = new Toolbar('matrix-table-toolbar', undefined, true);
    toolbar.createButton('sample-download');
    toolbar.createButton('send-to-firecloud', 'fa-cloud-upload-alt');

    select('#sample-download')
        .style('cursor', 'pointer')
        .on('click', function(){
            // fetch selected table cells
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
                    // parse the cell's x and y IDs
                    const marker = select(this).attr('class').split(' ').filter((c)=>{return c!='selected'});
                    const x = mat.X[parseInt(marker[0].replace('x', ''))];
                    const y = mat.Y[parseInt(marker[1].replace('y', ''))];

                    // const selectedSamples = mat.data.filter((s)=>__filterSample(s, x, y)).map((s)=>{
                    const selectedSamples = y.data[x.id].map((s)=>{
                            console.log(s);
                            let cram = [
                                'cram_file',
                                'cram_file_aws',
                                'cram_file_md5',
                                'cram_file_size',
                                'cram_index',
                                'cram_index_aws'
                            ].map((d)=>s.cramFile[d]);
                            ['cramFile', 'tissueSiteDetail', 'dataType'].forEach((k)=>{
                                if(!s.hasOwnProperty(k)) throw 'Parse Error: required attribute is missing: ' + k;
                            });
                            let columns = [s.cramFile.sample_id, s.tissueSiteDetail, s.dataType].concat(cram);
                            return columns.join("\t");
                        });
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
                const x = mat.X[parseInt(marker[0].replace('x', ''))];
                const y = mat.Y[parseInt(marker[1].replace('y', ''))];

                const selected = y.data[x.id].map(d=> {
                    let temp = d.sampleId.split('-');
                    d.donorId = temp[0] + '-' + temp[1];
                    return d;
                }); // NOTE: currently we don't have WES CRAM file paths
                allSelectedSamples = allSelectedSamples.concat(selected)
            });
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
/**
 * Get the user's FireCloud billing projects
 * @param googleUser {Object} Google API current user object
 * @param domId {String} the DOM ID for reporting the billing projects
 * @private
 */
function _reportBillingProjects(googleUser, domId="billing-project-list") {

    // get the user's access token
    let token = googleUser.getAuthResponse(true).access_token;

    // ajax call to FireCloud biling project web service
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
            // jQuery
            $(`#${domId}`).empty();
            response.forEach((d)=>{
                $('<label>' +
                    `<input type="radio" name="billing-project" value="${d.projectName}"> ` +
                    d.projectName +
                   '</label><br/>'
                ).appendTo($(`#${domId}`));
            });
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
                        // Note: use cramFile.sample_id instead of d.sampleId to preserve the mixed case sample IDs
                        return [d.cramFile.sample_id, d.donorId, d.dataType
                            , d.cramFile.cram_file, d.cramFile.cram_index].join('\t');
                    }));
                    const sampleEntityString = `entities=${sampleEntity.join('\n')}\n`;
                    const sampleEntityUrlEncode = encodeURI(sampleEntityString);

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
                            window.open(fcURL, '_blank');
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




