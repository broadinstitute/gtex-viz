/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
"use strict";
import {json} from "d3-fetch";
import {brushX} from "d3-brush";
import {select, selectAll, event} from "d3-selection";
import {extent, max, min} from "d3-array";

import {checkDomId} from "./modules/utils";
import {
    getGtexUrls,
    parseGenes,
    parseSingleTissueEqtls,
    parseLD
} from "./modules/gtexDataParser";
import BubbleMap from "./modules/BubbleMap";
import HalfMap from "./modules/HalfMap";

export function render(svgPar, geneId, rootDivId, spinnerId, dashboardId, urls = getGtexUrls()){
    $(`#${spinnerId}`).show();
    json(urls.geneId + geneId) // query the gene by geneId which could be gene name or gencode ID with or withour versioning
        .then(function(data){
            let gene = parseGenes(data, true, geneId); // fetch the gene by user specified gene ID
            json(urls.singleTissueEqtl + gene.gencodeId)
                .then(function(data2){
                    let eqtls = parseSingleTissueEqtls(data2);
                    // canvasPar.data = eqtls;
                    svgPar.data = eqtls;
                    json(urls.ld + gene.gencodeId)
                    .then(function(data) {
                        let ld = parseLD(data);
                        svgPar.ldData = ld.filter((d)=>d.value>=svgPar.ldCutoff); // filter unused data
                        renderBubbleMap(svgPar, gene, dashboardId);
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
        left: par.marginLeft + par.focusPanelRowLabelWidth,
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom + par.focusPanelColumnLabelHeight
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

/**
 * Render the bubble heatmap
 * @param par {Object} configure the visualizations
 * TODO: check required attributes in par
 * @param gene {Object} containing attr: gencodeId
 * @param dashboardId {String} the DIV ID for the dashboard
 * @returns {BubbleMap}
 */
function renderBubbleMap(par, gene, dashboardId){
    par = setDimensions(par);

    let bmap = new BubbleMap(par.data, par.useLog, par.logBase, par.colorScheme, par.id+"-bmap-tooltip");
    let ldMap = new HalfMap(par.ldData, par.ldCutoff, false, undefined, par.ldColorScheme, par.id+"-ld-tooltip", [0,1]);

    let svg = createSvg(par.id, par.width, par.height, undefined);

    let miniG = svg.append("g")
        .attr("class", "context")
        .attr("transform", `translate(${par.margin.left}, ${par.margin.top})`);

    let focusG = svg.append("g")
        .attr("class", "focus")
        .attr("transform", `translate(${par.focusPanelMargin.left}, ${par.focusPanelMargin.top})`);

    let ldCanvas = select(`#${par.ldId}`).append("canvas")
        .attr("id", par.id + "-ld-canvas")
        .attr("width", par.width)
        .attr("height", par.width)
        .style("position", "absolute");

    let ldSvg = createSvg(par.ldId, par.width, par.width, undefined);
    let ldG = ldSvg.append("g")
        .attr("class", "ld")
        .attr("transform", `translate(${par.ldPanelMargin.left}, ${par.ldPanelMargin.top})`);

    bmap.drawCombo(
        miniG,
        focusG,
        {w:par.inWidth, h:par.miniPanelHeight, top:5, left:0, h2: par.focusPanelHeight},
        par.colorScaleDomain,
        par.showLabels,
        par.focusPanelColumnLabelAngle,
        par.focusPanelColumnLabelAdjust,
        false
    );
    bmap.drawColorLegend(svg, {x: par.focusPanelMargin.left, y: par.focusPanelMargin.top-20}, 3, "NES");
    ldMap.drawColorLegend(ldSvg, {x: par.ldPanelMargin.left, y: 100}, 10, "LD");

    // add a brush
    let brush = brushX()
        .extent([
            [0,0],
            [par.inWidth, par.miniPanelHeight]
        ])
        .on("brush", ()=>{
            let selection = event.selection;
            let brushLeft = Math.round(selection[0] / bmap.xScaleMini.step());
            let brushRight = Math.round(selection[1] / bmap.xScaleMini.step());

            // update scales
            bmap.xScale.domain(bmap.xScaleMini.domain().slice(brushLeft, brushRight)); // reset the xScale domain
            let bubbleMax = bmap._setBubbleMax();
            bmap.bubbleScale.range([2, bubbleMax]); // TODO: change hard-coded min radius

            if (ldMap.xScale !== undefined) ldMap.xScale.domain(bmap.xScale.domain());
            if (ldMap.yScale !== undefined) ldMap.yScale.domain(bmap.xScale.domain());
            bmap.drawBubbleLegend(svg, {x: par.width/2, y:par.focusPanelMargin.top-20, title: "-log10(p-value)"}, 5, "-log10(p-value)");

            // update the focus bubbles
            focusG.selectAll(".bubble-map-cell")
                .attr("cx", (d) => {
                    let x = bmap.xScale(d.displayX ? d.displayX : d.x);
                    return x === undefined ? bmap.xScale.bandwidth() / 2 : x + bmap.xScale.bandwidth() / 2;

                })
                .attr("r", (d) => {
                    let x = bmap.xScale(d.displayX ? d.displayX : d.x);
                    return x === undefined ? 0 : bmap.bubbleScale(d.r)
                });

            // update the column labels
            focusG.selectAll(".bubble-map-xlabel")
                .attr("transform", (d) => {
                    let x = bmap.xScale(d) + bmap.xScale.bandwidth()/3 || 0; // TODO: remove hard-coded value
                    let y = bmap.yScale.range()[1] + par.focusPanelColumnLabelAdjust;
                    return `translate(${x}, ${y}) rotate(${par.focusPanelColumnLabelAngle})`;

                })
                .style("font-size", `${Math.floor(bmap.xScale.bandwidth())/2}px`)
                .style("display", (d) => {
                    let x = bmap.xScale(d);
                    return x === undefined ? "none" : "block";
                });

            // render the LD
            ldG.selectAll("*").remove(); // clear all child nodes in ldG before rendering
            ldMap.draw(ldCanvas, ldG, {w:par.inWidth, top:par.ldPanelMargin.top, left:par.ldPanelMargin.left}, [0,1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain());

        });

    miniG.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, [0, bmap.xScaleMini.bandwidth()*100]);

    // filter events
    renderDashboard(dashboardId, bmap, miniG, focusG);


    return bmap;

}

/**
 * Use jQuery to build the dashboard DOM elements
 * @param id {String} the DIV root ID
 * @param bmap {BubbleMap} a bubble map object
 * @param miniG {Object} the D3 object of the mini bubble map
 * @param focusG {Object} the D3 object of the zoom bubble map
 * dependencies: jQuery
 */
function renderDashboard(id, bmap, miniG, focusG){
    checkDomId(id);
    let searches = [
        {
            id: 'pvalueLimit',
            size: 3,
            value: 0,
            label: '-log<sub>10</sub>(p-value) >= '
        },
        {
            id: 'nesLimit',
            size: 3,
            value: 0,
            label: 'abs(NES) >= '
        },
        {
            id: 'ldLimit',
            size: 3,
            value: 0,
            label: 'LD cutoff R<sup>2</sup> >= '
        },
        {
            id: 'varLocator',
            size: 30,
            label: 'Variant locator ',
            placeholder: '  Variant ID... '
        }
    ];

    let sliders = [
        {
            id: 'pvalueSlider',
            type: 'range',
            min: 0,
            max: 20,
            step: 1,
            value: 0
        },
        {
            id: 'nesSlider',
            type: 'range',
            min: 0,
            max: 1,
            step: 0.1,
            value: 0
        },
        {
            id: 'ldSlider',
            type: 'range',
            min: 0,
            max: 1,
            step: 0.1,
            value: 0
        }

    ];

    // create each search section
    searches.forEach((s, i)=>{
        if ($(`#${s.id}`).length == 0) { // if it doesn't already exist, then create it
            let div = $('<div/>')
                .appendTo($(`#${id}`));
            div.addClass('col-xs-12 col-sm-6 col-md-3');
            div.html(s.label);

            // add the search box
            let input = $('<input/>')
                .attr('id', s.id)
                .attr('value', s.value)
                .attr('size', s.size)
                .appendTo(div);

            if (s.placeholder) input.attr('placeholder', s.placeholder);

            // add the slider
            let sl = sliders[i];
            if (sl === undefined) return;
            let slider = $('<input/>')
                .attr('id', sl.id)
                .attr('value', sl.value)
                .attr('type', sl.type)
                .attr('min', sl.min)
                .attr('max', sl.max)
                .attr('step', sl.step)
                .css("margin-left", "10px")
                .appendTo(div);

        } // add the new element to the dashboard
    });

    // definte the filter events
    let minP = 0;
    let minNes = 0;
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
}