/**
 * TODO:
 * - violin gene colors
 * - eQTL dashboard toolbar
 * - code review
 *  - brush implementation + customizable zoom (optional?)
 *
 */

"use strict";

import {range} from "d3-array";
import {json} from "d3-fetch";
import {randomNormal, randomUniform} from "d3-random";
import {select} from "d3-selection";

import Violin from "./modules/Violin";
import GroupedViolin from "./modules/GroupedViolin";
import {getGtexUrls, parseGeneExpressionForViolin, parseTissues} from "./modules/gtexDataParser";


export function buildGrouped(rootId){
    const colors = {
        "ENSG00000065613.9": "#802f45",
        "ENSG00000106624.4": "#94a8b8",
        "ENSG00000120885.15": "#90c1c1"
    };
    const domIds = {
        tooltip: `${rootId}-tooltip2`,
        toolbar: `${rootId}-toolbar2`,
        chart: `${rootId}-chart`,
        svg: `${rootId}-svg` ,
        clone: `${rootId}-svg-clone`,
        buttons: {
            save: `${rootId}-save`,
            reset: `${rootId}-reset`
        }
    };
     // create all the sub <div> elements in the rootId
    Object.keys(domIds).forEach((k)=>{
        if (k=='buttons' || k=='svg') return;
        $(`<div id="${domIds[k]}"/>`).appendTo(`#${rootId}`);
    });
    const urls = getGtexUrls();
   // get some data
    let gencode = "";
    if (rootId == "oneGene"){
        gencode = "ENSG00000106624.4";
    } else if (rootId == "twoGenes") {
        gencode = "ENSG00000065613.9,ENSG00000106624.4";

    } else {
        gencode = "ENSG00000065613.9,ENSG00000106624.4,ENSG00000120885.15";
    }

    Promise.all([json(urls.tissue), json(urls.geneExp + gencode)])
        .then(function(args){
            const tissueTable = parseTissues(args[0]).reduce((arr,d)=>{arr[d.tissueId]=d; return arr},{});
            const data = parseGeneExpressionForViolin(args[1], true, colors);
            const sort = (a, b)=>{
                if (a>b) return 1;
                if (a<b) return -1;
                return 0;
            };
            const tissues = Object.keys(tissueTable).sort(sort);

            // SVG rendering
            const margin = _setMargins(50, 50, 100, 50);
            const wUnit = rootId=="trellis"?30:20;
            const width = gencode.split(",").length==1?wUnit*tissues.length:wUnit*gencode.split(",").length*tissues.length;
            const dim = _setDimensions(width, 150, margin);
            const dom = select(`#${domIds.chart}`).append("svg")
                .attr("width", dim.outerWidth)
                .attr("height", dim.outerHeight)
                .attr("id", domIds.svg)
                .append("g")
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

            const violin = new GroupedViolin(data);

            ///// creating the tooltip and toolbar, and the brush
            const tooltip = violin.createTooltip(domIds.tooltip);
            const toolbar = violin.createToolbar(domIds.toolbar, tooltip);
            toolbar.createDownloadSvgButton(domIds.buttons.save, domIds.svg, `${rootId}-save.svg`, domIds.clone);

            switch(rootId){
                case "oneGene": {
                    violin.addBrush(dom);
                    violin.render(dom, dim.width, dim.height, 0.3, tissues, [], "log10(TPM)", true, false, 0, false, false, true);
                    _addTissueColorBand(violin, dom, tissueTable, "bottom");
                    break;
                }
                case "twoGenes": {
                    violin.render(dom, dim.width, dim.height, 0.30, tissues, [], "log10(TPM)", true, false, 0, false, true, true);
                    _addTissueColorBand(violin, dom, tissueTable, "bottom");
                    break;
                }

                case "threeGenes": {
                    violin.render(dom, dim.width, dim.height, 0.30, tissues, [], "log10(TPM)", true, false, 0, false, true, true);
                    _addTissueColorBand(violin, dom, tissueTable, "bottom");
                    break;
                }
                case "trellis": {
                    violin.render(dom, dim.width, dim.height, 0.05, tissues, [], "log10(TPM)", false, true, 90, false, false, false, false);
                    _customizeViolinPlot(violin, dom, tissueTable);
                    break;
                }
                default: {
                    throw "rootID is not recognized";
                }
            }

        })
        .catch(function(err){console.error(err)});
}

export function build(rootId){
    const domIds = {
        toolbar: "toolbar",
        chart: "chart",
        tooltip: "tooltip",
        clone: "cloneTestViolin", // this one is needed for downloading svg;
        svg: "testViolin",
        buttons: {
            save: "save",
            reset: "reset"
        }
    };

    // create all the sub <div> elements in the rootId
    Object.keys(domIds).forEach((k)=>{
        if("buttons" == k) return;
        if ("svg" == k) return;
        $(`<div id="${domIds[k]}"/>`).appendTo(`#${rootId}`);
    });

    const data = _generateRandomData(50);
    const margin = _setMargins();
    const dim = _setDimensions();
    let violin = new Violin(data);
    const dom = select(`#${domIds.chart}`).append("svg")
        .attr("width", dim.outerWidth)
        .attr("height", dim.outerHeight)
        .attr("id", domIds.svg)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
    violin.render(dom, dim.width, dim.height, "Random Number");
    const tooltip = violin.createTooltip(domIds.tooltip);

    const toolbar = violin.createToolbar(domIds.toolbar, tooltip);
    toolbar.createDownloadSvgButton('save', domIds.svg, "testViolin", domIds.clone);
    const resetClickEvent = function(){
        violin.zoom(dom);
    };
    toolbar.createResetButton('reset', resetClickEvent)

}

/**
 * Set the dimensions of the violin plot
 * @param width {Integer}
 * @param height {Integer}
 * @param margin {Object} with attr: top, right, bottom, left
 * @returns {{width: number, height: number, outerWidth: number, outerHeight: number}}
 * @private
 */
function _setDimensions(width=1200, height=250, margin=_setMargins()){
    return {
        width: width,
        height: height,
        outerWidth: width + (margin.left + margin.right),
        outerHeight: height + (margin.top + margin.bottom)
    }
}

/**
 * Set the margins of the violin plot
 * @param top {Integer}
 * @param right {Integer}
 * @param bottom {integer}
 * @param left {Integer}
 * @returns {{top: number, right: number, bottom: number, left: number}}
 * @private
 */
function _setMargins(top=50, right=50, bottom=50, left=50){
    return {
        top: top,
        right: right,
        bottom: bottom,
        left: left
    };
}

/**
 * Generate random data sets for the violin
 * data = [
        {
            label: "dataset 1",
            values: [a list of numerical values with a normal distribution]
         },
         {
            label: "dataset 2",
            values: [a list of numerical values with a normal distribution]
         }
    ]
 * @param N {Integer} the number of data sets
 * @private
 * returns a list of data objects
 * reference: https://github.com/d3/d3-random
 */
function _generateRandomData(N=5){
    // values: a list of 100 random numbers with a normal (Gaussian) distribution
    const data =  range(0, N).map((d) => {
        const mu = 100 + Math.random()*20;
        const sigma = 1;
        return {
            label: `dataset ` + d,
            values: range(0, 2000).map(randomNormal(mu, sigma)),
            color: "burlywood"
        }
    });
    return data;
}

/**
 * Customization of the violin plot
 * @param plot {GroupedViolin}
 * @param dom {D3 DOM}
 */
function _customizeViolinPlot(plot, dom, tissueDict){
    plot.groups.forEach((g)=>{

        ////// customize the long tissue name
        const gname = g.key;

        // totally hacking the tissue names here
        const names = tissueDict[gname].tissueName
            .replace(/\(/g, "|(")
            .replace("transformed", "transformed|")
            .split(/ - |\|/)
            .reverse();

        const customXlabel = dom.append("g");
        const customLabels = customXlabel.selectAll(".violin-group-label")
            .data(names);
        customLabels.enter().append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("class", "violin-group-label")
            .attr("transform", (d, i) => {
                let x = plot.scale.x(gname) + plot.scale.x.bandwidth()/2;
                let y = -(10+10*i); // todo: avoid hard-coded values
                return `translate(${x}, ${y})`
            })
            .text((d) => d);
    });

    ////// add the grid
    dom.selectAll(".grid").data(plot.groups)
        .enter()
        .append("rect")
        .attr("x", (g)=>plot.scale.x(g.key))
        .attr("y", (g)=>plot.scale.y.range()[1])
        .attr("width", (g)=>plot.scale.x.bandwidth())
        .attr("height", (g)=>plot.scale.y.range()[0])
        .style("stroke", "#97a4ac")
        .style("stroke-width", 1)
        .style("fill", "none")
        .classed("grid", true);

    ///// add tissue colors
    _addTissueColorBand(plot, dom, tissueDict);

    ///// hide X axis
    dom.selectAll(".violin-x-axis").classed("violin-x-axis-hide", true).classed("violin-x-axis", false);

}

function _addTissueColorBand(plot, dom, tissueDict, loc="top"){
     ///// add tissue colors
    const tissueG = dom.append("g");

    tissueG.selectAll(".tcolor").data(plot.scale.x.domain())
        .enter()
        .append("rect")
        .classed("tcolor", true)
        .attr("x", (g)=>plot.scale.x(g) )
        .attr("y", (g)=>loc=="top"?plot.scale.y.range()[1]-5:plot.scale.y.range()[0]-5)
        .attr("width", (g)=>plot.scale.x.bandwidth())
        .attr("height", 5)
        .style("stroke-width", 0)
        .style("fill", (g)=>`#${tissueDict[g].colorHex}`)
        .style("opacity", 0.7);
}

