/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function EqtlPlot (div, url) {

        var _eqtlPlotContainer = div;
        var _data;
        var _plot;
        var _server = url;
        var _plotCreated = false;

        _plot = new plotviz.Plot(div);

        function query (snpId, geneId, tissue, geneSymbol) {
            var url = _server + '?snp_id=' + snpId + '&gene_id=' + geneId + '&tissue=' + tissue;

            var oReq = new XMLHttpRequest();

            oReq.open('GET', url);

            oReq.onload = function (event) {
                var status = oReq.status;
                var response = oReq.responseText;

                _data = serverResponseToPlotvizInput(response, snpId, geneId, tissue, geneSymbol);
                _plot.data(_data);

                if (!_plotCreated) {
                    _plot.create(_data, 'eqtl');
                    _plotCreated = true;
                }

                render();
            };

            oReq.onerror = function (error) {

            };

            oReq.send();
        }

        function render () {
            _plot.render(_data);
        }

        function serverResponseToPlotvizInput (response, snpId, geneId, tissue, geneSymbol) {
            var parsed = JSON.parse(response);
            return {
                metadata: {
                    type: 'box',
                    title: tissue + ' eQTL ' + snpId + ' ' + (geneSymbol ? geneSymbol : geneId),
                    width: 600,
                    height: 800,
                    xlabel: 'p-value = ' + parsed['p-value'].toPrecision(2),
                    ylabel: 'Rank Normalized Gene Expression',
                    position: {
                        viewer: {
                            left: 1/6,
                            right: 0.9,
                            top: 0.25,
                            bottom: 0.75
                        },
                        control: {
                            left: 0.27,
                            top: 1/8
                        },
                        title: {
                            x: 0.5,
                            y: 0.9,
                            align: 'center'
                        },
                        yAxisLabel: {
                            x: 0.2,
                            y: 0.5,
                            rotation: 90,
                            //align: 'center' // Not implemented
                        },
                        xAxisLabel: {
                            x: 0.5,
                            y: 0.35,
                            rotation: 0,
                            tickRotation: 0,
                            tickTranslate: 0,
                            tickAlign: 'center'
                            //align: 'center' // Not implemented
                        }
                    },
                    options: [],
                    controls: [generateDataPointsControl(),
                                generateMediansControl(),
                                'crosshair'],
                    outlierRadius: 3,
                    outlierJitter: 0.25
                },
                data: parseResponse(response),
                legend: []
            };
        }

        function eqtlExpressionPlotSort (data) {
            var mapping = {
                'Homo Ref': 0,
                'Het': 1,
                'Homo Alt': 2
            };

            data.data.sort(function (a, b) {
                return mapping[a.value.key] - mapping[b.value.key];
            });

            return data;
        }

        function generateDataPointsControl () {
            return {
                key: 'dataPoints',
                value: {
                    id: 'data-points-buttons',
                    text: 'Data Points',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'On',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('outliers', 'on');
                            },
                            post: function (plot, data, config) {
                                plot.render(eqtlExpressionPlotSort(data));
                            },
                            active: true
                        }
                    },{
                        key: 'button2',
                        value: {
                            text: 'Off',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('outliers', 'off');
                            },
                            post: function (plot, data, config) {
                                plot.render(eqtlExpressionPlotSort(data));
                            }
                        }
                    }]
                }
            };
        }

        function generateMediansControl () {
            return {
                key: 'Medians',
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
                                plot.render(eqtlExpressionPlotSort(data));
                            },
                            active: true
                        }
                    },{
                        key: 'button2',
                        value: {
                            text: 'Only',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('medians', 'only');
                            },
                            post: function (plot, data, config) {
                                plot.render(eqtlExpressionPlotSort(data));
                            }
                        }
                    }]
                }
            };
        }

        function parseResponse (response) {
            var parsed = JSON.parse(response);
            var HET = 1;
            var HOMO_REF = 0;
            var HOMO_ALT = 2;
            var mappingKey = parsed.genotypes.split(',').map(function (hashValue) {return parseInt(hashValue);});
            var mappingValues = parsed.expression_values.split(',').map(function (expressionValue) {return parseFloat(expressionValue);});
            var het_circles = mappingValues.filter(function (expressionValue, index) {return HET === mappingKey[index];});
            var homo_ref_circles = mappingValues.filter(function (expressionValue, index) {return HOMO_REF === mappingKey[index];});
            var homo_alt_circles = mappingValues.filter(function (expressionValue, index) {return HOMO_ALT === mappingKey[index];});
            return [{
                key: 'Homo Ref' + '<br/>' + ' N = ' + parsed.boxplot.homo_ref.num_samples,
                value: [{
                    key: 'Homo Ref',
                    value: {
                        high_whisker: parsed.boxplot.homo_ref.high_whisker,
                        q3: parsed.boxplot.homo_ref.q3,
                        median: parsed.boxplot.homo_ref.median,
                        q1: parsed.boxplot.homo_ref.q1,
                        low_whisker: parsed.boxplot.homo_ref.low_whisker,
                        color: 'rgb(142, 149, 222)',
                        outliers: parsed.boxplot.homo_ref.outliers.concat(homo_ref_circles).map(
                            function (outlier, index) {
                                return {
                                    key: index,
                                    value: {
                                        outlier: outlier
                                    }
                                };
                            }),
                        extra: {opacity: 1}
                    }
                }]
            },
            {
                key: 'Het' + '<br/>' +  ' N = ' + parsed.boxplot.het.num_samples,
                value: [{
                    key: 'Het',
                    value: {
                        high_whisker: parsed.boxplot.het.high_whisker,
                        q3: parsed.boxplot.het.q3,
                        median: parsed.boxplot.het.median,
                        q1: parsed.boxplot.het.q1,
                        low_whisker: parsed.boxplot.het.low_whisker,
                        color: 'rgb(142, 149, 222)',
                        outliers: parsed.boxplot.het.outliers.concat(het_circles).map(
                            function (outlier, index) {
                                return {
                                    key: index,
                                    value: {
                                        outlier: outlier
                                    }
                                };
                            }),
                        extra: {opacity: 1}
                    }
                }],
            },
            {
                key: 'Homo Alt' + '<br/>' + ' N = ' + parsed.boxplot.homo_alt.num_samples,
                value: [{
                    key: 'Homo Alt',
                    value: {
                        high_whisker: parsed.boxplot.homo_alt.high_whisker,
                        q3: parsed.boxplot.homo_alt.q3,
                        median: parsed.boxplot.homo_alt.median,
                        q1: parsed.boxplot.homo_alt.q1,
                        low_whisker: parsed.boxplot.homo_alt.low_whisker,
                        color: 'rgb(142, 149, 222)',
                        outliers: parsed.boxplot.homo_alt.outliers.concat(homo_alt_circles).map(
                            function (outlier, index) {
                                return {
                                    key: index,
                                    value: {
                                        outlier: outlier
                                    }
                                };
                            }),
                        extra: {opacity: 1}
                    }
                }]
            }];
        }

        this.query = query;
        this.render = render;
    }

    plotviz.EqtlPlot = EqtlPlot;

    return plotviz;
}) (plotviz || {});
