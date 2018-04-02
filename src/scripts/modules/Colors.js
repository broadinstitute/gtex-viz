import {max} from "d3-array";
import {scaleSequential} from "d3-scale";
import * as d3Chromatic from "d3-scale-chromatic";
"use strict";

export function colorChart(shuffle=true){
    // ref: http://cloford.com/resources/colours/namedcol.htm
    const colors = [
        "crimson", "palevioletred", "deeppink", "mediumvioletred", "orchid",
        "fuchsia", "darkmagenta", "darkviolet", "indigo", "blueviolet",
        "blue", "mediumslateblue", "darkslateblue", "mediumblue", "midnightblue",
        "royalblue", "dodgerblue", "deppskyblue", "darkturquoise", "steelblue",
        "darkcyan", "darkslategray", "seagreen", "limegreen", "darkgreen",
        "mediumspringgreen", "darkseagreen","green", "olivedrab", "darkkhaki",
        "darkolivegreen", "yellowgreen", "olive", "goldenrod", "darkgoldenrod",
        "orange", "tan", "peru", "sandybrown", "chocolate", "saddlebrown",
        "sienna", "coral", "orangered", "tomato", "rosybrown",
        "firebrick", "indianred", "red", "brown","gray", "black"
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

export function getColorInterpolator(name){
    // reference: https://github.com/d3/d3-scale-chromatic/blob/master/README.md#sequential-multi-hue
    const interpolators = {
        BuGn: d3Chromatic.interpolateBuGn,
        OrRd: d3Chromatic.interpolateOrRd,
        PuBu: d3Chromatic.interpolatePuBu,
        YlGnBu: d3Chromatic.interpolateYlGnBu
    };
    if (!interpolators.hasOwnProperty(name)) throw "Color Interpolator Error";
    return interpolators[name];

}


export function getColors(theme){
    const palette = {
        // colorbrewer
        ylgnbu:["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58","#040e29"],
        orrd: ["#edf8b1",'#fff7ec','#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000','#4c0000'],
        gnbu: ['#f0f0f0','#f7fcf0','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#0868ac','#084081','#052851'],
        rdpu: ['#fff7f3','#fde0dd','#fcc5c0','#fa9fb5','#f768a1','#dd3497','#ae017e','#7a0177','#49006a'],

        // other sources
        blues: ["#eeeeee", "#e8f8fc", "#caeef9", "#abe4f5", "#5fcbed", "#1aafdd", "#1697bf", "#117391", "#0a4354", "#041f27"],
        reds: ["#FFE4DE", "#FFC6BA", "#F7866E", "#d9745e", "#D25C43", "#b6442c", "#9b3a25","#712a1c", "#562015", "#2d110b"],
        reds2: ['#f0f0f0', '#fff5f0','#fee0d2','#fcbba1','#fc9272','#fb6a4a','#ef3b2c','#cb181d','#a50f15','#67000d'],
        purples: ["#eeeeee",'#fcfbfd','#efedf5','#dadaeb','#bcbddc','#9e9ac8','#807dba','#6a51a3','#54278f','#3f007d'],
        greys: ["snow",'#f0f0f0','#d9d9d9','#bdbdbd','#969696','#737373','#525252','#252525','#000000']
    };
    if(!palette.hasOwnProperty(theme)) throw "Color theme not found: " + theme;
    return palette[theme]
}

/**
 * reference: https://github.com/d3/d3-scale
 * reference: http://bl.ocks.org/curran/3094b37e63b918bab0a06787e161607b
 * scaleSequential maps the continuous domain to a continuous color scale
 * @param data {List} of numerical data
 * @param colors {d3Chromatic function}
 */
export function setColorScale(data, colors=d3Chromatic.interpolateYlGnBu, dmin = 0) {
    let dmax = Math.round(max(data));
    const scale = scaleSequential(colors);
    scale.domain([dmin, dmax]);
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
 * @param cell
 */
export function drawColorLegend(title, dom, scale, config, useLog, base=10, cell={h:15, w:50}){

    // const data = [0].concat(scale.quantiles()); // add 0 to the list of values
    const data = scale.ticks(5).slice(1); // why this doesn't provide consistent number of ticks??
    // legend title
    dom.append("text")
        .attr("class", "color-legend")
        .text(title)
        .attr("x", -10)
        .attr("text-anchor", "end")
        .attr("y", cell.h)
        .attr("transform", `translate(${config.x}, ${config.y})`);

    // legend groups
    const legends = dom.append("g").attr("transform", `translate(${config.x}, ${config.y})`)
                    .selectAll(".legend").data(data);

    const g = legends.enter().append("g").classed("legend", true);
    g.append("rect")
        .attr("x", (d, i) => cell.w*i)
        .attr("y", 5)
        .attr("width", cell.w)
        .attr("height", cell.h)
        .style("fill", scale);

    g.append("text")
        .attr("class", "color-legend")
        .text((d) => useLog?(Math.pow(base, d)-1).toPrecision(2):d.toPrecision(2)) // TODO: assuming log is base 10
        .attr("x", (d, i) => cell.w * i)
        .attr("y", 0);


}