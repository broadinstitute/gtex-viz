/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {ascending, quantile, extent} from 'd3-array';
import {select} from 'd3-selection';
import {scaleBand, scaleLinear} from 'd3-scale';
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
        let margins = {
            top: 10,
            bottom: 150,
            left: 40,
            right: 70
        };
        const svg = this._createSvg(rootId, width, height);
        const dom = svg.append('g').attr('id', 'gtex-viz-boxplot');
        let scales = this._setScales(width, height, margins);
        let xAxis = axisBottom(scales.x).ticks(10);
        let yAxis = axisLeft(scales.y);

        // render x-axis
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()/2}, ${height - margins.bottom})`)
            .call(xAxis)
            .attr('text-anchor', 'start')
            .selectAll('text')
            .attr('transform', 'rotate(45)');

        // render y-axis
        dom.append('g')
            .attr('transform', `translate(${margins.left}, ${margins.top})`)
            .call(yAxis);
    }

    _createSvg(rootId, width=800, height=600) {
        // TODO: make width/height customizable
        let svg = select(`#${rootId}`).append('svg')
            .attr('width', width)
            .attr('height', height);
        return svg;
    }

    _setScales(width, height, margins) {
        let xScale = scaleBand()
            .domain(this.boxplotData.map(d => d.tissueSiteDetailId))
            .range([0, width - (margins.left + margins.right)]);

        let yScale = scaleLinear()
            .domain(extent(this.allVals))
            .range([height - (margins.top + margins.bottom), 0]);

        return {
            x: xScale,
            y: yScale
        };
    }
}
