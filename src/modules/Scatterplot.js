/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
/*
Input data structure: a list of data object with the following structure:
[
    {
        label: "dataset 1",
        values: [a list of numerical values],
        color: "the color of the dataset, optional"
     },
     {
        label: "dataset 2",
        values: [a list of numerical values],
        color: "the color of the dataset, optional"
     }
]
*/

import {scaleLinear} from 'd3-scale';
import {axisBottom, axisLeft} from 'd3-axis';
import {max, min, extent} from 'd3-array';

export default class Scatterplot {
    constructor(data, groupInfo={}) {
        this._sanityCheck(data)
        this.data = data;
        this.groupInfo = groupInfo;
    }

    render(dom, height, width) {
        let scales = this._getScales(height, width);
        let xAxis = axisBottom(scales.x);
        let yAxis = axisLeft(scales.y);

        // drawing plot
        dom.append('g')
            .attr('id', 'scatter-x-axis')
            .attr('class', 'scatter-axis')
            .attr('transform', `translate(0, ${height})`)
            .call(xAxis);
        dom.append('g')
            .attr('id', 'scatter-y-axis')
            .attr('class', 'scatter-axis')
            .call(yAxis);
        dom.append('g')
            .attr('class', 'scatter-points')
            .selectAll('circle')
            .data(this.data)
            .enter()
            .append('circle')
            .attr('cx', d=>scales.x(d.x))
            .attr('cy', d=>scales.y(d.y))
            .attr('r', 3)
            .attr('fill', 'steelblue');



    }

    _getScales(height, width) {
        let xScale = scaleLinear()
            .domain(extent(this.data, (d)=>d.x))
            .range([0, width]);
        let yScale = scaleLinear()
            .domain(extent(this.data, (d)=>d.y))
            .range([height, 0]);
        return {
            x: xScale,
            y: yScale
        };
    }

    _sanityCheck(data) {
        let requiredAttr = ['x', 'y', 'group'];
        data.forEach(d => {
            requiredAttr.forEach(i => {
                if (d[i] === undefined) {
                    throw `Scatterplot: Input data error. Data missing attribute ${i}`;
                }
            });
        });
    }
}
