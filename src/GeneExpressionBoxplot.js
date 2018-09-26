/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
'use strict';

import {json} from 'd3-fetch';
import {getGtexUrls, parseGeneExpressionForBoxplot} from './modules/gtexDataParser';

import Boxplot from './modules/Boxplot';

export function launch(rootId, gencodeId, urls=getGtexUrls()) {
    json(urls.geneExp + gencodeId)
        .then(function(data) {
            const boxplotData = parseGeneExpressionForBoxplot(data);
            let boxplot = new Boxplot(boxplotData);
            let plotOptions = {
                width: 800,
                height: 600,
                marginRight: 100
            };
            boxplot.render(rootId, plotOptions);


        });
}
