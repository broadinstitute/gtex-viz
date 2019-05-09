/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
'use strict';

import {select} from 'd3-selection';
import Scatterplot from './modules/Scatterplot';


export function launch(rootId, data, dimensions={w:window.innerWidth*.8, h:500}, margins={top:50, bottom:50, right:50, left:50}) {
    let splot = new Scatterplot(data);
    const svg = select(`#${rootId}`)
                .append('svg')
                .attr('height', dimensions.h + margins.top + margins.bottom)
                .attr('width', dimensions.w + margins.left + margins.right)
                .append('g').attr('transform', `translate(${margins.left}, ${margins.top})`);
    splot.render(svg, dimensions.h, dimensions.w);
}