/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

'use strict';
import {range} from "d3-array";
import {createSvg} from "./modules/utils";
import Heatmap from "./modules/Heatmap";

/*
Heatmap TODO:
1. Rewrite how log transformation is done in the viz code.
2. Change originalValue to displayValue.
3. Rewrite Heatmap constructor param format.
 */

const demoData = {
    heatmap:randomData({x:50, y:10, scaleFactor:100})
};

/**
 * Renders a 2D Heatmap
 * @param params
 */
export function heatmap(par={
    id: 'gtexVizHeatmap',
    data: demoData.heatmap,

    width: 1200,
    height: 500,
    columnLabelWidth: 100,
    rowLabelHeight: 100,
    marginLeft: 20,
    marginRight: 40,
    marginTop: 20,
    marginBottom: 20,

    colorScheme: "YlGnBu",
    cornerRadius: 2,
    columnLabelAngle: 60,


}){
    // create an SVG
    let margin = {
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom,
        left: par.marginLeft
    };
    let inWidth = par.width - (par.marginLeft + par.marginRight + par.columnLabelWidth);
    let inHeight = par.height - (par.marginTop + par.marginBottom + par.rowLabelHeight);
    let svg = createSvg(par.id, par.width, par.height, margin);
    let h = new Heatmap(par.data, par.colorScheme, false);
    h.draw(svg, {w:inWidth, h:inHeight}, par.columnLabelAngle);
}

/**
 * Generate a list of x*y data objects with random values
 * The data object has this structure: {x: xlabel, y: ylabel, value: some value, originalValue: some value}
 * @param par
 * @returns {Array}
 */
function randomData(par={x:20, y:20, scaleFactor:1}){
    let X = range(1, par.x+1); // generates a 1-based list.
    let Y = range(1, par.y+1);
    let data = [];
    X.forEach((x)=>{
        x = 'x' + x.toString();
        Y.forEach((y)=>{
            y = 'y' + y.toString();
            let v = Math.random()*par.scaleFactor;
            data.push({
                x: x,
                y: y,
                value: v,
                originalValue: v
            });
        })
    });
    return data;
}