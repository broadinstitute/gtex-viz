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
    constructor(data) {
        this._sanityCheck(data)
        this.data = data;
    }

    render(dom, height, width) {
        let x = scaleLinear()
            .domain(extent(this.data, (d)=>d.x))
            .range([0, width]);

        let y = scaleLinear()
            .domain(extent(this.data, (d)=>d.y))
            .range([height, 0]);

        let xAxis = axisBottom(x);
        let yAxis = axisLeft(y);
        dom.append('g').attr('transform', `translate(0, ${height})`).call(xAxis);
        dom.append('g').call(yAxis);

    }

    _sanityCheck(data) {
        data.forEach(d => {
            if (d.x === undefined || d.y === undefined) {
                throw 'Scatterplot: Input data error.';
            }
        });
    }
}