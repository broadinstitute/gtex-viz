/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function EqtlPlot (div, url, config) {
        var controls;
        var _url = url;

        config = config || {};
        var _config = {
            'scale': 'linear',
            'points': 'on',
            'medians': 'all',
            'titleClass': 'title',
            'tickTranslate': 10,
            'tickRotation': 0,
            'tickAlign': 'middle',
            'leftAxisLabel': config.leftAxisLabel || 'Rank Normalized Gene Expression',
            'bottomAxisLabel': config.bottomAxisLabel || '',
            'outlierJitter': 0.25,
            'width': config.width || 850,
            'height': config.height || 800,
            'margin': config.margin || {
                                            'left': 20,
                                            'top': 20,
                                            'right': 20,
                                            'bottom': 20
                                        },
            'buttons': config.buttons || true
        };
        var _eqtl;
        var _buttonReference;
        var _buttonStates;
        var margin = _config.margin;


        var _tooltipFunction = null;
        var totalWidth = config.width || 1000;
        var totalHeight = config.height || 400;
        var width = totalWidth - margin.left - margin.right;
        var height = totalHeight - margin.top - margin.bottom;
        generateButtons(div, config);
        var _svgContainer = d3.select(div).append('div').attr('class', 'svg-div').append('svg').attr({
                width: totalWidth,
                height: totalHeight
            });
        var _svg = _svgContainer.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var layout = new plotviz.LayoutManager(_svg);
        layout.render(generateLayout(config), {width:width, height:height});

        var _viewer = new plotviz.BoxWhiskerViewer(layout.getPanel('boxViewer'));
        var _leftAxis = new plotviz.AxisPanel(layout.getPanel('leftAxis'));
        var _bottomAxis = new plotviz.AxisPanel(layout.getPanel('bottomAxis'), 'bottomAxis');
        var _title = new plotviz.TextPanel(layout.getPanel('title'));


        function query (snpId, geneId, tissue, geneSymbol, config) {
            var url = _url + '?variantId=' + snpId + '&gencodeId=' + geneId + '&tissueSiteDetailId=' + tissue;

            var oReq = new XMLHttpRequest();

            // TODO: Is this the conanical way? To check for truthyness
            //      instead of being undefined instead of an object?
            config = config || {};

            oReq.open('GET', url);

            oReq.onload = function (event) {
                var status = oReq.status;
                var response = oReq.responseText;

                _eqtl = dataToData(JSON.parse(response));
                _config.titleContent = config.titleContent || (tissue + ' eQTL ' + snpId + ' ' + geneId);
                _config.width = config.width || _config.width;
                _config.height = config.height || _config.height;
                _config.leftAxisWidth = config.leftAxisWidth || 0.1;
                render(_eqtl, config);
            };

            oReq.onerror = function (error) {

            };

            oReq.send();
        }

        function generateButtonBoxStates(config) {
            var points = 1,
                medians = 1;

            return [points,
                    medians];
        }

        function generateButtonStates(config) {
            return [
                _config.points === 'on' ? [1,0] : [0,1],
                _config.medians === 'all' ? [1,0] : [0,1]
            ];
        }

        function setButtonState (states, buttonBoxStates) {
            var counter = 0;
            var flattened = flatten(states);
            _buttonReference.selectAll('.button-options')
              .selectAll('div')
                .attr('class', function (d, index) {
                    return d.class + (flattened[counter++] ? ' btn-active' : ' btn-inactive');
                });

            counter = 0;
            flattened = flatten(buttonBoxStates);

            _buttonReference
                .style('display', function (d, index) {
                    return flattened[counter++] ? 'block' : 'none';
                });

            function flatten (arr) {
                if ('object' === typeof arr) {
                    return arr.map(flatten).reduce(function (a,b) {return a.concat(b);});
                } else {
                    return [arr];
                }
            }
        }

        function dataToData (raw) {
            var HET = 1;
            var HOMO_REF = 0;
            var HOMO_ALT = 2;
            var mappingKey = raw.genotypes;
            var mappingValues = raw.data;

            var het_outliers = mappingValues.filter(function (expressionValue, index) { return HET === mappingKey[index]; });
            var homo_ref_outliers = mappingValues.filter(function (expressionValue, index) { return HOMO_REF === mappingKey[index]; });
            var homo_alt_outliers = mappingValues.filter(function (expressionValue, index) { return HOMO_ALT === mappingKey[index]; });

            var boxplots = [];

            if (raw.boxplots.homoRef.numSamples > 5) {
                boxplots.push({
                    highWhisker: raw.boxplots.homoRef.upperLimit,
                    q3: raw.boxplots.homoRef.q3,
                    median: raw.boxplots.homoRef.median,
                    q1: raw.boxplots.homoRef.q1,
                    lowWhisker: raw.boxplots.homoRef.lowerLimit,
                    outliers: homo_ref_outliers,
                    color: 'rgb(142, 149, 222)',
                    extra: {
                        groupName: 'Homo Ref <br/> N = ' + raw.boxplots.homoRef.numSamples
                    }
                })
            } else {
                boxplots.push({
                    highWhisker: false,
                    q3: false,
                    median: false,
                    q1: false,
                    lowWhisker: false,
                    outliers: raw.boxplots.homoRef.outliers,
                    color: 'rgb(142, 149, 222)',
                    noData: true,
                    extra: {
                        groupName: 'Homo Ref <br/> N = ' + raw.boxplots.homoRef.numSamples
                    }
                });
            }

            if (raw.boxplots.het.numSamples > 5) {
                boxplots.push({
                    highWhisker: raw.boxplots.het.upperLimit,
                    q3: raw.boxplots.het.q3,
                    median: raw.boxplots.het.median,
                    q1: raw.boxplots.het.q1,
                    lowWhisker: raw.boxplots.het.lowerLimit,
                    outliers: het_outliers,
                    color: 'rgb(142, 149, 222)',
                    extra: {
                        groupName: 'Het <br/> N = ' + raw.boxplots.het.numSamples
                    }
                });
            } else {
                boxplots.push({
                    highWhisker: false,
                    q3: false,
                    median: false,
                    q1: false,
                    lowWhisker: false,
                    outliers: raw.boxplots.het.outliers,
                    color: 'rgb(142, 149, 222)',
                    noData: true,
                    extra: {
                        groupName: 'Het <br/> N = ' + raw.boxplots.het.numSamples
                    }
                });
            }

            if (raw.boxplots.homoAlt.numSamples > 5) {
                boxplots.push({
                    highWhisker: raw.boxplots.homoAlt.upperLimit,
                    q3: raw.boxplots.homoAlt.q3,
                    median: raw.boxplots.homoAlt.median,
                    q1: raw.boxplots.homoAlt.q1,
                    lowWhisker: raw.boxplots.homoAlt.lowerLimit,
                    outliers: homo_alt_outliers,
                    color: 'rgb(142, 149, 222)',
                    extra: {
                        groupName: 'Homo Alt <br/> N = ' + raw.boxplots.homoAlt.numSamples
                    }
                });
            } else {
                boxplots.push({
                    highWhisker: false,
                    q3: false,
                    median: false,
                    q1: false,
                    lowWhisker: false,
                    outliers: raw.boxplots.homoAlt.outliers,
                    color: 'rgb(142, 149, 222)',
                    noData: true,
                    extra: {
                        groupName: 'Homo Alt <br/> N = ' + raw.boxplots.homoAlt.numSamples
                    }
                })

            }

            return boxplots;
        }

        function generateButtons (div, config) {
            controls = d3.select(div).append('div');
            controls.attr({
                    'id': 'control-div',
                    'class': 'control-class'
                })
                .style('display', config.buttons ? '' : 'none');

            var buttonData = [{
                    title: 'Data Points',
                    buttons: [{
                            text: 'On',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _config.points = 'on';
                                _config.outlierClass = 'outliers-on';
                                render(_eqtl, _config);
                            }
                        },
                        {
                            text: 'Off',
                            'class': 'button btn-right',
                            action: function () {
                                _config.points = 'off';
                                _config.outlierClass = 'outliers-off';
                                render(_eqtl, _config);
                            }
                        }]
                },
                {
                    title: 'Medians',
                    buttons: [{
                            text: 'All',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _config.medians = 'all';
                                _config.whiskerClass = 'whiskers-on';
                                _config.rectClass = 'rects-on';
                                render(_eqtl, _config);
                            }
                        },
                        {
                            text: 'Only',
                            'class': 'button btn-right',
                            action: function () {
                                _config.medians = 'only';
                                _config.whiskerClass = 'whiskers-off';
                                _config.rectClass = 'rects-off';
                                render(_eqtl, _config);
                            }
                        }]
                }];

            var boxes = controls.selectAll('div')
                .data(buttonData)
              .enter().append('div')
                .attr({
                        'class': 'button-box button-box-first button-box-last'
                    });

            boxes.append('div')
                .attr('class', 'button-box-title')
                .text(function (d) { return d.title; });

            boxes.append('div')
                .attr('class', 'button-options')
              .selectAll('div')
                .data(function (d) { return d.buttons; })
              .enter().append('div')
                .attr('class', function (d) { return d.class + ' ' + (d.active ? 'btn-active' : 'btn-inactive'); })
                .attr('data-toggle', function (d) { return d['data-toggle'] || null; })
                .attr('data-target', function (d) { return d['data-target'] || null; })
                .text(function (d) { return d.text; })
                .on('click', function (d) {
                    if (d.action) {
                        d.action();
                    }
                });

            _buttonReference = boxes;
        }

        function getPanelDimensions (key) {
            return layout.getPanelDimensions(key);
        }

        function callback (func) {
            _viewer.callback(func);
            _bottomAxis.callback(func);
        }

        function transformInput (data, f) {
            return data.map(function (box) {
                    return {
                        highWhisker: f(box.highWhisker),
                        q3: f(box.q3),
                        median: f(box.median),
                        q1: f(box.q1),
                        lowWhisker: f(box.lowWhisker),
                        outliers: box.outliers.map(f),
                        color: box.color,
                        extra: box.extra
                    };
                });
        }

        function container () { return _svgContainer; }

        function render (data, config) {

            function boxMax (box) {
                return box.highWhisker || box.q3 || box.median || box.q1 || box.lowWhisker;
            }

            function boxesMax (boxes) {
                return Math.max.apply(null, boxes.map(function (box) {return boxMax(box);}));
            }

            function boxMin (box) {
                return box.lowWhisker || box.q1 || box.median || box.q3 || box.highWhisker;
            }

            function boxesMin (boxes) {
                return Math.min.apply(null, boxes.map(function (box) {return boxMin(box);}));
            }

            Object.keys(config).forEach(function (key) {
                _config[key] = config[key];
            });

            var margin = config.margin || _config.margin;

            var totalWidth = config.width || _config.width;
            var totalHeight = config.height || _config.height;

            var width = totalWidth - margin.left - margin.right;
            var height = totalHeight - margin.top - margin.bottom;

            _svgContainer.attr({
                'width': totalWidth,
                'height': totalHeight
            });

            _svg.attr({
                'transform': 'translate(' + margin.left + ',' + margin.top + ')'
            });

            layout.render(generateLayout(config), {width:width - 2, height:height});

            var boxViewerDimensions = layout.getPanelDimensions('boxViewer');

            var boxConfig = {
                    width: boxViewerDimensions.width,
                    height: boxViewerDimensions.height,
                    outlierClass: config.outlierClass || 'outliers-on',
                    whiskerClass: config.whiskerClass || 'whiskers-on',
                    boxClass: config.boxClass || 'box',
                    rectClass: config.rectClass || 'rects-on',
                    outlierJitter: config.outlierJitter || 0
                };

            _viewer.render(data, boxConfig);

            var leftAxisData = {
                    orientation: 'left',
                    label: config.leftAxisLabel || 'TPM'
                },
                bottomAxisData = {
                    orientation: 'bottom',
                    label: config.bottomAxisLabel || ''
                };
            var leftAxisDimensions = layout.getPanelDimensions('leftAxis');
            var leftAxisConfig = {
                axisClass: 'left-axis',
                width: leftAxisDimensions.width,
                height: leftAxisDimensions.height,
                labelX: config.leftLabelX || 0.5,
                labelY: config.leftLabelY || 0.5,
                labelRotation: 90,
                axis: _viewer.generateYAxis(data, {height:boxConfig.height})
            };
            _leftAxis.render(leftAxisData, leftAxisConfig);

            var bottomAxisDimensions = layout.getPanelDimensions('bottomAxis');
            var bottomAxisConfig = {
                axisClass: 'bottom-axis',
                width: bottomAxisDimensions.width,
                height: bottomAxisDimensions.height,
                axisX: 0,
                axisY: 0,
                tickAlign: config.tickAlign || 'end',
                tickTranslate: config.tickTranslate === 0 ? 0 : (config.tickTranslate || -10),
                tickRotation: config.tickRotation === 0 ? 0 : (config.tickRotation || -45),
                axis: _viewer.generateXAxis(data, {width:boxConfig.width})
            };

            _bottomAxis.render(bottomAxisData, bottomAxisConfig);

            var titleDimensions = layout.getPanelDimensions('title');
            var titleConfig = {
                width: titleDimensions.width,
                height: titleDimensions.height,
                x: config.titleX || 0.5,
                y: config.titleY || 0.5,
                'class': 'title'
            };

            _title.render({content: config.titleContent}, titleConfig);
            setButtonState(generateButtonStates(config), generateButtonBoxStates(config));
        }

        function generateLayout (config) {
            return {
                type: 'vertical',
                width: 1,
                height: 1,
                panels: [
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.1,
                    panels: [{
                        type: 'leaf',
                        width: config.viewerLeftSpacing || 0.1,
                        height: 1
                    },
                    {
                        name: 'title',
                        type: 'leaf',
                        width: 1 - (config.viewerLeftSpacing || 0.9),
                        height: 1
                    }]
                },
                {
                    type: 'horizontal',
                    width: 1,
                    height: 0.9,
                    panels: [{
                        type: 'vertical',
                        width: config.viewerLeftSpacing || 0.1,
                        height: 1,
                        panels: [{
                            name: 'leftAxis',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        },
                        {
                            referenceType: 'border',
                            type: 'leaf',
                            width: 1,
                            height: 0.5
                        }]
                    },
                    {
                        type: 'vertical',
                        width: 1 - (config.viewerLeftSpacing || 0.1),
                        height: 1,
                        panels: [{
                            name: 'boxViewer',
                            type: 'leaf',
                            width: 1,
                            height: 1 - (config.viewerBottomSpacing || 0.45)
                        },
                        {
                            name: 'bottomAxis',
                            type: 'leaf',
                            width: 1,
                            height: 5 * (config.viewerBottomSpacing || 0.45) / 9
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 4 * (config.viewerBottomSpacing || 0.45) / 9
                        }]
                    }]
            }]
            };
        }

        this.query = query;
        this.container = container;
        this.callback = callback;
        this.getPanelDimensions = getPanelDimensions;
    }

    plotviz.EqtlPlot = EqtlPlot;

    return plotviz;
}) (plotviz || {});
