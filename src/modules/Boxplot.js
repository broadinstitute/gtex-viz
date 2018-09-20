/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {median, quantile, extent} from 'd3-array';
import {select} from 'd3-selection';
import {scaleBand, scaleLinear, scaleLog} from 'd3-scale';
import {axisBottom, axisLeft} from 'd3-axis';

export default class Boxplot {
    constructor(boxplotData){
        this.boxplotData = boxplotData;
        this.allVals = [];
        boxplotData.forEach(d => {d.data.sort(); this.allVals = this.allVals.concat(d.data)});
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
        let scales = this._setScales(width - (margins.left + margins.right), height - (margins.top + margins.bottom));
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

        // render median
        dom.append('g')
            .selectAll('circle')
            .data(this.boxplotData)
            .enter()
            .append('circle')
            .attr('cx', (d) => scales.x(d.tissueSiteDetailId))
            .attr('cy', (d) => scales.y(median(d.data) + 0.05))
            .attr('r', 5)
            .attr('transform', `translate(${margins.left + scales.x.step()/2}, ${margins.top})`);
    }

    _createSvg(rootId, width=800, height=600) {
        // TODO: make width/height customizable
        let svg = select(`#${rootId}`).append('svg')
            .attr('width', width)
            .attr('height', height);
        return svg;
    }

    _setScales(innerWidth, innerHeight) {
        let xScale = scaleBand()
            .domain(this.boxplotData.map(d => d.tissueSiteDetailId))
            .range([0, innerWidth]);

        // let yScale = scaleLinear()
        //     .domain(extent(this.allVals))
        //     .range([innerHeight, 0]);

        let yScale = scaleLog()
            .domain(extent(this.allVals).map(d => d+0.05)) // +.-5 for 0's
            .range([innerHeight, 0]);

        return {
            x: xScale,
            y: yScale
        };
    }
}
