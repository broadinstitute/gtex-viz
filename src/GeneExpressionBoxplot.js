/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
'use strict';

import {json} from 'd3-fetch';
import {getGtexUrls, parseGeneExpressionForBoxplot} from './modules/gtexDataParser';

export function launch(rootId, gencodeId, urls=getGtexUrls()) {
    json(urls.geneExpBoxplot + gencodeId)
        .then(function(data) {
            console.log(parseGeneExpressionForBoxplot(data));
        });
}