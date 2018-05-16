'use strict';
import {json} from 'd3-fetch';
import {select} from 'd3-selection';
import {getGtexUrls,
    parseTissues,
    parseSamples
} from './modules/gtexDataParser';
import Toolbar from './modules/Toolbar';

export function buildDataMatrix(tableId, datasetId='gtex-v7', urls=getGtexUrls()){
    const promises = [
        // TODO: urls for other datasets
        json(urls.tissue),
        json(urls.sample + 'WGS'),
        json(urls.sample + 'WES')
    ];

    Promise.all(promises)
        .then(function(args){
            let tissues = parseTissues(args[0]);
            let wgsTable = parseSamples(args[1]).reduce((a, d)=>{
                if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
                a[d.tissueId]= a[d.tissueId]+1;
                return a;
                }, {});
            let wesTable = parseSamples(args[2]).reduce((a, d)=>{
                if(a[d.tissueId]===undefined) a[d.tissueId] = 0;
                a[d.tissueId]= a[d.tissueId]+1;
                return a;
                }, {});

            _renderMatrixTable(datasetId, tableId, tissues, wesTable, wgsTable);
            _addClickEvents(tableId);
            _addToolbar();


        })
        .catch(function(err){console.error(err)});
}

/**
 * Render the matrix in an HTML table format
 * @param datasetId {String}
 * @param tableId {String} the DOM ID of the table
 * @param tissues {List} of GTEx tissue objects with attr: tissueName, tissueId, rnaSeqSampleCount, rnsSeqAndGenotypeSampleCount
 * @param wesTable {Dictionary} of WES sample counts indexed by tissueId
 * @param wgsTable {Dictionary} of WGS sample counts indexed by tissueId
 * @private
 */
function _renderMatrixTable(datasetId, tableId, tissues, wesTable, wgsTable){
    const dataset = {
        'gtex-v7': {
            label:'GTEX V7',
            bgcolor: '#2a718b'
        }
    };

    // rendering the column labels
    const theTable = select(`#${tableId}`);
    const columns = ['', 'RNA-Seq', 'RNA-Seq with WGS', 'WES', 'WGS'];
    theTable.select('thead').selectAll('th')
        .data(columns)
        .enter()
        .append('th')
        .attr('scope', 'col')
        .attr('class', (d, i)=>`y${i}`)
        .text((d)=>d);

    theTable.select('.table-label')
        .append('th')
        .attr('colspan', columns.length)
        .text(dataset[datasetId].label)
        .style('background-color',dataset[datasetId].bgcolor);


    const theRows = theTable.select('tbody').selectAll('tr')
        .data(tissues)
        .enter()
        .append('tr');

    theRows.append('th')
        .attr('scope', 'row')
        .attr('class', (d, i)=>`x${i}`)
        .text((d)=>d.tissueName);

    theRows.append('td')
        .attr('class', (d, i)=>`x${i} y1`)
        .text((d)=>d.rnaSeqSampleCount||'');

    theRows.append('td')
        .attr('class', (d, i)=>`x${i} y2`)
        .text((d)=>d.rnaSeqAndGenotypeSampleCount||'');

    theRows.append('td')
        .attr('class', (d, i)=>`x${i} y3`)
        .text((d)=>wesTable[d.tissueId]||'');

    theRows.append('td')
        .attr('class', (d, i)=>`x${i} y4`)
        .text((d)=>wgsTable[d.tissueId]||'');
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
           console.log(theColumn);
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
           console.log('hey!');
        })


    // data cells
    theCells.style('cursor', 'pointer')
        .on('click', function(){
            // toggle the selected class assignment
            select(this).classed('selected', !select(this).classed('selected'));
        })
}

function _addToolbar(){
    const toolbar = new Toolbar('matrix-table-toolbar', undefined, true);
    toolbar.createButton('sample-download');
    toolbar.createButton('send-to-firecloud', 'fa-cloud-upload-alt');
}


