/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";
import {json} from "d3-fetch";
import {brushX} from "d3-brush";
import {select, selectAll, event} from "d3-selection";
import {extent, max, min} from "d3-array";
import {nest} from "d3-collection";

import {checkDomId} from "./modules/utils";
import {
    getGtexUrls,
    parseGenes,
    parseSingleTissueEqtls,
    parseLD
} from "./modules/gtexDataParser";
import BubbleMap from "./modules/BubbleMap";
import HalfMap from "./modules/HalfMap";

export function render(par, geneId, rootDivId, spinnerId, dashboardId, urls = getGtexUrls()){
    $(`#${spinnerId}`).show();
    json(urls.geneId + geneId) // query the gene by geneId which could be gene name or gencode ID with or withour versioning
        .then(function(data){
            let gene = parseGenes(data, true, geneId); // fetch the gene by user specified gene ID
            json(urls.singleTissueEqtl + gene.gencodeId)
                .then(function(data2){
                    par.data = parseSingleTissueEqtls(data2);
                    par = setDimensions(par); // calculate the required dimensions based on user inputs
                    let bmap = renderBubbleMap(par, gene, dashboardId);

                    json(urls.ld + gene.gencodeId)
                    .then(function(data) {
                        let ld = parseLD(data);
                        par.ldData = ld.filter((d)=>d.value>=par.ldCutoff); // filter unused data
                        renderLdMap(par, bmap);
                        $(`#${spinnerId}`).hide();
                    });

                })
        })
}

/**
 * Set the dimensions of the panels
 * @param par
 * @returns {*}
 */
function setDimensions(par){
    par.margin = {
        left: par.marginLeft + par.focusPanelLabels.row.width + par.focusPanelLabels.row.adjust,
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom + par.focusPanelLabels.column.height
    };
    par.inWidth = par.width - (par.margin.left + par.margin.right);
    par.inHeight = par.height - (par.margin.top + par.margin.bottom);
    par.focusPanelHeight = par.inHeight - (par.legendHeight + par.miniPanelHeight);
    if (par.focusPanelHeight < 0) throw "Config error: focus panel height is negative.";
    par.focusPanelMargin = {
        left: par.margin.left,
        top: par.margin.top + par.miniPanelHeight + par.legendHeight
    };
    par.ldPanelMargin = {
        left: par.margin.left,
        top: 0
    };
    return par;
}

/**
 * Create an SVG
 * @param rootId {String} a DIV dom ID
 * @param width {Integer}
 * @param height {Integer}
 * @param svgId {String} specify the svg ID (optional)
 * @returns {*}
 */
function createSvg(rootId, width, height, svgId=undefined){
    checkDomId(rootId);
    if (svgId===undefined) svgId=`${rootId}-svg`;
    let svg = select("#"+rootId).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", svgId);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    return svg;
}

function renderLdMap(par, bmap){
    let ldMap = new HalfMap(par.ldData, par.ldCutoff, false, undefined, par.ldColorScheme, par.id+"-ld-tooltip", [0,1]);
    let ldCanvas = select(`#${par.ldId}`).append("canvas")
        .attr("id", par.ldId + "-ld-canvas")
        .attr("width", par.width)
        .attr("height", par.width)
        .style("position", "absolute");
    let ldSvg = createSvg(par.ldId, par.width, par.width, undefined);
    let ldG = ldSvg.append("g")
        .attr("class", "ld")
        .attr("id", "ldG")
        .attr("transform", `translate(${par.ldPanelMargin.left}, ${par.ldPanelMargin.top})`);
    ldMap.drawColorLegend(ldSvg, {x: par.ldPanelMargin.left, y: 100}, 10, "LD");
    ldG.selectAll("*").remove(); // clear all child nodes in ldG before rendering
    let ldConfig = {w:par.inWidth, top:par.ldPanelMargin.top, left:par.ldPanelMargin.left};
    ldMap.draw(ldCanvas, ldG, ldConfig, [0,1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain());
    // update the brush on the mini bubble map after LD map is rendered

    bmap.brush.on("brush", ()=>{
        bmap.brushEvent();
        ldG.selectAll("*").remove(); // clear all child nodes in ldG before rendering
        ldMap.draw(ldCanvas, ldG, ldConfig, [0,1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain());
        console.log("LD event added");
    });
}

/**
 * Render the bubble heatmap
 * @param par {Object} configure the visualizations
 * TODO: check required attributes in par
 * @param gene {Object} containing attr: gencodeId
 * @param dashboardId {String} the DIV ID for the dashboard
 * @returns {BubbleMap}
 */
function renderBubbleMap(par, gene, dashboardId){

    let bmap = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, par.id+"-bmap-tooltip");
    let bmapSvg = createSvg(par.id, par.width, par.height, undefined);

    let miniG = bmapSvg.append("g") // global bubble map <g>
        .attr("class", "context")
        .attr("id", "miniG")
        .attr("transform", `translate(${par.margin.left}, ${par.margin.top})`);

    let focusG = bmapSvg.append("g") // zoomed bubble map <g>
        .attr("id", "focusG")
        .attr("class", "focus")
        .attr("transform", `translate(${par.focusPanelMargin.left}, ${par.focusPanelMargin.top})`);

    bmap.drawCombo(
        miniG,
        focusG,
        {w:par.inWidth, h:par.miniPanelHeight, top:5, left:0, h2: par.focusPanelHeight},
        par.colorScaleDomain,
        false, // do not use the default brush, use a custom brush defined below
        par.focusPanelLabels
    );
    bmap.drawColorLegend(bmapSvg, {x: par.focusPanelMargin.left, y: par.focusPanelMargin.top-20}, 3, "NES");

    // add a brush
    bmap.brushEvent = ()=>{
        let focusDomain = updateFocusView(par, bmap, bmapSvg);
        return focusDomain;
    };
    bmap.brush = brushX()
        .extent([
            [0,0],
            [par.inWidth, par.miniPanelHeight]
        ])
        .on("brush", bmap.brushEvent);

    miniG.append("g")
        .attr("class", "brush")
        .call(bmap.brush)
        .call(bmap.brush.move, [0, bmap.xScaleMini.bandwidth()*100]);

    // filter events
    renderBmapFilters(dashboardId, bmap, bmapSvg);
    return bmap;

}

function updateFocusView(par, bmap, bmapSvg){
    let selection = event.selection;
    let brushLeft = Math.round(selection[0] / bmap.xScaleMini.step());
    let brushRight = Math.round(selection[1] / bmap.xScaleMini.step());

    // update scales
    let focusDomain = bmap.xScaleMini.domain().slice(brushLeft, brushRight);
    bmap.xScale.domain(focusDomain); // reset the xScale domain
    let bubbleMax = bmap._setBubbleMax();
    bmap.bubbleScale.range([2, bubbleMax]); // TODO: change hard-coded min radius

    bmap.drawBubbleLegend(bmapSvg, {x: par.width/2, y:par.focusPanelMargin.top-20, title: "-log10(p-value)"}, 5, "-log10(p-value)");

    // update the focus bubbles
    bmapSvg.select("#focusG").selectAll(".bubble-map-cell")
        .attr("cx", (d) => {
            let x = bmap.xScale(d.x);
            return x === undefined ? bmap.xScale.bandwidth() / 2 : x + bmap.xScale.bandwidth() / 2;

        })
        .attr("r", (d) => {
            let x = bmap.xScale(d.x);
            return x === undefined ? 0 : bmap.bubbleScale(d.r); // set the r to zero when x is not in the zoom view.
        });

    // update the column labels
    let cl = par.focusPanelLabels.column;
    bmapSvg.select("#focusG").selectAll(".bubble-map-xlabel")
        .attr("transform", (d) => {
            let x = bmap.xScale(d) + bmap.xScale.bandwidth()/3 || 0; // TODO: remove hard-coded value
            let y = bmap.yScale.range()[1] + cl.adjust;
            return `translate(${x}, ${y}) rotate(${cl.angle})`;

        })
        .style("font-size", `${Math.floor(bmap.xScale.bandwidth())/2}px`)
        .style("display", (d) => {
            let x = bmap.xScale(d);
            return x === undefined ? "none" : "block";
        });
    return focusDomain;
}

function renderBmapFilters(id, bmap, bmapSvg){
    checkDomId(id);
    let panels = [
        {
            id: 'pvaluePanel',
            class: 'col-xs-12 col-sm-6 col-lg-2',
            fontSize: '12px',
            search: {
                id: 'pvalueLimit',
                size: 3,
                value: 0,
                label: '-log<sub>10</sub>(p-value) >= '
            },
            slider: {
                id: 'pvalueSlider',
                type: 'range',
                min: 0,
                max: 20,
                step: 1,
                value: 0
            },
        },
        {
            id: 'nesPanel',
            class: 'col-xs-12 col-sm-6 col-lg-2',
            fontSize: '12px',
            search:  {
                id: 'nesLimit',
                size: 3,
                value: 0,
                label: 'abs(NES) >= '
            },
            slider: {
                id: 'nesSlider',
                type: 'range',
                min: 0,
                max: 1,
                step: 0.1,
                value: 0
            },
        },
        {
            id: 'variantPanel',
            fontSize: '12px',
            class: 'col-xs-12 col-sm-6 col-lg-2',
            search: {
                id: 'varLocator',
                size: 20,
                label: 'Variant locator ',
                placeholder: '  Variant or RS ID... '
            },
        }
    ];
     // create each search section
    $('<label/>')
        .attr('font-size', '12px')
        .attr('class', 'col-xs-12 col-md-12 col-lg-1')
        .html('Apply Filters: ')
        .appendTo($(`#${id}`));

    // Special case: add the RS ID option here
    let rsDiv = $('<div/>')
        .attr('class', 'col-xs-12 col-sm-6 col-md-1')
        .css('font-size', '12px')
        .appendTo($(`#${id}`));
    let radioButton = $('<input/>')
        .attr('id', 'rsSwitch')
        .attr('type', 'checkbox')
        .css('margin-left', '10px')
        .appendTo(rsDiv);
    $('<label/>')
        .css('margin-left', '2px')
        .css('padding-top', '2px')
        .html('Use RS ID')
        .appendTo(rsDiv);

    panelBuilder(panels, id);

    // definte the filter events
    let minP = 0;
    let minNes = 0;
    let minLd = 0;
    const updateBubbles = ()=>{
        bmapSvg.select("#focusG").selectAll('.bubble-map-cell')
            .style('fill', (d)=>{
                if (d.r < minP) return "#fff";
                if (Math.abs(d.value) < minNes) return "#fff";
                return bmap.colorScale(d.value);
            });
        bmapSvg.select("#miniG").selectAll('.mini-map-cell')
            .style('fill', (d)=>{
                if (d.r < minP) return "#fff";
                if (Math.abs(d.value) < minNes) return "#fff";
                return bmap.colorScale(d.value);
            });
    };

    //---- p-value filter events
    $('#pvalueLimit').keydown((e)=>{
        if(e.keyCode == 13){
            minP = parseFloat($('#pvalueLimit').val());
            updateBubbles();
        }
    });

    $('#pvalueSlider').on('change mousemove', ()=>{
        let v = $('#pvalueSlider').val();
        $('#pvalueLimit').val(v);
        minP = v;
        updateBubbles();
    });

    //---- nes filter events
    $('#nesLimit').keydown((e)=>{
        if(e.keyCode == 13){
            minNes = parseFloat($('#nesLimit').val());
            updateBubbles();
        }
    });

    $('#nesSlider').on('change mousemove', ()=>{
        let v = $('#nesSlider').val();
        $('#nesLimit').val(v);
        minNes = v;
        updateBubbles();
    });

    // Variant locator
    let rsLookUp = {};
    let varLookUp = {};
    nest()
        .key((d)=>d.x)
        .entries(bmap.data)
        .forEach((d)=> {
            let v = d.values[0];
            if(v.hasOwnProperty('snpId') === undefined) throw 'Input Error: RS ID lookup table is not built.';
            if(v.hasOwnProperty('displayX') === undefined) throw 'Input Error: display label lookup table is not built.';

            rsLookUp[d.key] = d.values[0].snpId;
            varLookUp[d.key] = d.values[0].displayX;
        });

    bmapSvg.select("#miniG").selectAll('.mini-marker')
        .data(bmap.xScaleMini.domain())
        .enter()
        .append('rect')
        .classed('mini-marker', true)
        .attr('x', (d)=>bmap.xScaleMini(d))
        .attr('y', bmap.yScaleMini.range()[1])
        .attr('width', bmap.xScaleMini.bandwidth())
        .attr('height', bmap.yScaleMini.bandwidth());

    $('#varLocator').keyup((e)=>{
        let v = $('#varLocator').val();
        if (v.length >3){
            const regex = new RegExp(v);
            bmap.select("#focusG").selectAll('.bubble-map-xlabel')
                .classed('query', (d)=>{
                    return regex.test(d)||regex.test(rsLookUp[d])||regex.test(varLookUp[d]);
                });

            // TODO: mark the matched variants on the mini map
            bmap.select("#miniG").selectAll('.mini-marker')
                .classed('highlighted', (d)=>{
                    return regex.test(d)||regex.test(rsLookUp[d])||regex.test(varLookUp[d]);
                });

        } else {
            bmap.select("#focusG").selectAll('.bubble-map-xlabel')
                .classed('query', false);
            bmap.select("#miniG").selectAll('.mini-marker')
                .classed('highlighted', false);
        }

    });

    // rsId

    $('#rsSwitch').change(()=>{
        if ( $('#rsSwitch').is(':checked') ) {
            bmap.select("#focusG").selectAll('.bubble-map-xlabel')
                .text((d)=>rsLookUp[d]);
        } else {
            bmap.select("#focusG").selectAll('.bubble-map-xlabel')
                .text((d)=>varLookUp[d]);
        }

    });
}

function panelBuilder(panels, id){
    panels.forEach((p, i)=>{
        if ($(`#${p.id}`).length == 0) { // if it doesn't already exist in HTML document, then create it
            let div = $('<div/>')
                .attr('id', p.id)
                .attr('class', p.class)
                .css('font-size', p.fontSize)
                .css('background-color', "#eeeeee")
                .css('margin', '1px')
                .css('padding-top', '2px')
                .css('border', '1px solid #d1d1d1')
                .appendTo($(`#${id}`));
            div.addClass(p.class);

            // add the search box
            $('<label/>')
                .html(p.search.label)
                .appendTo(div);

            let input = $('<input/>')
                .attr('id', p.search.id)
                .attr('value', p.search.value)
                .attr('size', p.search.size)
                .attr('placeholder', p.search.placeholder)
                .css('margin-left', '10px')
                .appendTo(div);

            // add the slider if defined
            if (p.slider !== undefined) {
                $('<input/>')
                .attr('id', p.slider.id)
                .attr('value', p.slider.value)
                .attr('type', p.slider.type)
                .attr('min', p.slider.min)
                .attr('max', p.slider.max)
                .attr('step', p.slider.step)
                .css('margin-left', '10px')
                .appendTo(div);
            }
        } // add the new element to the dashboard
    });
}
/**
 * Use jQuery to build the dashboard DOM elements
 * @param id {String} the DIV root ID
 * @param bmap {BubbleMap} a bubble map object
 * @param miniG {Object} the D3 object of the mini bubble map
 * @param focusG {Object} the D3 object of the zoom bubble map
 * @param ldMap {HalfMap} the HalfMap object of the LD plot
 * @param ldG {Object} the D3 object of the ld SVG plot
 * @param ldCanvas {Object} the D3 object of the ld canvas
 * @param ldConfig {Object} the dimensions of the LD plot
 * dependencies: jQuery
 */
function renderDashboard(id, bmap, miniG, focusG, ldMap, ldG, ldCanvas, ldConfig){
    checkDomId(id);
    let panels = [
        {
            id: 'pvaluePanel',
            class: 'col-xs-12 col-sm-6 col-lg-2',
            fontSize: '12px',
            search: {
                id: 'pvalueLimit',
                size: 3,
                value: 0,
                label: '-log<sub>10</sub>(p-value) >= '
            },
            slider: {
                id: 'pvalueSlider',
                type: 'range',
                min: 0,
                max: 20,
                step: 1,
                value: 0
            },
        },
        {
            id: 'nesPanel',
            class: 'col-xs-12 col-sm-6 col-lg-2',
            fontSize: '12px',
            search:  {
                id: 'nesLimit',
                size: 3,
                value: 0,
                label: 'abs(NES) >= '
            },
            slider: {
                id: 'nesSlider',
                type: 'range',
                min: 0,
                max: 1,
                step: 0.1,
                value: 0
            },
        },
        {
            id: 'ldPanel',
            class: 'col-xs-12 col-sm-6 col-lg-2',
            fontSize: '12px',
            search:  {
                id: 'ldLimit',
                size: 3,
                value: 0,
                label: 'LD cutoff R<sup>2</sup> >= '
            },
            slider: {
                id: 'ldSlider',
                type: 'range',
                min: 0,
                max: 1,
                step: 0.1,
                value: 0
            },
        },
        {
            id: 'variantPanel',
            fontSize: '12px',
            class: 'col-xs-12 col-sm-6 col-lg-2',
            search: {
                id: 'varLocator',
                size: 20,
                label: 'Variant locator ',
                placeholder: '  Variant or RS ID... '
            },
        }
    ];

    // create each search section
    $('<label/>')
        .attr('font-size', '12px')
        .attr('class', 'col-xs-12 col-md-12 col-lg-1')
        .html('Apply Filters: ')
        .appendTo($(`#${id}`));

    // Special case: add the RS ID option here
    let rsDiv = $('<div/>')
        .attr('class', 'col-xs-12 col-sm-6 col-md-1')
        .css('font-size', '12px')
        .appendTo($(`#${id}`));
    let radioButton = $('<input/>')
        .attr('id', 'rsSwitch')
        .attr('type', 'checkbox')
        .css('margin-left', '10px')
        .appendTo(rsDiv);
    $('<label/>')
        .css('margin-left', '2px')
        .css('padding-top', '2px')
        .html('Use RS ID')
        .appendTo(rsDiv);

    panels.forEach((p, i)=>{
        if ($(`#${p.id}`).length == 0) { // if it doesn't already exist in HTML document, then create it
            let div = $('<div/>')
                .attr('id', p.id)
                .attr('class', p.class)
                .css('font-size', p.fontSize)
                .css('background-color', "#eeeeee")
                .css('margin', '1px')
                .css('padding-top', '2px')
                .css('border', '1px solid #d1d1d1')
                .appendTo($(`#${id}`));
            div.addClass(p.class);

            // add the search box
            $('<label/>')
                .html(p.search.label)
                .appendTo(div);

            let input = $('<input/>')
                .attr('id', p.search.id)
                .attr('value', p.search.value)
                .attr('size', p.search.size)
                .attr('placeholder', p.search.placeholder)
                .css('margin-left', '10px')
                .appendTo(div);

            // add the slider if defined
            if (p.slider !== undefined) {
                $('<input/>')
                .attr('id', p.slider.id)
                .attr('value', p.slider.value)
                .attr('type', p.slider.type)
                .attr('min', p.slider.min)
                .attr('max', p.slider.max)
                .attr('step', p.slider.step)
                .css('margin-left', '10px')
                .appendTo(div);
            }
        } // add the new element to the dashboard
    });

    // definte the filter events
    let minP = 0;
    let minNes = 0;
    let minLd = 0;
    const updateBubbles = ()=>{
        focusG.selectAll('.bubble-map-cell')
            .style('fill', (d)=>{
                if (d.r < minP) return "#fff";
                if (Math.abs(d.value) < minNes) return "#fff";
                return bmap.colorScale(d.value);
            });
        miniG.selectAll('.mini-map-cell')
            .style('fill', (d)=>{
                if (d.r < minP) return "#fff";
                if (Math.abs(d.value) < minNes) return "#fff";
                return bmap.colorScale(d.value);
            });
    };

    const updateLD = ()=>{
        ldMap.filteredData = ldMap._filter(ldMap.data, minLd);
        ldG.selectAll("*").remove();
        ldMap.draw(ldCanvas, ldG, ldConfig, [0,1], false, undefined)
    };

    //---- p-value filter events
    $('#pvalueLimit').keydown((e)=>{
        if(e.keyCode == 13){
            minP = parseFloat($('#pvalueLimit').val());
            updateBubbles();
        }
    });

    $('#pvalueSlider').on('change mousemove', ()=>{
        let v = $('#pvalueSlider').val();
        $('#pvalueLimit').val(v);
        minP = v;
        updateBubbles();
    });

    //---- nes filter events
    $('#nesLimit').keydown((e)=>{
        if(e.keyCode == 13){
            minNes = parseFloat($('#nesLimit').val());
            updateBubbles();
        }
    });

    $('#nesSlider').on('change mousemove', ()=>{
        let v = $('#nesSlider').val();
        $('#nesLimit').val(v);
        minNes = v;
        updateBubbles();
    });

    //---- LD filter events
    $('#ldLimit').keydown((e)=>{
        if(e.keyCode == 13) {
            let v = parseFloat($('#ldLimit').val());
            minLd = v;
            updateLD();
        }
    });

    $('#ldSlider').on('change mousemove', ()=>{
        let v = $('#ldSlider').val();
        $('#ldLimit').val(v);
        minLd = v;
        updateLD();
    });

    // Variant locator
    let rsLookUp = {};
    let varLookUp = {};
    nest()
        .key((d)=>d.x)
        .entries(bmap.data)
        .forEach((d)=> {
            let v = d.values[0];
            if(v.hasOwnProperty('snpId') === undefined) throw 'Input Error: RS ID lookup table is not built.';
            if(v.hasOwnProperty('displayX') === undefined) throw 'Input Error: display label lookup table is not built.';

            rsLookUp[d.key] = d.values[0].snpId;
            varLookUp[d.key] = d.values[0].displayX;
        });

    miniG.selectAll('.mini-marker')
        .data(bmap.xScaleMini.domain())
        .enter()
        .append('rect')
        .classed('mini-marker', true)
        .attr('x', (d)=>bmap.xScaleMini(d))
        .attr('y', bmap.yScaleMini.range()[1])
        .attr('width', bmap.xScaleMini.bandwidth())
        .attr('height', bmap.yScaleMini.bandwidth());

    $('#varLocator').keyup((e)=>{
        let v = $('#varLocator').val();
        if (v.length >3){
            const regex = new RegExp(v);
            focusG.selectAll('.bubble-map-xlabel')
                .classed('query', (d)=>{
                    return regex.test(d)||regex.test(rsLookUp[d])||regex.test(varLookUp[d]);
                });

            // TODO: mark the matched variants on the mini map
            miniG.selectAll('.mini-marker')
                .classed('highlighted', (d)=>{
                    return regex.test(d)||regex.test(rsLookUp[d])||regex.test(varLookUp[d]);
                });

        } else {
            focusG.selectAll('.bubble-map-xlabel')
                .classed('query', false);
            miniG.selectAll('.mini-marker')
                .classed('highlighted', false);
        }

    });

    // rsId

    $('#rsSwitch').change(()=>{
        if ( $('#rsSwitch').is(':checked') ) {
            focusG.selectAll('.bubble-map-xlabel')
                .text((d)=>rsLookUp[d]);
        } else {
            focusG.selectAll('.bubble-map-xlabel')
                .text((d)=>varLookUp[d]);
        }

    });

}