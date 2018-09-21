/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {ascending, median, quantile, extent} from 'd3-array';
import {select} from 'd3-selection';
import {scaleBand, scaleLinear, scaleLog} from 'd3-scale';
import {axisBottom, axisLeft} from 'd3-axis';

export default class Boxplot {
    constructor(boxplotData){
        this.boxplotData = boxplotData;
        this.allVals = [];
        this.boxplotData.forEach(d => {d.data.sort(ascending); this.allVals = this.allVals.concat(d.data)});
        this.allVals.sort(ascending);
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


        // render IQR box
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('rect')
            .data(this.boxplotData)
            .enter()
            .append('rect')
            .attr('x', (d) => scales.x(d.tissueSiteDetailId) - scales.x.step()/2)
            .attr('y', (d) => scales.y(quantile(d.data, .75) + 0.05))
            .attr('width', (d) => scales.x.step())
            .attr('height', (d) => scales.y(quantile(d.data, .25) + 0.05) - scales.y(quantile(d.data, .75) + 0.05))
            .attr('fill', 'steelblue');

        // render median
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('line')
            .data(this.boxplotData)
            .enter()
            .append('line')
            .attr('x1', (d) => scales.x(d.tissueSiteDetailId) - scales.x.step()/2)
            .attr('y1', (d) => scales.y(median(d.data) + 0.05))
            .attr('x2', (d) => scales.x(d.tissueSiteDetailId) + scales.x.step()/2)
            .attr('y2', (d) => scales.y(median(d.data) + 0.05))
            .attr('stroke', 'black');
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
        // let yScale = scaleLinear()
        //     .domain(extent(this.allVals).map(d => Math.log10(d+0.05))) // +.-5 for 0's
        //     .range([innerHeight, 0]);

        return {
            x: xScale,
            y: yScale
        };
    }
}
