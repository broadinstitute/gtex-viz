/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    
    function generateFilteringControl () {
        return {
            key: 'filter-control',
            value: {
                id: 'filter-buttons',
                text: 'Filter',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'On',
                        className: 'button btn-left',
                        pre: function(plot, data, config) {
                            plot.option('filter', 'on')
                        },
                        post: function(plot, data, config) {
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Off',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('filter', 'off');
                        },
                        post: function(plot, data, config) {
                        }
                    }
                }]
            }
        };
    }
    function generateSortingControl () {
        return {
            key: 'sort-control',
            value: {
                id: 'sort-buttons',
                text: 'Sort',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'ABC',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'alphabetical');
                        },
                        post: function (plot, data, config) {
                            plot.render(plot.sort(data, config), config);
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: '\u25B2',
                        className: 'button',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'increasing');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        }
                    }
                },
                {
                    key: 'button3',
                    value: {
                        text: '\u25BC',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('sorting', 'decreasing');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        }
                    }
                }]
            }
        };
    }

    function generateScalingControl () {
        return {
            key: 'scale-control',
            value: {
                id: 'scale-buttons',
                text: 'Scale',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'Log',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('scale', 'log');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                            plot.option('sorting'),
                                            plot.option('sorting')),
                                        plot.config());
                        }
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Linear',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('scale', 'linear');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                            plot.option('sorting'),
                                            plot.option('sorting')),
                                        plot.config());
                        },
                        active: true
                    }
                }]
            }
        };
    }

    function generateCrosshairControl () {
        return {
            key: 'crosshair-control',
            value: {
                id: 'crosshair-buttons',
                text: 'Crosshair',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'On',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('crosshair', 'on');
                        },
                        post: function (plot, data, config) {
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Off',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('crosshair', 'off');
                        },
                        post: function (plot, data, config) {
                        }
                    }
                }]
            }
        };
    }

    function generateOutlierControl () {
        return {
            key: 'outliers-control',
            value: {
                id: 'outliers-buttons',
                text: 'Outliers',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'On',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('outliers', 'on');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Off',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('outliers', 'off');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        }
                    }
                }]
            }
        };
    }

    function generateMedianOnlyControl () {
        return {
            key: 'medians-control',
            value: {
                id: 'medians-buttons',
                text: 'Medians',
                buttons: [{
                    key: 'button1',
                    value: {
                        text: 'All',
                        className: 'button btn-left',
                        pre: function (plot, data, config) {
                            plot.option('medians', 'all');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        },
                        active: true
                    }
                },
                {
                    key: 'button2',
                    value: {
                        text: 'Only',
                        className: 'button btn-right',
                        pre: function (plot, data, config) {
                            plot.option('medians', 'only');
                        },
                        post: function (plot, data, config) {
                            plot.render(plotviz.globalSortSVG(data,
                                                plot.option('sorting'),
                                                plot.option('sorting')),
                                        plot.config());
                        }
                    }
                }]
            }
        };
    }

    plotviz.toolbox = {
        generateFilteringControl: generateFilteringControl,
        generateSortingControl: generateSortingControl,
        generateScalingControl: generateScalingControl,
        generateCrosshairControl: generateCrosshairControl,
        generateOutlierControl: generateOutlierControl,
        generateMedianOnlyControl: generateMedianOnlyControl
    };

    return plotviz;
}) (plotviz || {});
