/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    /*
        Takes a nested array and reduces it to an unnested array of all its
        elements.
    */
    function flatten (array) {
        return [];
    }

    plotviz.toolbox = {
        flatten: flatten
    };

    return plotviz;
}) (plotviz || {});

//exports.flatten = plotviz;
