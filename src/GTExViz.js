/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

/*
TODO:
1. make displayValue optional.
 */
'use strict';
import {createSvg, generateRandomMatrix} from "./modules/utils";
import Heatmap from "./modules/Heatmap";
import DendroHeatmapConfig from "./modules/DendroHeatmapConfig";
import DendroHeatmap from "./modules/DendroHeatmap";

const demoData = {
    heatmap:generateRandomMatrix({x:50, y:10, scaleFactor:100}),
    dendroHeatmap: {
        rowTree: "(((ENSG00000141510.11:0.17,ENSG00000065613.9:0.17):1.18,ENSG00000103034.10:1.34):1.33,ENSG00000248746.1:2.67);",
        colTree: "(((Adipose_Visceral_Omentum:0.06,Adipose_Subcutaneous:0.06):0.00,Bladder:0.06):0.16,Adrenal_Gland:0.22);",
        heatmap: [
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000065613.9",
      "geneSymbol": "SLK",
      "value": 35.505,
      "x": "Adipose_Subcutaneous",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000065613.9",
      "geneSymbol": "SLK",
      "value": 29.28,
      "x": "Adipose_Visceral_Omentum",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000065613.9",
      "geneSymbol": "SLK",
      "value": 17.405,
      "x": "Adrenal_Gland",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000065613.9",
      "geneSymbol": "SLK",
      "value": 53.29,
      "x": "Bladder",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000103034.10",
      "geneSymbol": "NDRG4",
      "value": 12.035,
      "x": "Adipose_Subcutaneous",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000103034.10",
      "geneSymbol": "NDRG4",
      "value": 6.531000000000001,
      "x": "Adipose_Visceral_Omentum",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000103034.10",
      "geneSymbol": "NDRG4",
      "value": 134.8,
      "x": "Adrenal_Gland",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000103034.10",
      "geneSymbol": "NDRG4",
      "value": 7.1160000000000005,
      "x": "Bladder",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000141510.11",
      "geneSymbol": "TP53",
      "value": 29.935,
      "x": "Adipose_Subcutaneous",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000141510.11",
      "geneSymbol": "TP53",
      "value": 23.55,
      "x": "Adipose_Visceral_Omentum",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000141510.11",
      "geneSymbol": "TP53",
      "value": 18.515,
      "x": "Adrenal_Gland",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000141510.11",
      "geneSymbol": "TP53",
      "value": 40.51,
      "x": "Bladder",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000248746.1",
      "geneSymbol": "ACTN3",
      "value": 0.33145,
      "x": "Adipose_Subcutaneous",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000248746.1",
      "geneSymbol": "ACTN3",
      "value": 0.3317,
      "x": "Adipose_Visceral_Omentum",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000248746.1",
      "geneSymbol": "ACTN3",
      "value": 0.100005,
      "x": "Adrenal_Gland",
      "unit": "TPM"
    },
    {
      "datasetId": "gtex_v7",
      "y": "ENSG00000248746.1",
      "geneSymbol": "ACTN3",
      "value": 0.48100000000000004,
      "x": "Bladder",
      "unit": "TPM"
    }
  ]
    }
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
    colorScheme: "YlGnB",
    cornerRadius: 2,
    columnLabelHeight: 20,
    columnLabelAngle: 60,
    columnLabelPosAdjust: 10,
    rowLabelWidth: 100,
    legendSpace: 50
};

/**
 * Renders a 2D Heatmap
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
    let h = new Heatmap(par.data, false, null, par.colorScheme, par.cornerRadius, tooltipId);
    h.draw(svg, {w:inWidth, h:inHeight}, par.columnLabelAngle, false, par.columnLabelPosAdjust);
    h.drawColorLegend(svg, {x:20, y: -20}, 10);
}

const dendroHeatmapDemoConfig = {
    id: 'gtexVizDendroHeatmap',
    data: demoData.dendroHeatmap,
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
    let dmap = new DendroHeatmap(par.data.colTree, par.data.rowTree, par.data.heatmap, par.colorScheme, par.cornerRadius, dmapConfig, tooltipId)
    let showColTree = par.data.colTree !== undefined;
    let showRowTree = par.data.rowTree !== undefined;
    dmap.render(par.id, svgId, showColTree, showRowTree, "top", 5);
}

