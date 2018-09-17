/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';


    /**
     * Calculates the maximum and minimum value for all data points. Used to
     * automatically decide how wide the range should be for the plot to let
     * all data be seen.
     *
     * @param - Object - data - The data to be visualized.
     *
     * @returns - Object - two keys: maximum, minimum
     */
    plotviz.maxMin = function (data) {
        var values = data.data.map(function (majorBox) {
            return majorBox.value.map(function (minorBox) {
                // TODO: Better error checking
                minorBox.value = minorBox.value || {};
                minorBox.value.outliers = minorBox.value.outliers || [];
                return [minorBox.value.high_whisker || undefined,
                        minorBox.value.q3 || undefined,
                        minorBox.value.median || undefined,
                        minorBox.value.q1 || undefined,
                        minorBox.value.low_whisker || undefined]
                    .concat(minorBox.value.outliers.map(function (outlier) {
                            return outlier.value.outlier;
                        })
                    );
            })
            .filter(function (value) {
                return value !== undefined && value !== null;
            })
            .reduce(function (minorBoxValuesA, minorBoxValuesB) {
                return minorBoxValuesA.concat(minorBoxValuesB);
            });
        })
        .reduce(function (majorBoxValuesA, majorBoxValuesB) {
            return majorBoxValuesA.concat(majorBoxValuesB);
        })
        .filter(function (identity) {return identity;});

        return {maximum: values.reduce(function (a, b)
                                        {return a > b ? a : b;}, 0),
                minimum: values.reduce(function (a, b)
                                        {return a < b ? a : b;}, 0)};
    }; 

    plotviz.lineMaxMin = function (data) {
        var values = data.map(function (line) {
            return line.value.points.map(function (point) {
                return point.value.median;
            });
        })
        .reduce(function (lineA, lineB) {
            return lineA.concat(lineB);
        });

        return {maximum: values.reduce(function (a, b)
                                        {return a > b ? a : b;}),
                minimum: values.reduce(function (a, b)
                                        {return a < b ? a : b;})};
    };


    /**
     * Sorts the major and minor keys in the data to be visualized. Some
     * default sorting function options available are 'alphabetical',
     * 'increasing', and 'decreasing'. 'increasing' and 'decreasing' for the
     * minor keys base it on the median of the minor keys. 'increasing' and
     * 'decreasing' for the major keys base it on the average of the medians
     * for the minor keys in their grouping.
     *
     * @param - string/function - majorSortFunction - The function that will
     *          be used to sort the major keys. A string can be used to
     *          call and default supported sorting function.
     * @param - string/function - minorSortFunction - The function that will
     *          be used to sort the minor keys. A string can be used to
     *          call and default supported sorting function.
     */
    plotviz.globalSortSVG = function (data, majorSortFunction, minorSortFunction) {
        var newData = JSON.parse(JSON.stringify(data));
        if ('string' === typeof minorSortFunction){
            if ('alphabetical' === minorSortFunction) {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return b.key < a.key;
                    });
                });
            } else if ('increasing' === minorSortFunction) {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return a.value.median - b.value.median;
                    });
                });
            } else {
                newData.data.forEach(function (boxList, bLIndex, bLArray) {
                    boxList.value.sort(function (a, b) {
                        return b.value.median - a.value.median;
                    });
                });
            }
        }

        if ('string' === typeof majorSortFunction) {
            if ('alphabetical' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    return b.key < a.key ? 1 : -1;
                });
            } else if ('increasing' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    var aTotal = 0,
                        bTotal = 0;

                    aTotal = a.value.filter(function (d) { return d.value ? true : false; })
                        .map(function (d) { return d.value.median; })
                        .reduce(function (b1, b2) { return b1 + b2; }, 0);

                    b.Total = b.value.filter(function (d) { return d.value ? true : false; })
                        .map(function (d) { return d.value.median; })
                        .reduce(function (b1, b2) { return b1 + b2; }, 0);

                    aTotal /= a.value.filter(function (d) { return d ? true : false; }).length;
                    bTotal /= a.value.filter(function (d) { return d ? true : false; }).length;
                    return aTotal - bTotal;
                });
            } else if ('decreasing' === majorSortFunction) {
                newData.data.sort(function (a, b) {
                    var aTotal = 0,
                        bTotal = 0;

                    a.value.forEach(function (box, index, array) {
                        aTotal += box.value.median;
                    });
                    b.value.forEach(function (box, index, array) {
                        bTotal += box.value.median;
                    });

                    aTotal /= a.value.length;
                    bTotal /= b.value.length;
                    return bTotal - aTotal;
                });
            }
        }

        if ('function' === typeof majorSortFunction) {
            newData.data.sort(majorSortFunction);
        }

        if ('function' === typeof minorSortFunction) {
            newData.data.forEach(function (boxList, bLIndex, bLArray) {
                boxList.value.sort(minorSortFunction);
            });
        }

        return newData;
    };

    return plotviz;
})(plotviz || {});
