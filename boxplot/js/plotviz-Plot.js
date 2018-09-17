/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    plotviz.Plot = function (div) {
        var _data = null;
        var _dataCache = {};
        var _name = null;
        var _geneName = null;

        var _viewerPanel = null;
        var _xAxisPanel = null;
        var _yAxisPanel = null;
        var _legend = null;
        var _filter = null;

        var _container = d3.select(div);
        var _root = null;
        var _svgRoot = null;
        var _tooltip = null;
        var _tooltipFunc = null;
        var _mouseclickFunc = null;
        var _mousemoveFunc = null;
        var _titlePanel = null;
        var _crosshair = null;
        var _config = {
            filter: 'off',
            orientation: 'horizontal',
            scale: 'linear',
            sorting: 'alphabetical',
            crosshair: 'on',
            outliers: 'on',
            medians: 'all',
            format: 'RSEM'
        };

        var _dataTransform = null;

        this.initialize = function(data) {
            data.metadata.options.forEach(function(option) {
                _config[option.value.key] = option.value.initial;
            },
            this);
        };

        var _plot = this;

    /**
     * Main controlling rendering function that sets up the data
     * and calls the remaining rendering functions.
     *
     * @param - Object - data - The data used for the rendering.
     * @param - Object - config - Lets you give state configuration options
     *                          for the plot being rendered.
     */
    this.render = function (data, config) {

        var that = this;
        config = config || this.config();

        var metadata = validateMetadata(data.metadata);

        if(_geneName !== metadata.geneName) {
            if(_geneName !== null) {
                // geneName has changed. Clear any filter.
                config.filter = 'off'
                config.resetFilter = true;
            }
        }

        _geneName = metadata.geneName;

        var x, y, spread,
            width = metadata.width,
            height = metadata.height,
            legendProportionLeft = metadata.position.legend.x || (6/7),
            legendProportionTop = metadata.position.legend.y || (1/4),
            legendProportionRight = metadata.position.legend.right || (6/7),
            legendLeft = legendProportionLeft * width,
            legendTop = legendProportionTop * height,
            legendRight = legendProportionRight * width,
            viewerProportionLeft = metadata.position.viewer.left || (1/7),
            viewerProportionTop = metadata.position.viewer.top || (1/4),
            viewerProportionRight = metadata.position.viewer.right || (6/7),
            viewerProportionBottom = metadata.position.viewer.bottom || (3/4),
            viewerLeft = viewerProportionLeft * width,
            viewerTop = viewerProportionTop * height,
            viewerRight = viewerProportionRight * width,
            viewerBottom = viewerProportionBottom * height;
            var majorKeys;

            _svgRoot.attr({
                width: width,
                height: height
            });


            _svgRoot.on('mousemove', function (d) {
                var newMouseX = d3.mouse(this)[0] - 2 - viewerLeft;
                var newMouseY= d3.mouse(this)[1] - 2 - viewerTop;
                var betterX = Math.min(Math.max(newMouseX, 0), viewerRight - viewerLeft);
                var betterY = Math.min(Math.max(newMouseY, 0), viewerBottom - viewerTop);
                _crosshair.move(betterX, betterY);
                            if (betterX < 0 || betterX > viewerRight - viewerLeft || betterY > viewerBottom - viewerTop || betterY < 0) {
                                _crosshair.hide();
                            } else {
                                //return that.config().crosshair === 'on' ? '' : 'none';
                                _crosshair.show();
                            }
                if ('off' === that.config().crosshair) {
                    _crosshair.hide();
                }
            });

            if ('box' === data.metadata.type) {
                majorKeys = data.data.map(function (boxGroup) {
                    return boxGroup.key;
                });
            }

            // TODO: Kane! This is a complete hack! Fix it! - Kane
            if ('line' === data.metadata.type) {
                majorKeys = data.data[0].value.points.map(function (lineGroup) {
                    return lineGroup.key;
                });
            }
            var maxMin;
            if ('box' === data.metadata.type) {
                maxMin = plotviz.maxMin(data);
            }
            if ('line' === data.metadata.type) {
                maxMin = plotviz.lineMaxMin(data.data);
            }
            _titlePanel.attr('transform', 'translate(' + viewerLeft + ',0)');

        spread = maxMin.maximum - maxMin.minimum;

        var titleAnchor = 'middle';
        if ('left' === metadata.position.title.align) {
            titleAnchor = 'left';
        }
        if ('right' === metadata.position.title.align) {
            titleAnchor = 'right';
        }
        _titlePanel.select('#titleLabel')
            .attr({
                x: (viewerRight - viewerLeft) * metadata.position.title.x,
                y: viewerTop * metadata.position.title.y
            })
            .style({
                'text-anchor': titleAnchor,
                font: data.metadata.titlefont
            })
            .text(data.metadata.title);

        _svgRoot.attr('height', data.metadata.height + 'px');

        y = d3.scale.linear()
            .domain([maxMin.minimum - spread / 10,
                    maxMin.maximum + spread / 10])
            .range([viewerBottom - viewerTop, 0])
            .nice();


        x = d3.scale.ordinal()
            .domain(majorKeys)
            .rangeBands([0, viewerRight - viewerLeft], metadata.boxGroupSpacing);

        var leftPanelData = {
            axis: y,
            x: viewerLeft,
            y: viewerTop,
            orientation: 'left',
            label: data.metadata.ylabel,
            labelX: viewerLeft * metadata.position.yAxisLabel.x,
            labelY: (viewerBottom - viewerTop) *  metadata.position.yAxisLabel.y,
            rotation: metadata.position.yAxisLabel.rotation,
            align: metadata.position.yAxisLabel.align
        };

        _yAxisPanel.render(leftPanelData);

        var bottomPanelData = {
            axis: x,
            x: viewerLeft,
            y: viewerBottom,
            orientation: 'bottom',
            //label: data.metadata.xlabel
            label: data.metadata.xlabel,
            labelY: (data.metadata.height - viewerBottom) * metadata.position.xAxisLabel.y,
            labelX: (viewerRight - viewerLeft) * metadata.position.xAxisLabel.x,
            tickRotation: metadata.position.xAxisLabel.tickRotation,
            tickTranslate: metadata.position.xAxisLabel.tickTranslate,
            tickAlign: metadata.position.xAxisLabel.tickAlign
        };

        _xAxisPanel.render(bottomPanelData);


        var copyingData = JSON.parse(JSON.stringify(data));
        copyingData.metadata = metadata;

        if ('box' === data.metadata.type) {
            _viewerPanel.render(transformPseudo(copyingData, x, y), x, y, config);
        }
        if ('line' === data.metadata.type) {
            _viewerPanel.render(data.data, x, y, {x:viewerLeft, y:viewerTop, width:viewerRight - viewerLeft, height:viewerBottom - viewerTop});
        }

        _legend.render(data.legend, x, y, {x: legendLeft, y: legendTop});

        _filter.render(data, x, y, config);

        if(!('data' in _dataCache)) {
            _dataCache.data = data;
        }

    };

        this.option = function (key, value) {
            if (value) {
                if (typeof _config[key] !== 'undefined') {
                    _config[key] = value;
                    // TODO: This is a hack before figuring out a better way
                    // to sort correctly.
                    if ('sorting' === key && 'box' === _data.metadata.type) {
                        _config.minorSort = _config.sorting;
                        _config.majorSort = _config.sorting;
                    }
                } else {
                    console.log(key + ' is not an option or setting.');
                }
            }
            else {
                return _config[key];
            }
            return this;
        };



        /**
         * Updates or returns the data the plot is visualizing.
         *
         * @param - JSON - data - The plot data to for later rendering.
         *
         * @return - JSON - data - If no parameter is supplied then return data.
         */
        this.data = function (data) {
            if (data) {
                _data = JSON.parse(JSON.stringify(data));
            } else {
                return JSON.parse(JSON.stringify(_data));
            }
        };

        this.dataCache = function(data) {
            if (data) {
              _dataCache.data = JSON.parse(JSON.stringify(data));
            } else {
              if(_dataCache.data === undefined) {
                throw 'Empty dataCache error.';
              } else {
                data = JSON.parse(JSON.stringify(_dataCache.data));
                _plot.data(data);
                _dataCache = {};
                return data;
              }
            }
        }

        this.config = function (config) {
            if (config) {
                _config = JSON.parse(JSON.stringify(config));
            } else {
                return JSON.parse(JSON.stringify(_config));
            }
        };


        this.create = function (data, name) {
            var that = this;
            var metadata = validateMetadata(data.metadata);

            _name = name;

            _root = _container.append('div')
                .attr({
                    id: 'plotviz-rootDiv' + (_name ? '-' + name : ''),
                    className: 'plotviz-rootClass-horizontal'
                })
                .style({
                    'position': 'relative',
                    'height': metadata.height + 'px',
                    'width': metadata.width + 'px'
                });


            this.initialize(data);

            addControls(_root.node(), data, this);

            _svgRoot = _root.append('svg').attr({
                id: 'svg-plotviz-root',
                width: '100%',
                height: '100%',
                'xmlns:xlink': 'http://www.w3.org/1999/xlink'
            });

            _tooltip = _root.append('div')
                .attr('class', 'tooltip')
                .style('position', 'absolute');

            _titlePanel = _svgRoot.append('g').attr({
                    id: 'svg-plotviz-titlePanel'
                });
            _titlePanel.append('text').attr('id', 'titleLabel')
                .style('font', data.metadata.options.titlefont || '48px');


            var viewerLeft = metadata.position.viewer.left * metadata.width;
            var viewerTop = metadata.position.viewer.top * metadata.height;
            var viewerRight = metadata.position.viewer.right * metadata.width;
            var viewerBottom = metadata.position.viewer.bottom * metadata.height;

            var _viewerPanelData;

            if ('box' === metadata.type) {
                _viewerPanelData = {
                    metadata: {
                        width: viewerRight - viewerLeft,
                        height: viewerBottom - viewerTop,
                        x: viewerLeft,
                        y: viewerTop,
                        outlierRadius: metadata.outlierRadius,
                        outlierJitter: metadata.outlierJitter
                    },
                    data: data.data
                };

                _viewerPanel = new plotviz.BoxWhiskerViewer(_svgRoot, 'svg-plotviz-mainPanel', _viewerPanelData);
                _viewerPanel.tooltipPanel(_tooltip);
                if (_tooltipFunc) {_viewerPanel.tooltipFunction(_tooltipFunc);}
                _config.minorSort = _config.sorting;
                _config.majorSort = _config.sorting;
            }


            if ('line' === metadata.type) {
                _viewerPanelData = {
                    metadata: {
                        width: viewerRight - viewerLeft,
                        height: viewerBottom - viewerTop,
                        x: viewerLeft,
                        y: viewerTop
                    },
                    data: data.data
                };

                _viewerPanel = new plotviz.LineViewer(_svgRoot, 'svg-plotviz-mainPanel', _viewerPanelData);
                _viewerPanel.tooltipPanel(_tooltip);
                if (_tooltipFunc) {_viewerPanel.tooltipFunction(_tooltipFunc);}
            }

            if (_mouseclickFunc) {_viewerPanel.mouseclick(_mouseclickFunc);}

            _dataTransform = _viewerPanel.dataTransform;
            this.sort = _viewerPanel.sort;

            var crosshairMetadata = {
                width: viewerRight - viewerLeft,
                height: viewerBottom - viewerTop,
                x: 0,
                y: 0
                //x: viewerLeft,
                //y: viewerTop
            };

            var mainPanel = _svgRoot.select('#svg-plotviz-mainPanel');
            _crosshair = new plotviz.Crosshair(mainPanel, 'svg-plotviz-crosshair', crosshairMetadata);



            var leftPanelInput = {
                x: viewerLeft,
                y: viewerTop,
                labelX: metadata.position.yAxisLabel.x,
                labelY: metadata.position.yAxisLabel.y,
                rotation: metadata.position.yAxisLabel.rotation,
                align: metadata.position.yAxisLabel.align,
            };

            _yAxisPanel = new plotviz.AxisPanel(_svgRoot, 'svg-plotviz-leftPanel', leftPanelInput);

            var bottomPanelInput = {
                x: viewerLeft,
                y: viewerBottom,
            };

            _xAxisPanel = new plotviz.AxisPanel(_svgRoot, 'svg-plotviz-bottomPanel', bottomPanelInput);
            _xAxisPanel.tooltipPanel(_tooltip);
            if (_tooltipFunc) {_xAxisPanel.tooltipFunction(_tooltipFunc);}
            if (_mouseclickFunc) {_xAxisPanel.mouseclick(_mouseclickFunc);}

            var legendLeft = metadata.position.legend.x * metadata.width;
            var legendTop = metadata.position.legend.y * metadata.height;
            var legendRight = metadata.position.legend.right * metadata.width;

            var legendMetadata = {
                x: legendLeft,
                y: legendTop,
                align: metadata.position.legend.align
            };
            _legend = new plotviz.Legend(_svgRoot, 'legendPanel', legendMetadata);
            if (_mouseclickFunc) {_legend.mouseclick(_mouseclickFunc);}

            _filter = new plotviz.Filter(_svgRoot, 'filterPanel', legendMetadata, this);
            if (_mouseclickFunc) {_filter.mouseclick(_mouseclickFunc);}

            if (data.metadata.init) {
                data.metadata.init(this, data, this.config());
            }

            return _root;

        };


        this.tooltip = function (func) {
            if (func) {
                _tooltipFunc = func;
                if (_viewerPanel) {_viewerPanel.tooltipFunction(func);}
                if (_xAxisPanel) {_xAxisPanel.tooltipFunction(func);}
                if (_yAxisPanel) {_yAxisPanel.tooltipFunction(func);}

                if (_viewerPanel) {_viewerPanel.tooltipPanel(_tooltip);}
                if (_xAxisPanel) {_xAxisPanel.tooltipPanel(_tooltip);}
                if (_yAxisPanel) {_yAxisPanel.tooltipPanel(_tooltip);}
            } else {
                return _tooltipFunc;
            }
        };


        this.mouseclick = function (func) {
            if (func) {
                _mouseclickFunc = func;
                if (_legend) {_legend.mouseclick(func);}
                if (_xAxisPanel) {_xAxisPanel.mouseclick(func);}
            } else {
                return _mouseclickFunc;
            }
        };

        this.mousemove = function (func) {
            if (func) {
                _mousemoveFunc = func;
                if (_legend) {_legend.mousemove(func);}
            } else {
                return _mousemoveFunc;
            }
        };


        /**
         *  Validates the metadata field for the Plot object's input. If
         *  a field doesn't exist then it is given a default value. Once
         *  the input is validated the validated version is returned. The
         *  original input is untouched.
         *
         *  TODO: Echo out proper logging and warning messages based on the
         *          input fields that don't exist.
         *
         *  @param - JSON - input - The metadata from the plot input.
         *
         *  @return - JSON - The validated input with all fields filled in
         *                  either with the input values or a proper default.
         *
         *      The JSON takes this form
         *
         *      input:
         *
         */
        function validateMetadata (input) {
            var data = input || {};
            data = JSON.parse(JSON.stringify(data));
            var metadata = data || {};
            metadata.height = metadata.height || 400;
            metadata.width = metadata.width || 1000;
            metadata.type = metadata.type || 'box';
            metadata.title = metadata.title || '';
            metadata.titlefont = metadata.titlefont || '48px';
            metadata.boxGroupSpacing = metadata.boxGroupSpacing || 0.1;

            metadata.options = metadata.options || {};
            metadata.position = metadata.position || {};

            metadata.position.viewer = metadata.position.viewer || {};
            var viewer = metadata.position.viewer;
            viewer.left = viewer.left || 1/7;
            viewer.top = viewer.top || 1/4;
            viewer.right = viewer.right || 6/7;
            viewer.bottom = viewer.bottom || 3/4;
            metadata.position.viewer = viewer;

            metadata.position.legend = metadata.position.legend || {};
            var legend = metadata.position.legend;
            legend.x = legend.x || 6/7;
            legend.y = legend.y || 1/4;
            legend.align = legend.align || 'left';
            metadata.position.legend = legend;

            metadata.position.title = metadata.position.title || {};
            var title = metadata.position.title;
            title.x = title.x || 0.5;
            title.y = title.y || 0.5;
            title.align = title.align || 'center';
            metadata.position.title = title;

            metadata.position.yAxisLabel = metadata.position.yAxisLabel || {};
            var yAxisLabel = metadata.position.yAxisLabel;
            yAxisLabel.x = yAxisLabel.x || 0.5;
            yAxisLabel.y = yAxisLabel.y || 0.5;
            yAxisLabel.rotation = yAxisLabel.rotation === 0 ? 0 : yAxisLabel.rotation || 90;
            yAxisLabel.align = yAxisLabel.align || 'center';
            metadata.position.yAxisLabel = yAxisLabel;

            metadata.position.xAxisLabel = metadata.position.xAxisLabel || {};
            var xAxisLabel = metadata.position.xAxisLabel;
            xAxisLabel.x = xAxisLabel.x || 0.5;
            xAxisLabel.y = xAxisLabel.y || 0.5;
            xAxisLabel.rotation = xAxisLabel.rotation || 0;
            xAxisLabel.tickRotation = xAxisLabel.tickRotation === 0 ? 0 : xAxisLabel.tickRotation || 45;
            xAxisLabel.tickTranslate = xAxisLabel.tickTranslate === 0 ? 0 : xAxisLabel.tickTranslate || 10;
            xAxisLabel.align = xAxisLabel.align || 'center';
            xAxisLabel.tickAlign = xAxisLabel.tickAlign || 'center';
            metadata.position.xAxisLabel = xAxisLabel;

            return metadata;
        }

        function validateLegendData (input) {
            var data = input || {};
            data = JSON.parse(JSON.stringify(data));
            var legendData = data || {};

            return legendData;
        }



        /**
         * Creates the controls for the plot on screen.
         *
         * @param - HTMLElement - div - Div to append the controls to.
         * @param - JSON - data - Button box data to generate the controls.
         */
        function addControls (div, data, that) {

            var control = d3.select(div);

            data.metadata.position = data.metadata.position || {};
            data.metadata.position.control = data.metadata.position.control || {};

            var width = data.metadata.width;
            var height = data.metadata.height;

            var controlProportionLeft = data.metadata.position.control.left || 1/8;
            var controlProportionTop = data.metadata.position.control.top || 7/8;
            var controlLeft = controlProportionLeft * width;
            var controlTop = controlProportionTop * height;

            var controlData = data.metadata.controls.map(function (d) {
                var controlGenerator = {
                    'filtering': plotviz.toolbox.generateFilteringControl,
                    'sorting': plotviz.toolbox.generateSortingControl,
                    'scaling': plotviz.toolbox.generateScalingControl,
                    'crosshair': plotviz.toolbox.generateCrosshairControl,
                    'outliers': plotviz.toolbox.generateOutlierControl,
                    'medians': plotviz.toolbox.generateMedianOnlyControl
                };
                return typeof d === 'string' ? (d in controlGenerator ? controlGenerator[d]() : undefined) : d;
            })
            .filter(function (d) { return d; });

            var buttonBox = control.append('div')
                .attr('id', 'plotviz-controlDiv')
                .attr('class', 'plotviz-controlClass')
                .style('position', 'absolute')
                .style('left', controlLeft + 'px')
                .style('top', controlTop + 'px')
              .append('div')
                .attr('class', 'plotviz-floatWrap')
              .selectAll('div')
                .data(controlData)
              .enter().append('div')
                .attr('id', function (d) { return d.value.id; })
                .attr('class', 'button-box button-box-first button-box-last');

            buttonBox.append('div')
                .attr('class', 'button-box-title')
                .text(function (d) { return d.value.text; });

            buttonBox.append('div')
                .attr('class', 'button-options')
              .selectAll('div')
                .data(function (d) { return d.value.buttons; })
              .enter().append('div')
                .attr('class', function (d) { return d.value.className + ' ' + (d.value.active ? 'btn-active' : 'btn-inactive'); })
                .text(function (d) { return d.value.text; })
                .on('click', function (d) {
                    if (d.value.pre) {
                        d.value.pre(that, _data, _config);
                    }

                    if (d.value.post) {
                        d.value.post(that, _dataTransform(_data, _config), _config);
                    }
                    deactivateChildButtons(this.parentNode);
                    activateSelf(this);
                });

                function activateSelf (button) {
                    d3.select(button)
                        .each(function (d) {
                            this.className = this.className.replace
                                (/(?:^|\s)btn-inactive(?!\S)/g, ' btn-active');
                        });
                }

                function deactivateChildButtons (button) {
                    d3.select(button).selectAll('div')
                        .each(function (d) {
                            this.className = this.className.replace
                                (/(?:^|\s)btn-active(?!\S)/g, ' btn-inactive');
                        });
                }

        }


    };

    function transformPseudo (data, x, y) {
        var min = Math.min.apply(null, y.domain());
        var scalingFactor = 32;
        var quad = Math.abs(y.domain()[0] - y.domain()[1]) / scalingFactor;
        var viewerLeft = data.metadata.position.viewer.left * data.metadata.width;
        var viewerRight = data.metadata.position.viewer.right * data.metadata.width;
        var viewerTop = data.metadata.position.viewer.top * data.metadata.height;
        var viewerBottom = data.metadata.position.viewer.bottom * data.metadata.height;

        var emptyBox = {
            key: 'normal',
            value: {
                high_whisker: min + ((scalingFactor / 2) - 1) * quad,
                q3: min + ((scalingFactor / 2) + 1) * quad,
                median: min + ((scalingFactor / 2) - 1) * quad,
                q1: min + ((scalingFactor / 2) - 1) * quad,
                low_whisker: min + ((scalingFactor / 2) - 1) * quad,
                outliers: [],
                color: 'grey',
                extra: {
                    opacity: 0.1
                },
                noData: true
            }
        };

        function addTooltipToEmptyBox (input) {
            var copyBox = JSON.parse(JSON.stringify(emptyBox));
            if (input && input.value && input.value.extra) {
                copyBox.value.extra.toolTip = input.value.extra.toolTip;
            }
            return copyBox;
        }

        return {
            metadata: {
                x: viewerLeft,
                y: viewerTop,
                width: viewerRight - viewerLeft,
                height: viewerBottom - viewerTop,
                outlierStroke: data.metadata.outlierStroke,
                whiskerStroke: data.metadata.whiskerStroke,
                outlierJitter: data.metadata.outlierJitter,
                outlierRadius: data.metadata.outlierRadius
            },
            data: data.data.map(function (boxGroup) {
                return {
                    key: boxGroup.key,
                    axisLine: boxGroup.axisLine,
                    value: boxGroup.value.map(function (box, i) {
                        return box.key ? box : addTooltipToEmptyBox(box);
                    })
                };
            })
        };
    }



    return plotviz;
}) (plotviz || {});
