'use strict';
import {json, tsv} from 'd3-fetch';
import {select} from 'd3-selection';
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

export function buildDataMatrix(tableId, datasetId='gtex_v7', urls=getGtexUrls()){
    const promises = [
        // TODO: urls for other datasets
        json(urls.tissue),
        tsv(urls.sample),
    ];

    Promise.all(promises)
        .then(function(args){
            let tissues = parseTissues(args[0]);
            let samples = args[1].filter((s)=>s.datasetId==datasetId);

            const __buildHash = function(dataType){
                return samples.filter((s)=>s.dataType==dataType).reduce((a, d)=>{
                    if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
                    a[d.tissueId]= a[d.tissueId]+1;
                    return a;
                }, {});
            };
            const columns = [
                {
                    label: 'OMNI',
                    id: 'omni',
                    data: __buildHash('OMNI')
                },
                {
                    label: 'RNA-Seq',
                    id: 'rnaseq',
                    data: __buildHash('RNASEQ')
                },

                {
                    label: 'WES',
                    id: 'wes',
                    data: __buildHash('WES')
                },
                {
                    label: 'WGS',
                    id: 'wgs',
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

            const theMatrix = {
                X: rows,
                Y: columns,
            };
            _renderMatrixTable(datasetId, tableId, theMatrix);
            _addClickEvents(tableId);
            _addToolbar(tableId, theMatrix, samples);
            select('#filter-menu').style('display', 'block'); // TODO: dynamically generate this filter menu


        })
        .catch(function(err){console.error(err)});
}

/**
 * Render the matrix in an HTML table format
 * @param datasetId {String}
 * @param tableId {String} the DOM ID of the table
 * @param mat {Object} of attr: X--a list of x objects, Y--a list of y objects, and data--a list of data objects
 * @private
 */
function _renderMatrixTable(datasetId, tableId, mat){
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
        .attr('class', (d, i)=>`y${i}`)
        .text((d)=>d.label);

    theTable.select('.table-label')
        .append('th')
        .attr('colspan', mat.Y.length + 1)
        .text(dataset[datasetId].label)
        .style('background-color',dataset[datasetId].bgcolor);

    _renderCounts(theTable.select('tbody'), mat)

}

function _renderCounts(tbody, mat){
    tbody.selectAll('td').remove();
    const theRows = tbody.selectAll('tr')
        .data(mat.X)
        .enter()
        .append('tr');

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
    const theCells = select(`#${tableId}`).select('tbody').selectAll('td');

    const toolbar = new Toolbar('matrix-table-toolbar', undefined, true);
    toolbar.createButton('sample-download');
    toolbar.createButton('send-to-firecloud', 'fa-cloud-upload-alt');
    // toolbar.createButton('show-filters', 'fa-filter');
    select('#sample-download')
        .style('cursor', 'pointer')
        .on('click', function(){
            theCells.filter(`.selected`)
                .each(function(d){
                    const marker = select(this).attr('class').split(' ').filter((c)=>{return c!='selected'});
                    const x = mat.X[parseInt(marker[0].replace('x', ''))].id;
                    const y = mat.Y[parseInt(marker[1].replace('y', ''))-1].id;
                    console.log('Download ' + x + ' : '+ y);
                })
        });

    select('#send-to-firecloud')
        .style('cursor', 'pointer')
        .on('click', function(){
            alert('Send to FireCloud. To be implemented.')
        });

    // select('#show-filters')
    //     .style('cursor', 'pointer')
    //     .on('click', function(){
    //         select('#filter-menu')
    //             .style('display', 'block')
    //     })
}


