/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function EqtlPlot (div, url, config) {
        var _boxplot;
        var _url = url;

        // TODO: Is this the canonical way? To check for truthyness? To check
        //      for truthyness instead of being undefined instead of an object?
        config = config || {};

        var _config = {
            'scale': 'linear',
            'points': 'on',
            'medians': 'all',
            'titleClass': 'gtex-title',
            'tickTranslate': 10,
            'tickRotation': 0,
            'tickAlign': 'middle',
            'leftAxisLabel': 'Rank Normalized Gene Expression',
            'outlierJitter': 0.25,
            'width': config.width || 850,
            'height': config.height || 800,
            'margin': config.margin || {
                                            'left': 0.1,
                                            'top': 0.1,
                                            'right': 0.1,
                                            'bottom': 0.1
                                        }
        };
        var _eqtl;
        var _buttonReference;
        var buttonStates;


        _boxplot = new plotviz.GtexBoxplot(div, {width:_config.width, height:_config.height});

        generateButtons(div);

        function query (snpId, geneId, tissue, geneSymbol, config) {
            var url = _url + '?snp_id=' + snpId + '&gene_id=' + geneId + '&tissue=' + tissue;

            var oReq = new XMLHttpRequest();

            // TODO: Is this the conanical way? To check for truthyness
            //      instead of being undefined instead of an object?
            config = config || {};

            oReq.open('GET', url);

            oReq.onload = function (event) {
                var status = oReq.status;
                var response = oReq.responseText;

                _eqtl = rpkmToData(JSON.parse(response));
                _config.titleContent = config.titleContent || (tissue + ' eQTL ' + snpId + ' ' + geneId);
                _config.width = config.width || _config.width;
                _config.height = config.height || _config.height;
                render(_eqtl, _config);
            };

            oReq.onerror = function (error) {

            };

            oReq.send();
        }

        function render (data, config) {
            setButtonState(generateButtonStates(config), generateButtonBoxStates(config));
            _boxplot.render({boxes:data}, {boxes:config});
        }

        function generateButtons (div) {
            var controls = d3.select(div).append('div');
            controls.attr({
                    'id': 'control-div',
                    'class': 'control-class'
                });

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



        function rpkmToData (raw) {
            var HET = 1;
            var HOMO_REF = 0;
            var HOMO_ALT = 2;
            var mappingKey = raw.genotypes.split(',').map(function (hashValue) { return parseInt(hashValue); });
            var mappingValues = raw.expression_values.split(',').map(function (expressionValue) { return parseFloat(expressionValue); });

            var het_outliers = mappingValues.filter(function (expressionValue, index) { return HET === mappingKey[index]; });
            var homo_ref_outliers = mappingValues.filter(function (expressionValue, index) { return HOMO_REF === mappingKey[index]; });
            var homo_alt_outliers = mappingValues.filter(function (expressionValue, index) { return HOMO_ALT === mappingKey[index]; });

            return [{
                highWhisker: raw.boxplot.homo_ref.high_whisker,
                q3: raw.boxplot.homo_ref.q3,
                median: raw.boxplot.homo_ref.median,
                q1: raw.boxplot.homo_ref.q1,
                lowWhisker: raw.boxplot.homo_ref.low_whisker,
                outliers: homo_ref_outliers,
                color: 'rgb(142, 149, 222)',
                extra: {
                    groupName: 'Homo Ref <br/> N = ' + raw.boxplot.homo_ref.num_samples
                }
            },
            {
                highWhisker: raw.boxplot.het.high_whisker,
                q3: raw.boxplot.het.q3,
                median: raw.boxplot.het.median,
                q1: raw.boxplot.het.q1,
                lowWhisker: raw.boxplot.het.low_whisker,
                outliers: het_outliers,
                color: 'rgb(142, 149, 222)',
                extra: {
                    groupName: 'Het <br/> N = ' + raw.boxplot.het.num_samples
                }
            },
            {
                highWhisker: raw.boxplot.homo_alt.high_whisker,
                q3: raw.boxplot.homo_alt.q3,
                median: raw.boxplot.homo_alt.median,
                q1: raw.boxplot.homo_alt.q1,
                lowWhisker: raw.boxplot.homo_alt.low_whisker,
                outliers: homo_alt_outliers,
                color: 'rgb(142, 149, 222)',
                extra: {
                    groupName: 'Homo Alt <br/> N = ' + raw.boxplot.homo_alt.num_samples
                }
            }];
        }

        this.query = query;
    }

    plotviz.EqtlPlot = EqtlPlot;

    return plotviz;

}) (plotviz || {});
