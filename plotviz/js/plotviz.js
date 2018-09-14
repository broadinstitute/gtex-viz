/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    "use strict";

    plotviz.options = {
        orientation: 'horizontal',
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "12px",
        scale: 'linear',
        sorting: 'alphabetical',
        selection: 'full',
        circles: 'on',
        lines: 'on',
        type: 'expression',
        subtype: 'all',
        isoformFocus: undefined,
        svg: false,
        filter_category: undefined,
        subisoexpression: undefined,
        debug: false
    };

    plotviz.rawPlotData = undefined;

    plotviz.root = undefined;
    plotviz.rootDivName = undefined;

    plotviz.tooltip = null;

    plotviz.controls = undefined;

    plotviz.userMainPanelMouseMoveSVG = null;
    plotviz.userMainPanelOutlierMouseMoveSVG = null;
    plotviz.userRightPanelMouseMoveSVG = null;
    plotviz.userRightPanelMouseClickSVG = null;
    plotviz.userBottomPanelMouseMoveSVG = null;
    plotviz.userBottomPanelMouseClickSVG = null;
    plotviz.userMainPanelMouseMove = null;
    plotviz.userMainPanelOutlierMouseMove = null;
    plotviz.userRightPanelMouseMove = null;
    plotviz.userRightPanelMouseClick = null;
    plotviz.userBottomPanelMouseMove = null;
    plotviz.userBottomPanelMouseClick = null;

    plotviz.majorSort = null;
    plotviz.minorSort = null;


    plotviz.setMajorSort = function (func) {
        plotviz.majorSort = func;
    };


    plotviz.setMinorSort = function (func) {
        plotviz.minorSort = func;
    };


    /** Activates the main panel's onmousemove event with result. */
    plotviz.setMainPanelMouseMoveSVG = function (func) {
        plotviz.userMainPanelMouseMoveSVG = func;
        plotviz.userMainPanelMouseMove = func;
    };

    plotviz.setMainPanelMouseMove = plotviz.setMainPanelMouseMoveSVG;

    /** Activates the right panel's onmousemove event with result. */
    plotviz.setRightPanelMouseMoveSVG = function (func) {
        plotviz.userRightPanelMouseMoveSVG = func;
    };

    plotviz.setRightPanelMouseMove = plotviz.setRightPanelMouseMoveSVG;

    /** Activates the right panel's onclick event with result. */
    plotviz.setRightPanelMouseClickSVG = function (func) {
        plotviz.userRightPanelMouseClickSVG = func;
    };

    plotviz.setRightPanelMouseClick = plotviz.setRightPanelMouseClickSVG;

    /** Activates the bottom panel's onmousemove event with result. */
    plotviz.setBottomPanelMouseMoveSVG = function (func) {
        plotviz.userBottomPanelMouseMoveSVG = func;
    };

    plotviz.setBottomPanelMouseMove = plotviz.setBottomPanelMouseMoveSVG;

    /** Activates the bottom panel's onclick event with result. */
    plotviz.setBottomPanelMouseClickSVG = function (func) {
        plotviz.userBottomPanelMouseClickSVG = func;
    };

    plotviz.setBottomPanelMouseClick = plotviz.setBottomPanelMouseClickSVG;

    /** Activates the outlier's onmousemove event with result. */
    plotviz.setMainPanelOutlierMouseMoveSVG = function (func) {
        plotviz.userMainPanelOutlierMouseMove = func;
    };

    plotviz.setMainPanelOutlierMouseMove = plotviz.setMainPanelOutlierMouseMoveSVG;

    /** Tests if visualization works correctly. */
    plotviz.test = function () {
        //var data = plotviz.testInput2;
        var data = plotviz.normalInput;
        plotviz.loadData(data);
        plotviz.setMainPanelMouseMove(function (x, y, d) {
            console.log('Mousing over main panel ' + x + ', ' + JSON.stringify(d) + ', ' + y);
            return d.color + '</br>' + d.extra.num_ticks;
        });
        plotviz.setMainPanelOutlierMouseMove(function (x, y, d) {
            console.log('Mousing over outlier ' + x + ', ' + JSON.stringify(d) + ', ' + y);
            return d.outlier + '</br>' + d.extra;
        });
        plotviz.setRightPanelMouseMove(function (x, y, d) {
            console.log('Mousing over right panel ' + x + ', ' + JSON.stringify(d) + ', ' + y);
        });
        plotviz.setRightPanelMouseClick(function (x, y, d) {
            console.log(d.key + " " + d.value + " Right Panel Click");
        });
        plotviz.setBottomPanelMouseMove(function (x, y, d) {
            console.log('Mousing over bottom panel ' + x + ', ' + JSON.stringify(d) + ', ' + y);
        });
        plotviz.setBottomPanelMouseClick(function (x, y, d) {
            console.log(JSON.stringify(d) + " Bottom Panel Click");
        });
        plotviz.setMajorSort(function (a, b) {
            var oddVal = a.value.filter(function (x) { return 'odd' === x.key; })[0].value.median;
            var oddVal2 = b.value.filter(function (x) { return 'odd' === x.key; })[0].value.median;
            return oddVal < oddVal2;
        });
        plotviz.startSVG(plotviz.rawPlotData);
    };


    /**
     * Creates the root node and panels. 
     *
     * @returns - HTMLElement - Returns the root node to be appended to a
     *                          container div.
     */
    plotviz.createSVGRoot = function () {
        var root, buttonsDiv, svgRoot, mainPanel, rightPanel,
            data = plotviz.rawPlotData;

        root = document.createElement('div');
        root.id = "plotviz-rootDiv";
        root.className = "plotviz-rootClass-horizontal";
        root.style.position = 'relative';
        plotviz.rootName = "plotviz-rootDiv";

        /* The left and right panels always maintain the same sizes no matter
            the window size. */

        plotviz.root = root;
        buttonsDiv = plotviz.createControlsSVG(data);

        root.appendChild(buttonsDiv);

        svgRoot = d3.select(root).append('svg').attr({
            id: 'svg-plotviz-root',
            width: '100%',
            height: '100%'
        });

        d3.select(root).append('div')
            .attr('class', 'tooltip')
            .style('position', 'absolute');

        svgRoot.append('g').attr({
            id: 'svg-plotviz-titlePanel'
        })
          .append('text').attr('id', 'titleLabel');

        mainPanel = svgRoot.append('g').attr({
            id: 'svg-plotviz-mainPanel'
        });

        mainPanel.append('rect').attr({
            x: 0,
            y: 0,
            width: data.metadata.width,
            height: data.metadata.height,
            'class': 'mainPanelBorder'
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 2
        });

        mainPanel.append('g').attr('class', 'rects');
        mainPanel.append('g').attr('class', 'under-lines');
        mainPanel.append('g').attr('class', 'over-lines');
        mainPanel.append('g').attr('class', 'significance-line');
        svgRoot.append('g').attr('class', 'crosshair')
            //.attr('transform', 'translate(200, 200)')
          .selectAll('line')
            .data([
                {
                    x1: 0,
                    y1: 0,
                    x2: plotviz.rawPlotData.metadata.width,
                    y2: 0
                },
                {
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2: plotviz.rawPlotData.metadata.height
                }
            ])
          .enter().append('line')
            .attr({
                x1: function (d) { return d.x1; },
                y1: function (d) { return d.y1; },
                x2: function (d) { return d.x2; },
                y2: function (d) { return d.y2; }
            })
            .style({
                stroke: 'red',
                'stroke-width': 1,
            });
       // mainPanel.selectAll('rect')
            svgRoot.on('mousemove', function (d) {
                //console.log('crosshairs ' + d3.event.pageX + ' ' + d3.event.pageY);
                var newMouseX = d3.mouse(this)[0] - 2;
                var newMouseY= d3.mouse(this)[1] - 2;
                data.metadata.position = data.metadata.position || {};
                data.metadata.position.viewer = data.metadata.position.position || {};
                var viewerProportionLeft = data.metadata.position.viewer.left || 1/7;
                var viewerProportionTop = data.metadata.position.viewer.top || 1/4;
                var viewerProportionRight = data.metadata.position.viewer.right || 6/7;
                var viewerProportionBottom = data.metadata.position.viewer.bottom || 3/4;
                var viewerLeft = viewerProportionLeft * data.metadata.width;
                var viewerTop = viewerProportionTop * data.metadata.height;
                var viewerRight = viewerProportionRight * data.metadata.width;
                var viewerBottom = viewerProportionBottom * data.metadata.height;

                d3.select('g.crosshair')
                  .selectAll('line')
                    .data([
                        {
                            // TODO Error checking on the input
                            x1: viewerLeft,
                            y1: Math.min(Math.max(newMouseY, viewerTop), viewerBottom),
                            x2: viewerRight,
                            y2: Math.min(Math.max(newMouseY, viewerTop), viewerBottom)
                        },
                        {
                            x1: Math.min(Math.max(newMouseX, viewerLeft), viewerRight),
                            y1: viewerTop,
                            x2: Math.min(Math.max(newMouseX, viewerLeft), viewerRight),
                            y2: viewerBottom
                        }
                    ])
                .attr({
                    x1: function (d) { return d.x1; },
                    y1: function (d) { return d.y1; },
                    x2: function (d) { return d.x2; },
                    y2: function (d) { return d.y2; }
                })
                .style({
                    stroke: 'red',
                    'stroke-width': 1
                });
            });

        svgRoot.append('g').attr({
            id: 'svg-plotviz-bottomPanel',
            'class': 'x axis'
        })
          .append('text').attr('id', 'xlabel');

        svgRoot.append('g').attr({
            id: 'svg-plotviz-leftPanel',
            'class': 'y axis'
        })
          .append('text').attr('id', 'ylabel');

        rightPanel = svgRoot.append('g').attr('id', 'svg-plotviz-rightPanel');
        rightPanel.append('g')
            .attr('id', 'legend-text');
        rightPanel.append('g')
            .attr('id', 'legend-rects');
        rightPanel.append('rect').attr({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            'class': 'legendBorder'
        })
        .style({
            stroke: 'black',
            fill: 'none',
            'stroke-width': 1
        });

        var oldresize = function () {};

        if (window.onresize) {
            oldresize = window.onresize.bind(window);
        }

        function newresize (event) {
            // TODO: Figure out what the behavior should be
            plotviz.renderSVG(plotviz.rawPlotData);
        }

        window.onresize = function (event) {
            oldresize.apply(window, event);
            newresize.apply(window, event);
        };

        return root;
    };

    plotviz.createRoot = plotviz.createSVGRoot;


    /**
     * Loads the JSON into the visualization.
     *
     * @param - JSON - data - A specific format for how the visualization
     *                          metadata and active data should be supplied.
     */
    plotviz.loadData = function (data) {
        plotviz.rawPlotData = JSON.parse(JSON.stringify(data));
    };


    /**
     * Creates the optional controls at the top of the visualization.
     *
     * @param - JSON - data - The data being visualized. May be used to
     *                      determine how a control behaves. To be
     *                      soon possibly removed.
     *
     * @returns - HTMLElement - Returns the div containing all the controls.
     */
    plotviz.createControlsSVG = function (data) {
        var buttonsDiv,
            floatWrap,
            componentsToInclude,
            defaultButtons;

        buttonsDiv = document.createElement('div');
        floatWrap = document.createElement('div');

        buttonsDiv.id = "plotviz-controlDiv";
        buttonsDiv.className = "plotviz-controlClass";
        floatWrap.className = "plotviz-floatWrap";

        buttonsDiv.style.position = 'absolute';

        data.metadata.position = data.metadata.position || {};
        data.metadata.position.control = data.metadata.position.control || {};

        var width = data.metadata.width;
        var height = data.metadata.height;

        var controlProportionLeft = data.metadata.position.control.left || 1/8;
        var controlProportionTop = data.metadata.position.control.top || 7/8;
        var controlLeft = controlProportionLeft * width;
        var controlTop = controlProportionTop * height;

        buttonsDiv.style.left = controlLeft + 'px';
        buttonsDiv.style.top = controlTop + 'px';

        buttonsDiv.appendChild(floatWrap);
        plotviz.options.type = 'expression';

        defaultButtons = [
            'orientation',
            'scaling',
            'sorting'
        ];

        componentsToInclude = (plotviz.controls ? plotviz.controls : defaultButtons);

        // Includes only enabled elements from the desired list of components to include
        componentsToInclude.forEach(
            function (element, index, array) {
                var option;
                if(plotviz.interfaceComponentsSVG[element].enabled) {
                    option = plotviz.options[plotviz.interfaceComponentsSVG[element].option];
                    floatWrap.appendChild(plotviz.interfaceComponentsSVG[element].func(plotviz.options));
                }
            }
        );

        return buttonsDiv;
    };

    /** Starts the instantiated visualization.  */
    plotviz.startSVG = function () {
        plotviz.renderSVG(plotviz.globalSortSVG(plotviz.rawPlotData,
                                            plotviz.options.sorting,
                                            plotviz.options.sorting));
    };

    plotviz.start = plotviz.startSVG;

    return plotviz;
}) (plotviz || {});
