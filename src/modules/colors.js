/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
import {max, min} from "d3-array";
import {scaleSequential} from "d3-scale";
import * as d3Chromatic from "d3-scale-chromatic";
"use strict";

export function colorChart(shuffle=true){
    // ref illustrator color themes
    const colors = [
        "rgb(100,118,120)",
        "rgb(101,141,145)",
        "rgb(103,126,82)",
        "rgb(103,184,222)",
        "rgb(108,110,88)",

        "rgb(108,147,128)",
        "rgb(119,144,182)",
        "rgb(126,130,122)",
        "rgb(133,173,186)",
        "rgb(137,114,91)",
        "rgb(145,170,157)",

        "rgb(145,201,232)",
        "rgb(147,105,66)",
        "rgb(159,114,116)",
        "rgb(159,188,191)",
        "rgb(159,229,194)",
        "rgb(163,163,171)",

        "rgb(164,207,190)",
        "rgb(172,108,130)",
        "rgb(173,84,114)",
        "rgb(174,195,222)",
        "rgb(176,204,153)",

        "rgb(179,180,150)",
        "rgb(180,220,237)",
        "rgb(183,202,121)",
        "rgb(192,202,85)",
        "rgb(193,191,193",
        "rgb(195,97,136)",

        "rgb(199,121,102)",
        "rgb(207,202,76)",
        "rgb(209,219,189)",
        "rgb(213,251,255)",
        "rgb(215,94,56)",

        "rgb(218,114,126)",
        "rgb(223,90,73)",
        "rgb(224,247,217)",
        "rgb(227,205,164)",
        "rgb(228,168,185)",

        "rgb(230,176,152)",
        "rgb(232,212,175)",
        "rgb(239,201,76)",
        "rgb(240,124,108)",
        "rgb(246,232,177)",

        "rgb(249,228,173)",
        "rgb(252,245,191)",
        "rgb(255,188,103)",
        "rgb(45,94,110)",
        "rgb(51,153,204)",

        "rgb(60,124,145)",
        "rgb(62,87,145)",
        "rgb(65,115,120)",
        "rgb(89,216,229)",
        "rgb(94,178,153)",
        "rgb(95,124,134)"
    ];

    if (shuffle) return shuffleColors(colors);
    return colors;
}

function shuffleColors(array) {
    // Fisher-Yates shuffle
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}

/**
 * get a color scheme by name
 * @param name {enum}: BuGn, OrRd....
 * @returns {*}: a continuous interpolator (used with d3.scaleSequential)
 */
export function getColorInterpolator(name){
    // reference: https://github.com/d3/d3-scale-chromatic/blob/master/README.md#sequential-multi-hue

    const interpolators = {
        BuGn: d3Chromatic.interpolateBuGn,
        OrRd: d3Chromatic.interpolateOrRd,
        PuBu: d3Chromatic.interpolatePuBu,
        YlGnBu: d3Chromatic.interpolateYlGnBu,
        Blues: d3Chromatic.interpolateBlues,
        Oranges: d3Chromatic.interpolateOranges,
        Greens: d3Chromatic.interpolateGreens,
        Purples: d3Chromatic.interpolatePurples,
        Reds: d3Chromatic.interpolateReds,
        Greys: d3Chromatic.interpolateGreys,
        Grays: d3Chromatic.interpolateGreys,

        // diverging color schemes
        RdBu: d3Chromatic.interpolateRdBu,
        RdGy: d3Chromatic.interpolateRdGy,
        PiYG: d3Chromatic.interpolatePiYG,
        PuOr: d3Chromatic.interpolatePuOr,
        RdYlBu: d3Chromatic.interpolateRdYlBu
    };
    if (!interpolators.hasOwnProperty(name)) {
        const err = "Unrecognized color: " + name;
        alert(err);
        throw(err);
    }
    return interpolators[name];
}

/**
 * reference: https://github.com/d3/d3-scale
 * reference: http://bl.ocks.org/curran/3094b37e63b918bab0a06787e161607b
 * scaleSequential maps the continuous domain to a continuous color scale
 * @param data {List} of numerical data
 * @param colors {String} a color name that is available in getColorInterpolator()
 * @param dmin {Number} minimum domain value
 * @param dmax {Number} maximum domain value
 * @param reverse {Boolean} reverse the color scheme
 */
export function setColorScale(data, colors="YlGnBu", dmin=undefined, dmax=undefined, reverse=false) {
    data = data.filter((d)=>{return isFinite(d)});
    dmax = dmax === undefined?max(data):dmax;
    dmin = dmin === undefined?min(data):dmin;
    const scale = scaleSequential(getColorInterpolator(colors));
    if(reverse) scale.domain([dmax, dmin]);
    else scale.domain([dmin, dmax]);
    return scale;
}

/**
 * Draw a color legend bar.
 * Dependencies: expressionMap.css
 * @param title {String}
 * @param dom {object} D3 dom object
 * @param scale {Object} D3 scale of the color
 * @param config {Object} with attr: x, y
 * @param useLog {Boolean}
 * @param ticks {Integer} number of ticks (one-sided)
 * @param base {Integer} log base
 * @param cell {Object} with attributes: h, w
 * @param orientation {enum} h or v, i.e. horizontal or vertical
 * @param diverging {Boolean} whether the color scheme is diverging
 * @param cell
 */
export function drawColorLegend(title, dom, scale, config, useLog, ticks=10, base=10, cell={h:10, w:40}, orientation="h", diverging=false){
    let data = [];

    if(diverging){
        let range = [...Array(ticks+1).keys()];
        let interval = scale.domain()[1]/ticks;
        data = range.map((d)=>d*interval);
        data = data.concat(range.filter((d)=>d!=0).map((d)=>0-d*interval)).sort((a, b) => {return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;});
    }
    else{
        let range = [...Array(ticks+1).keys()];
        let interval = scale.domain()[1]/ticks;
        data = range.map((d)=>d*interval);
    }

    // legend groups
    const legends = dom.append("g").attr("transform", `translate(${config.x}, ${config.y})`)
                    .selectAll(".legend").data(data);

    const g = legends.enter().append("g").classed("legend", true);

    if (orientation == 'h'){
         // legend title
        dom.append("text")
            .attr("class", "color-legend")
            .text(title)
            .attr("x", -10)
            .attr("text-anchor", "end")
            .attr("y", cell.h)
            .attr("transform", `translate(${config.x}, ${config.y})`);

        // the color legend
        g.append("rect")
            .attr("x", (d, i) => cell.w*i)
            .attr("y", 5)
            .attr("width", cell.w)
            .attr("height", cell.h)
            .style("fill", scale);

        g.append("text")
            .attr("class", "color-legend")
            .text((d) => useLog?(Math.pow(base, d)-1).toPrecision(2):d.toPrecision(2)) // assuming that raw value had been adjusted by +1 to deal with log transforming zeros
            .attr("x", (d, i) => cell.w * i)
            .attr("y", 0)
            .style("font-size", 10)

    } else {
         // legend title
        dom.append("text")
            .attr("class", "color-legend")
            .text(title)
            .attr("x", 5)
            .attr("text-anchor", "start")
            .attr("y", 0)
            .attr("transform", `translate(${config.x}, ${config.y + cell.h * (data.length + 1)})`);

        g.append("rect")
            .attr("x", 0)
            .attr("y", (d, i) => cell.h*i)
            .attr("width", cell.w)
            .attr("height", cell.h)
            .style("fill", scale);

        g.append("text")
            .attr("class", "color-legend")
            .text((d) => useLog?(Math.pow(base, d)-1).toPrecision(2):d.toPrecision(2))
            .attr("x", 15)
            .attr("y", (d, i) => cell.h * i + (cell.h/2));
    }



}