'use strict';
import {json, tsv} from 'd3-fetch';
import {select, selectAll} from 'd3-selection';
import {getGtexUrls,
    parseTissues
} from './modules/gtexDataParser';
import Toolbar from './modules/Toolbar';

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
 * build the data matrix table
 * @param tableId {String}
 * @param datasetId {String}
 * @param urls
 */

export function launch(tableId, datasetId='gtex_v7', urls=getGtexUrls()){
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
            const files = {
                rnaseqFiles: args[1].reduce((a, d)=>{a[d.sample_id]=d; return a;}, {}),
                wgsFiles: args[2].reduce((a, d)=>{a[d.sample_id]=d; return a;}, {})
            };
            let samples = args[3].filter((s)=>s.datasetId==datasetId);
            const theMatrix = _buildMatrix(datasetId, samples, tissues);

            _renderMatrixTable(tableId, theMatrix);
            _addFilters(tableId, theMatrix, samples, tissues);

        })
        .catch(function(err){console.error(err)});
}

function _addFilters(tableId, mat, samples, tissues){
    const __filter = ()=>{
        const sex = select('input[name="sex"]:checked').node().value;
        const age = select('input[name="age"]:checked').node().value;
        if (sex == 'both' && age == 'all'){
            _renderMatrixTable(tableId, _buildMatrix(mat.datasetId, samples, tissues));
        } else {
            let filteredMat = undefined;
            if (sex == 'both') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.ageBracket==age), tissues);
            else if (age == 'all') filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex), tissues);
            else filteredMat = _buildMatrix(mat.datasetId, samples.filter(s=>s.sex==sex && s.ageBracket==age), tissues);
            _renderMatrixTable(tableId, filteredMat);
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
            id: 'RNASEQ',
            data: __buildHash('RNASEQ')
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
function _renderMatrixTable(tableId, mat){
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
    _addToolbar(tableId, mat);
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
            .attr('class', (d, i)=>`x${i} y${j}`)
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

function _addToolbar(tableId, mat){
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
                cells.each(function(d){
                    const marker = select(this).attr('class').split(' ').filter((c)=>{return c!='selected'});
                    const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                    const y = mat.Y[parseInt(marker[1].replace('y', ''))].id;
                    console.log('Download ' + x + ' : '+ y);
                    const selectedSamples = mat.data.filter((s)=>s.dataType==y&&s.tissueId==x);
                    console.log(selectedSamples);
                })
            }

        });

    select('#send-to-firecloud')
        .style('cursor', 'pointer')
        .on('click', function(){
            alert('Send to FireCloud. To be implemented.')
        });
}


