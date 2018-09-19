/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {ascending, quantile, max, min} from 'd3-array';
import {select} from 'd3-selection';
import {scaleOrdinal} from 'd3-scale';
import {axisBottom} from 'd3-axis';

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
        let marginLR = 25;
        const svg = this._createSvg(rootId, width, height);
        let xScale = scaleOrdinal().domain([0, this.boxplotData.length]).range([marginLR, width - marginLR]);
        let xAxis = axisBottom().scale(xScale);
        svg.append('g').call(xAxis);
    }

    _createSvg(rootId, width=800, height=600) {
        // TODO: make width/height customizable
        let svg = select(`#${rootId}`).append('svg')
            .attr('width', width)
            .attr('height', height);
        return svg;
    }
}
