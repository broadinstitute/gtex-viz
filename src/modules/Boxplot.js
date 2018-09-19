/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {ascending, quantile, max, min} from 'd3-array';
import {select} from 'd3-selection';

export default class Boxplot {
    constructor(boxplotData){
        this.boxplotData = boxplotData;
    }

    render(rootId) {
        const svg = this._createSvg(rootId);
    }

    _createSvg(rootId) {
        let svg = select(`#${rootId}`).append('svg')
            .attr('width', 800)
            .attr('height', 600);
        return svg;
    }
}
