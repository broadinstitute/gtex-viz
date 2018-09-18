/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

/*
1. Color legend for log scale is not spaced correctly.
 */
'use strict';
import {createSvg, generateRandomMatrix, generateRandomList} from "./modules/utils";
import {range} from "d3-array";
import {randomNormal} from "d3-random";
import Heatmap from "./modules/Heatmap";
import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import DendroHeatmap from "./modules/DendroHeatmap";
import GroupedViolin from "./modules/GroupedViolin";

const demoData = {
    heatmap:generateRandomMatrix({x:50, y:10, scaleFactor:1000}),
    dendroHeatmap: {
        rowTree: "(((TP53:0.17,SLK:0.17):1.18,NDRG4:1.34):1.33,ACTN3:2.67);",
        colTree: "(((Adipose Visceral Omentum:0.06,Adipose Subcutaneous:0.06):0.00,Bladder:0.06):0.16,Adrenal Gland:0.22);",
        heatmap: [
    {
      "y": "SLK",
      "value": 35.505,
      "x": "Adipose Subcutaneous",
      "unit": "TPM"
    },
    {
      "y": "SLK",
      "value": 29.28,
      "x": "Adipose Visceral Omentum",
      "unit": "TPM"
    },
    {
      "y": "SLK",
      "value": 17.405,
      "x": "Adrenal Gland",
      "unit": "TPM"
    },
    {
      "y": "SLK",
      "value": 53.29,
      "x": "Bladder",
      "unit": "TPM"
    },
    {
      "y": "NDRG4",
      "value": 12.035,
      "x": "Adipose Subcutaneous",
      "unit": "TPM"
    },
    {
      "y": "NDRG4",
      "value": 6.531000000000001,
      "x": "Adipose Visceral Omentum",
      "unit": "TPM"
    },
    {
      "y": "NDRG4",
      "value": 134.8,
      "x": "Adrenal Gland",
      "unit": "TPM"
    },
    {
      "y": "NDRG4",
      "value": 7.1160000000000005,
      "x": "Bladder",
      "unit": "TPM"
    },
    {
      "y": "TP53",
      "value": 29.935,
      "x": "Adipose Subcutaneous",
      "unit": "TPM"
    },
    {
      "y": "TP53",
      "value": 23.55,
      "x": "Adipose Visceral Omentum",
      "unit": "TPM"
    },
    {
      "y": "TP53",
      "value": 18.515,
      "x": "Adrenal Gland",
      "unit": "TPM"
    },
    {
      "y": "TP53",
      "value": 40.51,
      "x": "Bladder",
      "unit": "TPM"
    },
    {
      "y": "ACTN3",
      "value": 0.33145,
      "x": "Adipose Subcutaneous",
      "unit": "TPM"
    },
    {
      "y": "ACTN3",
      "value": 0.3317,
      "x": "Adipose Visceral Omentum",
      "unit": "TPM"
    },
    {
      "y": "ACTN3",
      "value": 0.100005,
      "x": "Adrenal Gland",
      "unit": "TPM"
    },
    {
      "y": "ACTN3",
      "value": 0.48100000000000004,
      "x": "Bladder",
      "unit": "TPM"
    }
  ]
    },
    groupedViolinPlot: [
        {
           group: "Group 1",
           label: "Gene 1",
           values: range(0, 2000).map(randomNormal(2, 1))
        },
        {
            group: "Group 1",
            label: "Gene 2",
            values: range(0, 2000).map(randomNormal(5, 1))
        },
        {
            group: "Group 1",
            label: "Gene 3",
            values: range(0, 2000).map(randomNormal(10, 1))
        },
        {
           group: "Group 2",
           label: "Gene 1",
           values: range(0, 2000).map(randomNormal(5, 1))
        },
        {
            group: "Group 2",
            label: "Gene 2",
            values: range(0, 2000).map(randomNormal(3, 1))
        },
        {
            group: "Group 2",
            label: "Gene 3",
            values: range(0, 2000).map(randomNormal(1, 1))
        },
        {
           group: "Group 3",
           label: "Gene 1",
           values: range(0, 2000).map(randomNormal(2, 1))
        },
        {
            group: "Group 3",
            label: "Gene 2",
            values: range(0, 2000).map(randomNormal(3, 1))
        },
        {
            group: "Group 3",
            label: "Gene 3",
            values: range(0, 2000).map(randomNormal(5, 1))
        }
    ]
};

const heatmapDemoConfig = {
    id: 'gtexVizHeatmap',
    data: demoData.heatmap,
    width: 1200, // outer width
    height: 300, // outer height
    marginLeft: 20,
    marginRight: 40,
    marginTop: 50,
    marginBottom: 50,
    colorScheme: "YlGnBu",
    cornerRadius: 2,
    columnLabelHeight: 20,
    columnLabelAngle: 60,
    columnLabelPosAdjust: 10,
    rowLabelWidth: 100,
    legendSpace: 50,
    useLog: true,
    logBase: 10
};

/**
 * Render a 2D Heatmap
 * @param params
 */
export function heatmap(par=heatmapDemoConfig){
    let margin = {
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom,
        left: par.marginLeft
    };
    let inWidth = par.width - (par.marginLeft + par.marginRight + par.rowLabelWidth);
    let inHeight = par.height - (par.marginTop + par.marginBottom + par.columnLabelHeight);

    // test input params
    if ($(`#${par.id}`).length == 0) {
        let error = `Input Error: DOM ID ${par.id} is not found.`;
        alert(error);
        throw error;
    }

    // create the SVG
    let svg = createSvg(par.id, par.width, par.height, margin);

    // render the heatmap
    let tooltipId = `${par.id}Tooltip`;
    let h = new Heatmap(par.data, par.useLog, par.logBase, par.colorScheme, par.cornerRadius, tooltipId);
    h.draw(svg, {w:inWidth, h:inHeight}, par.columnLabelAngle, false, par.columnLabelPosAdjust);
    h.drawColorLegend(svg, {x:20, y: -20}, 10);
}

const dendroHeatmapDemoConfig = {
    id: 'gtexVizDendroHeatmap',
    data: demoData.dendroHeatmap,
    useLog: true,
    logBase: 10,
    width: 600, // outer width
    height: 300, // outer height
    marginLeft: 20,
    marginRight: 40,
    marginTop: 50,
    marginBottom: 50,
    rowTreePanelWidth: 100,
    colTreePanelHeight: 100,
    colorScheme: "Blues",
    cornerRadius: 2,
    columnLabelHeight: 200,
    columnLabelAngle: 60,
    columnLabelPosAdjust: 10,
    rowLabelWidth: 200,
    legendSpace: 50
};

/**
 * Render a DendroHeatmap
 * @param par
 */
export function dendroHeatmap(par=dendroHeatmapDemoConfig){
    let margin = {
        top: par.marginTop,
        right: par.marginRight + par.rowLabelWidth,
        bottom: par.marginBottom + par.columnLabelHeight,
        left: par.marginLeft
    };

    // test input params
    if ($(`#${par.id}`).length == 0) {
        let error = `Input Error: DOM ID ${par.id} is not found.`;
        alert(error);
        throw error;
    }

    let inWidth = par.width - (par.marginLeft + par.marginRight + par.rowLabelWidth);
    let inHeight = par.height - (par.marginTop + par.marginBottom + par.columnLabelHeight);

    let svgId = `${par.id}Svg`;
    let tooltipId = `${par.id}Tooltip`;
    let dmapConfig = new DendroHeatmapConfig(par.width, par.rowTreePanelWidth, par.colTreePanelHeight, margin);
    let dmap = new DendroHeatmap(par.data.colTree, par.data.rowTree, par.data.heatmap, par.colorScheme, par.cornerRadius, dmapConfig, tooltipId, par.useLog, par.logBase)
    let showColTree = par.data.colTree !== undefined;
    let showRowTree = par.data.rowTree !== undefined;
    dmap.render(par.id, svgId, showColTree, showRowTree, "top", 8);
}

const violinDemoConfig = {
    id: 'gtexGroupedViolinPlot',
    data: demoData.groupedViolinPlot,
    width: 500,
    height: 330,
    marginLeft: 100,
    marginRight: 20,
    marginTop: 100,
    marginBottom: 100,
    showDivider: true,
    xPadding: 0.3,
    yLabel: "Random Value",
    showGroupX: true,
    showX: true,
    xAngle: 0,
    showWhisker: false,
    showLegend: true,
    showSampleSize: true
};
export function groupedViolinPlot(par=violinDemoConfig){
    console.log(par.data);
    let margin = {
        top: par.marginTop,
        right: par.marginRight,
        bottom: par.marginBottom,
        left: par.marginLeft
    };
    // test input params
    if ($(`#${par.id}`).length == 0) {
        let error = `Input Error: DOM ID ${par.id} is not found.`;
        alert(error);
        throw error;
    }

    let inWidth = par.width - (par.marginLeft + par.marginRight);
    let inHeight = par.height - (par.marginTop + par.marginBottom);

    let svgId = `${par.id}Svg`;
    let tooltipId = `${par.id}Tooltip`;

    // create the SVG
    let svg = createSvg(par.id, par.width, par.height, margin);

    const gViolin = new GroupedViolin(par.data);
    gViolin.render(svg, inWidth, inHeight, par.xPadding, undefined, [], par.yLabel, par.showGroupX, par.ShowX, par.xAngle, par.showWhisker, par.showDivider, par.showLegend);
    const tooltip = gViolin.createTooltip(tooltipId);


}

