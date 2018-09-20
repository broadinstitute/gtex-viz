/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {ascending, quantile, extent} from 'd3-array';
import {select} from 'd3-selection';
import {scaleOrdinal, scaleLinear} from 'd3-scale';
import {axisBottom, axisLeft} from 'd3-axis';

export default class Boxplot {
    constructor(boxplotData){
        this.boxplotData = boxplotData;
        this.allVals = [];
        boxplotData.forEach(d => this.allVals = this.allVals.concat(d.data));
        this.allVals.sort();
    }

    render(rootId) {
        // TODO: make width/height and margins customizable
        let width = 800;
        let height = 600;
        let marginLR = 40;
        let marginTB = 25;
        const svg = this._createSvg(rootId, width, height);
        const dom = svg.append('g').attr('id', 'gtex-viz-boxplot');
        let scales = this._setScales(width, height, marginLR, marginTB);

        dom.append('g').attr('transform', `translate(${marginLR}, ${height - marginTB})`).call(scales.x);
        dom.append('g').attr('transform', `translate(${marginLR}, ${marginTB})`).call(scales.y);
    }

    _createSvg(rootId, width=800, height=600) {
        // TODO: make width/height customizable
        let svg = select(`#${rootId}`).append('svg')
            .attr('width', width)
            .attr('height', height);
        return svg;
    }

    _setScales(width, height, marginLR, marginTB) {
        let xScale = scaleOrdinal()
            .domain([0, this.boxplotData.length])
            .range([0, width - (marginLR * 2)]);
        let xAxis = axisBottom().scale(xScale);

        let yScale = scaleLinear()
            .domain(extent(this.allVals))
            .range([height - (2 * marginTB), 0]);
        let yAxis = axisLeft().scale(yScale);

        return {
            x: xAxis,
            y: yAxis
        };
    }
}
