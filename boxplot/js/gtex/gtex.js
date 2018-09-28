/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';

    function GtexPlot (outerDiv, geneExpUrl, isoformExpUrl, idColorMap, idNameMap) {
        var _gene = null;
        var _boxplot = null;
        var _mixplot = null;
        var _tooltip = null;
        var _filter = null;
        var _queries = {};
        var _config = {
                'plot': 'gene',
                //'scale': 'log',
                'scale': 'linear',
                //'leftAxisLabel': 'Log10(RPKM)',
                'leftAxisLabel': 'TPM',
                'sortState': 'alphabetical',
                'outlierClass': 'outliers-on',
                'whiskerClass': 'whiskers-on',
                'rectClass': 'rects-on',
                'titleClass': 'gtex-title',
                'title2Class': 'gtex-title',
                'controlClass': 'gtex-control',
                'sort': {
                        'outer': function (groupA, groupB) {
                                if (groupA.key < groupB.key) {
                                    return -1;
                                }
                                if (groupB.key < groupA.key) {
                                    return 1;
                                }
                                return 0;
                            },
                        'inner': function (boxA, boxB) {
                                return 0;
                            }
                    }
            };
        var _geneData;
        var _isoformData;
        var _femaleGeneData;
        var _maleGeneData;

        var _buttonReference;
        var _bottonStates;

        var width = 1150;
        var height = 800;

        var div = d3.select(outerDiv).append('div')
            .attr('class', 'gtex-outer-div')
            .node();

        addModal(div);

        generateButtons (div, _config);

        _boxplot = new plotviz.GtexBoxplot(div, {width: width, height: height});
        _mixplot = new plotviz.GtexMixplot(div, {width: width, height: height});
        _tooltip = new plotviz.Tooltip(div);


        var modalDiv = d3.select('#gtex-plot-modal .modal-body').node();
        //_filter = new plotviz.Filter(div);
        _filter = new plotviz.Filter(modalDiv);

        _mixplot.container().style('display', 'none');

        _boxplot.callback(boxplotCallback);
        _mixplot.callback(mixplotCallback);

        $(window).on('resize', function () {
            var width = $(outerDiv).width();
            var height = 800;
            var isoform;

            _config.width = width;
            _config.height = height;
            if ('gene' === _config.plot) {
                renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
            }

            if ('isoform' === _config.plot) {
                isoform = _config.isoformBoxes ||
                    extractGroups(_isoformData).map(function (isoform) {
                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                        }).sort(function (isoformA, isoformB) {
                            return isoformB[0] - isoformA[0];
                        })[0][1];

                renderMixplot({
                    lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                    boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                },
                {
                    lines: _config,
                    boxes: _config
                });
            }

            if ('singleTissue' === _config.plot) {
                renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
            }

            if ('sex' === _config.plot) {
                renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
            }

            if ('relative' === _config.plot) {
                isoform = _config.isoformBoxes ||
                    extractGroups(_isoformData).map(function (isoform) {
                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                        }).sort(function (isoformA, isoformB) {
                            return isoformB[0] - isoformA[0];
                        })[0][1];

                renderMixplot({
                    lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                    boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                },
                {
                    lines: _config,
                    boxes: _config
                });
            }


        });

        function generateMixplotSort (config) {
            var sort = {};
            if (config.sortState === 'alphabetical') {
                if ('isoform' === config.plot) {
                    sort.lines = function (keyDatumA, keyDatumB) {
                        if (keyDatumA.key < keyDatumB.key) {
                            return -1;
                        }
                        if (keyDatumB.key < keyDatumA.key) {
                            return 1;
                        }
                        return 0;
                    };

                    sort.boxes = {};
                    sort.boxes.outer = ABCKeySort;
                    sort.boxes.inner = innerPreserveSort;
                }
                if ('relative' === _config.plot) {
                    sort.lines = function (keyDatumA, keyDatumB) {
                        if (keyDatumA.key < keyDatumB.key) {
                            return -1;
                        }
                        if (keyDatumB.key < keyDatumA.key) {
                            return 1;
                        }
                        return 0;
                    };
                    sort.boxes = {};
                    sort.boxes.outer = ABCKeySort;
                    sort.boxes.inner = innerPreserveSort;
                }
            }

            if (config.sortState === 'increasing') {
                // Both isoform state and relative state return same values
                sort.lines = function (keyDatumA, keyDatumB) {
                    return keyDatumSum(keyDatumA) - keyDatumSum(keyDatumB);
                    function keyDatumSum (keyDatum) {
                        return keyDatum.values.map(function (point) { return point.value; }).reduce(function (pointValueA, pointValueB) { return pointValueA + pointValueB; });
                    }
                };
                sort.boxes = {};
                sort.boxes.outer = outerIncreasingSort;
                sort.boxes.inner = innerIncreasingSort;
            }

            if (config.sortState === 'decreasing') {
                // Both isoform state and relative state return same values
                sort.lines = function (keyDatumA, keyDatumB) {
                    return keyDatumSum(keyDatumB) - keyDatumSum(keyDatumA);
                    function keyDatumSum (keyDatum) {
                        return keyDatum.values.map(function (point) { return point.value; }).reduce(function (pointValueA, pointValueB) { return pointValueA + pointValueB; });
                    }
                };

                sort.boxes = {};
                sort.boxes.outer = outerDecreasingSort;
                sort.boxes.inner = innerDecreasingSort;
            }

            return sort;
        }

        function mixplotCallback (input) {
            var isoform;
            if ('click' === input.type) {
                if ('bottomAxis' === input.id) {
                    var tissue = input.data;
                    var boxes = filterBySingleTissue(_isoformData, tissue);

                    _boxplot.container().style('display', '');
                    _boxplot.callback(mixplotCallbackIsoforms);
                    _mixplot.container().style('display', 'none');
                    _config.plot = 'singleTissue';
                    _config.singleTissue = tissue;
                    renderBoxplot(boxes, _config);
                }
            }
            if ('mousemove' === input.type) {
                if ('boxViewer' === input.subtype) {
                    var dimensions = _mixplot.getPanelDimensions('boxViewer');
                    _tooltip.text(generateTooltipText(input));
                    _tooltip.move(dimensions.x + input.x + 20, dimensions.y + input.y + 20);
                    _tooltip.show();
                }
                if ('legend' === input.subtype) {
                    if ('box' === input.component) {
                        _config.isoformBoxes = input.data.label;
                        _config.title2Content = _gene + ' ' + input.data.label + ' Gene Expression';
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, _config.isoformBoxes)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                    if ('text' === input.component) {
                        _config.isoformBoxes = input.data.label;
                        _config.title2Content = _gene + ' ' + input.data.label + ' Gene Expression';
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, _config.isoformBoxes)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                }
                if ('legend' === input.subtype) {
                    var emphasis;
                    if ('box' === input.component) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                        emphasis = input.data.label;
                        _config.classMap = {};
                        _config.classMap[emphasis] = 'emphasis';
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                    if ('text' === input.component) {
                        //TODO: Does this work?
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                        emphasis = input.data.label;
                        _config.classMap = {};
                        _config.classMap[emphasis] = 'emphasis';
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                }
            }
            if ('mouseout' === input.type) {
                _tooltip.hide();
                if ('legend' === input.subtype) {
                    if ('box' === input.component) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                        _config.classMap = {};
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                    if ('text' === input.component) {
                        //TODO: Does this work?
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                        _config.classMap = {};
                        renderMixplot({
                            lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                        },
                        {
                            lines: _config,
                            boxes: _config
                        });
                    }
                }
            }
            function generateTooltipText (input) {
                return (input.data.extra.sex ? 'Sex: ' + input.data.extra.sex + '<br/>': '') + input.data.extra.groupName + '<br/>Median TPM: ' + input.data.extra.originalMedian.toFixed(3) + '<br/>Number of Samples: ' + input.data.extra.numSamples;
            }
        }

        function mixplotCallbackIsoforms (input) {
            if ('click' === input.type) {
                if ('bottomAxis' === input.id) {
                    var isoform = input.data;

                    _boxplot.container().style('display', 'none');
                    _mixplot.container().style('display', '');
                    _config.plot = 'isoform';
                    renderMixplot({
                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, input.data)), _filter.selected())
                    },
                    {
                        lines: _config,
                        boxes: _config
                    });
                }
            }

            if ('mousemove' === input.type) {
                var dimensions = _boxplot.getPanelDimensions('boxViewer');
                _tooltip.text(generateTooltipText (input));
                _tooltip.move(dimensions.x + input.x + 20, dimensions.y + input.y + 20);
                _tooltip.show();
            }
            if ('mouseout' === input.type) {
                _tooltip.hide();
            }

            function generateTooltipText (input) {
                return (input.data.extra.sex ? 'Sex: ' + input.data.extra.sex + '<br/>': '') + input.data.extra.groupName + '<br/>Number of Samples: ' + input.data.extra.numSamples;
            }
        }

        function boxplotCallback (input) {
            if ('mousemove' === input.type) {
                if (input.subtype && 'boxViewer' === input.subtype) {
                    var dimensions = _boxplot.getPanelDimensions('boxViewer');
                    _tooltip.text(generateTooltipText(input));
                    _tooltip.move(dimensions.x + input.x + 20, dimensions.y + input.y + 20);
                    _tooltip.show();
                }
            }
            if ('mouseout' === input.type) {
                _tooltip.hide();
            }

            function generateTooltipText (input) {
                return (input.data.extra.sex ? 'Sex: ' + input.data.extra.sex + '<br/>': '') + input.data.extra.groupName + '<br/>Median TPM: ' + input.data.extra.originalMedian.toFixed(3) + '<br/>Number of Samples: ' + input.data.extra.numSamples;
            }
        }

        function renderBoxplot (boxes, config) {
            setButtonState(generateButtonStates(config), generateButtonBoxStates(config));

            if (config.sort) {
                _boxplot.sortingFunctions(config.sort);
            }

            _boxplot.render({
                    boxes: boxes
                },
                {
                    boxes: config
                });
        }

        function renderMixplot (mixes, config) {
            var trueConfig = JSON.parse(JSON.stringify(config));
            setButtonState(generateButtonStates(config.lines), generateButtonBoxStates(config.lines));

            // TODO: Figure out a better way than using _config in a closure
            _mixplot.sortingFunctions(generateMixplotSort(_config));

            if ('relative' === config.lines.plot) {
                trueConfig.lines.scale = 'linear';
            }

            _mixplot.render({
                    lines: mixes.lines,
                    boxes: mixes.boxes
                },
                {
                    lines: trueConfig.lines,
                    boxes: config.boxes
                });
        }

        function combineGeneDataAndColor (geneData, colors) {
            var newGeneData = JSON.parse(JSON.stringify(geneData));
            Object.keys(newGeneData).forEach(function (tissue) {
                    newGeneData[tissue].color = colors[tissue];
                });
            return newGeneData;
        }

        function combineIsoformDataAndColor (isoformData) {
            var colors = generateIsoformColors();
            var newIsoformData = JSON.parse(JSON.stringify(isoformData));

            _config.legendColors = {};
            _config.lineColors = {};

            sortIsoformData(newIsoformData).forEach(
                function (isoform, index) {
                    return Object.keys(newIsoformData[isoform]).forEach(function (tissue) {
                            newIsoformData[isoform][tissue].color = colors[index];
                            _config.legendColors[isoform] = colors[index];
                            _config.lineColors[isoform] = colors[index];
                        });
                });

            return newIsoformData;

            function sortIsoformData (isoformData) {
                return Object.keys(isoformData).map(function (isoform) {
                        return [maxIsoformValue (isoformData[isoform]),
                                isoform];
                    }).sort(function (isoformA, isoformB) {
                        return isoformB[0] - isoformA[0];
                    }).map(function (isoform) {
                        return isoform[1];
                    });
            }

            function maxIsoformValue (isoformTissueList) {
                return d3.max(
                    Object.keys(isoformTissueList).map(function (tissue) {
                        var entry = isoformTissueList[tissue];
                        return d3.max([entry.high_whisker,
                                entry.q3,
                                entry.median,
                                entry.q1,
                                entry.low_whisker]);
                    }));
            }
        }

        function normDataToData (normDataList) {
            return Object.keys(normDataList).map(function (tissue) {
                    return {
                            key: tissue,
                            values: normDataList[tissue]
                        };
                });
        }

        function geneDataToData (geneData, colors) {
            return normDataToData(combineGeneDataAndColor(geneData, colors)).map(
                    function (entry) {
                        return {
                                group: 'genetpm',
                                key: entry.key,
                                values: entry.values
                            };
                });
        }

        function topTenIsoformData (data) {
            var topTen = extractGroups(data).map(function (isoform) {
                return [maxValue(filterByGroup(data, isoform)), isoform];
            }).sort(function (isoformA, isoformB) {
                return isoformB[0] - isoformA[0];
            }).map(function (isoform) {
                return isoform[1];
            }).slice(0, 10);

            return data.filter(function (d) { return topTen.indexOf(d.group) > -1; });
        }

        function isoformDataToData (isoformData) {
            var newIsoformData = combineIsoformDataAndColor(isoformData);

            // TODO: Consider not making this completely default behavior
            return topTenIsoformData(Object.keys(newIsoformData).map(function (isoform) {
                    return normDataToData(newIsoformData[isoform]).map(
                        function (entry) {
                            return {
                                    group: isoform,
                                    key: entry.key,
                                    values: entry.values
                                };
                        });
                }).reduce(function (dataA, dataB) {
                    return dataA.concat(dataB);
                }));
        }

        function filterByGroup (data, group) {
            return data.filter(function (datum) {
                    return group === datum.group;
                });
        }

        function filterByKey (data, key) {
            return data.filter(function (datum) {
                    return key === datum.key;
                });
        }

        function filterBySingleTissue (isoformData, tissue) {
            return dataToGroupBoxes(filterByKey(isoformData, tissue));
        }

        function extractGroups (data) {
            return d3.set(data.map(function (datum) {
                    return datum.group;
                })).values();
        }

        function extractKeys (data) {
            return d3.set(data.map(function (datum) {
                    return datum.key;
                })).values();
        }

        function dataToPoints (data) {
            return data.map(function (datum) {
                    return {
                            label: datum.group,
                            key: datum.key,
                            value: datum.values.median
                        };
                });
        }

        function dataToRelativeData (data) {
            var totals = {};

            var keys = extractKeys(data);

            keys.forEach(function (key) {
                    totals[key] = 0;
                    filterByKey(data, key).forEach(function (datum) {
                            totals[key] += datum.values.median;
                        });
                });

            return data.map(function (datum) {
                    var values = JSON.parse(JSON.stringify(datum.values));
                    values.median = values.median / totals[datum.key];
                    return {
                            group: datum.group,
                            key: datum.key,
                            values: values
                        };
                });
        }

        function dataToBoxes (data, key) {
            return data.map(function (datum) {
                    var extra = datum.values.extra || {};
                    extra.groupName = datum[key];
                    extra.numSamples = datum.values.num_samples;
                    extra.originalMedian = datum.values.median;
                    return {
                            highWhisker: datum.values.high_whisker,
                            q3: datum.values.q3,
                            median: datum.values.median,
                            q1: datum.values.q1,
                            lowWhisker: datum.values.low_whisker,
                            outliers: datum.values.outliers,
                            color: datum.values.color,
                            extra: extra
                        };
                });
        }

        function dataToKeyBoxes (data) {
            return dataToBoxes(data, 'key');
        }

        function dataToGroupBoxes (data) {
            return dataToBoxes(data, 'group');
        }

        function maxValue (data) {
            return d3.max(data.map(function (datum) {
                    return datumMaxValue(datum);
                }));

            function datumMaxValue (datum) {
                return d3.max([datum.values.highWhisker,
                        datum.values.q3,
                        datum.values.median,
                        datum.values.q1,
                        datum.values.lowWhisker
                    ]);
            }
        }

        function minValue (data) {
            return d3.min(data.map(function (datum) {
                    return datumMinValue(datum);
                }));

            function datumMinValue (datum) {
                return d3.min([datum.values.highWhisker,
                        datum.values.q3,
                        datum.values.median,
                        datum.values.q1,
                        datum.values.lowWhisker
                    ]);
            }
        }


       function outerDecreasingSort (groupA, groupB) {
           return groupMedianSum(groupB) - groupMedianSum(groupA);

           function groupMedianSum (group) {
               return group.values.map(function (box) {
                   return box.median;
               }).reduce (function (a, b) {
                   return a + b;
               });
           }
       }

       function innerDecreasingSort (boxA, boxB) {
           return boxB.median - boxA.median;
       }

        function ABCKeySort (groupA, groupB) {
            if (groupA.key < groupB.key) {
                return -1;
            }
            if (groupB.key < groupA.key) {
                return 1;
            }
            return 0;
        }

        function innerPreserveSort (boxA, boxB) {
            return 0;
        }

       function outerIncreasingSort (groupA, groupB) {
           return groupMedianSum(groupA) - groupMedianSum(groupB);

           function groupMedianSum (group) {
               return group.values.map(function (box) {
                   return box.median;
               }).reduce (function (a, b) {
                   return a + b;
               });
           }
       }

       function innerIncreasingSort (boxA, boxB) {
           return boxA.median - boxB.median;
       }

        function filterBoxes (boxes, selection) {
            return boxes.filter(function (d) {return selection.indexOf(d.extra.groupName) > -1;});
        }
        function filterPoints (points, selection) {
            return points.filter(function (d){ return selection.indexOf(d.key) > -1; });
        }

        function generateButtons (div, config) {
            var controls = d3.select(div).append('div');
            controls.attr({
                    'id': 'control-div',
                    'class': 'control-class' + (config.controlClass ? ' ' + config.controlClass : '')
                });

            var buttonData = [{
                    title: 'Plot',
                    buttons: [{
                            text: 'Gene',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _boxplot.container().style('display', '');
                                _mixplot.container().style('display', 'none');
                                _config.plot = 'gene';
                                _config.titleContent = _gene + ' Gene Expression';
                                renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                            }
                        },
                        {
                            text: 'Isoform',
                            'class': 'button btn-right',
                            action: function () {
                                _boxplot.container().style('display', 'none');
                                _mixplot.container().style('display', '');
                                _config.plot = 'isoform';

                                if ('alphabetical' === _config.sortState) {
                                    _config.sort = {};
                                    _config.sort.lines = function (keyDatumA, keyDatumB) {
                                        if (keyDatumA.key < keyDatumB.key) {
                                            return -1;
                                        }
                                        if (keyDatumB.key < keyDatumA.key) {
                                            return 1;
                                        }
                                        return 0;
                                    };

                                    _config.sort.boxes = {};
                                    _config.sort.boxes.outer = ABCKeySort;
                                    _config.sort.boxes.inner = innerPreserveSort;
                                }
                                if ('increasing' === _config.sortState) {
                                    _config.sort = {};
                                    _config.sort.lines = function (keyDatumA, keyDatumB) {
                                        return keyDatumSum(keyDatumB) - keyDatumSum(keyDatumA);
                                        function keyDatumSum (keyDatum) {
                                            return keyDatum.values.map(function (point) { return point.value; }).reduce(function (pointValueA, pointValueB) { return pointValueA + pointValueB; });
                                        }
                                    };

                                    _config.sort.boxes = {};
                                    _config.sort.boxes.outer = outerDecreasingSort;
                                    _config.sort.boxes.inner = innerDecreasingSort;
                                }
                                if ('decreasing' === _config.sortState) {
                                    _config.sort = {};
                                    _config.sort.lines = function (keyDatumA, keyDatumB) {
                                        return keyDatumSum(keyDatumB) - keyDatumSum(keyDatumA);
                                        function keyDatumSum (keyDatum) {
                                            return keyDatum.values.map(function (point) { return point.value; }).reduce(function (pointValueA, pointValueB) { return pointValueA + pointValueB; });
                                        }
                                    };

                                    _config.sort.boxes = {};
                                    _config.sort.boxes.outer = outerDecreasingSort;
                                    _config.sort.boxes.inner = innerDecreasingSort;
                                }

                                // Get isoform with largest maximum data point
                                var maxIsoform = extractGroups(_isoformData).map(function (isoform) {
                                        return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                    }).sort(function (isoformA, isoformB) {
                                        return isoformB[0] - isoformA[0];
                                    })[0][1];

                                _config.titleContent = _gene + ' Isoform Expression';
                                _config.title2Content = _gene + ' ' + maxIsoform + ' Gene Expression';

                                renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, maxIsoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                            }
                        }]
                },
                {
                    title: 'Differentiation',
                    buttons: [{
                            text: 'None',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _config.plot = 'gene';
                                renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                            }
                        },
                        {
                            text: 'Sex',
                            'class': 'button btn-right',
                            action: function () {
                                _config.plot = 'sex';
                                renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                            }
                        }]
                },
                {
                    title: 'Scale',
                    buttons: [{
                            text: 'Log',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                var isoform;
                                _config.leftAxisLabel = 'Log10(TPM)';
                                _config.scale = 'log';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    isoform = _config.isoformBoxes || extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    var copyConfig = JSON.parse(JSON.stringify(_config));
                                    copyConfig.scale = 'linear';

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                        },{
                                            lines: copyConfig,
                                            boxes: _config
                                        });
                                }
                            }
                        },
                        {
                            text: 'Linear',
                            'class': 'button btn-right',
                            action: function () {
                                var isoform;
                                _config.leftAxisLabel = 'TPM';
                                _config.scale = 'linear';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    isoform = _config.isoformBoxes || extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                        },
                                        {
                                            lines: _config,
                                            boxes: _config
                                        });
                                }
                            }
                        }]
                },
                {
                    title: 'Sort',
                    buttons: [{
                            text: 'ABC',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                var isoform;
                                _config.sortState = 'alphabetical';
                                if ('gene' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = ABCKeySort;
                                    _config.sort.inner = innerPreserveSort;

                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                                if ('singleTissue' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = ABCKeySort;
                                    _config.sort.inner = innerPreserveSort;

                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }

                                if ('sex' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = ABCKeySort;
                                    _config.sort.inner = function (boxA, boxB) {
                                            if (boxA.extra === 'female') {
                                                return -1;
                                            }
                                            if (boxB.extra === 'female') {
                                                return 1;
                                            }
                                            return 0;
                                        };
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }

                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                            }
                        },
                        {
                            text: '\u25B2',
                            'class': 'button btn-middle',
                            action: function () {
                                var isoform;
                                _config.sortState = 'increasing';
                                if ('gene' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerIncreasingSort;
                                    _config.sort.inner = innerIncreasingSort;

                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }

                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                                if ('singleTissue' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerIncreasingSort;
                                    _config.sort.inner = innerIncreasingSort;
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }

                                if ('sex' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerIncreasingSort;
                                    _config.sort.inner = function (boxA, boxB) {
                                            if (boxA.extra === 'female') {
                                                return -1;
                                            }
                                            if (boxB.extra === 'female') {
                                                return 1;
                                            }
                                            return 0;
                                        };
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }

                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                            }
                        },
                        {
                            text: '\u25BC',
                            'class': 'button btn-right',
                            action: function () {
                                var isoform;
                                _config.sortState = 'decreasing';
                                if ('gene' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerDecreasingSort;
                                    _config.sort.inner = innerDecreasingSort;
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }

                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }

                                if ('singleTissue' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerDecreasingSort;
                                    _config.sort.inner = innerDecreasingSort;
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }

                                if ('sex' === _config.plot) {
                                    _config.sort = {};
                                    _config.sort.outer = outerDecreasingSort;
                                    _config.sort.inner = function (boxA, boxB) {
                                            if (boxA.extra === 'female') {
                                                return -1;
                                            }
                                            if (boxB.extra === 'female') {
                                                return 1;
                                            }
                                            return 0;
                                        };
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }

                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];

                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                                }


                            }
                        }]
                },
                {
                    title: 'Crosshair',
                    buttons: [{
                        },
                        {
                        }]
                },
                {
                    title: 'Outliers',
                    buttons: [{
                            text: 'On',
                            class: 'button btn-left',
                            action: function () {
                                var isoform;
                                _config.outlierClass = 'outliers-on';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                            }
                        },
                        {
                            text: 'Off',
                            class: 'button btn-right',
                            action: function () {
                                var isoform;
                                _config.outlierClass = 'outliers-off';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                            }
                        }]
                },
                {
                    title: 'Display',
                    buttons: [{
                            text: 'Boxes',
                            active: true,
                            'class': 'button btn-left',
                            action: function () {
                                var isoform;
                                _config.whiskerClass = 'whiskers-on';
                                _config.rectClass = 'rects-on';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                            }
                        },
                        {
                            text: 'Medians',
                            'class': 'button btn-right',
                            action: function () {
                                var isoform;
                                _config.whiskerClass = 'whiskers-off';
                                _config.rectClass = 'rects-off';
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), _filter.selected()), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                                if ('singleTissue' === _config.plot) {
                                    renderBoxplot(filterBySingleTissue(_isoformData, _config.singleTissue), _config);
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), _filter.selected()), _config);
                                }
                                if ('relative' === _config.plot) {
                                    isoform = _config.isoformBoxes ||
                                        extractGroups(_isoformData).map(function (isoform) {
                                                return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                            }).sort(function (isoformA, isoformB) {
                                                return isoformB[0] - isoformA[0];
                                            })[0][1];
                                    renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });

                                }
                            }
                        }]
                },
                {
                    title: 'Isoform Levels',
                    buttons: [{
                            text: 'Relative',
                            'class': 'button btn-left',
                            active: true,
                            action: function () {
                                _boxplot.container().style('display', 'none');
                                _mixplot.container().style('display', '');
                                _config.plot = 'relative';

                                // Get isoform with largest maximum data point
                                var isoform = _config.isoformBoxes || extractGroups(_isoformData).map(function (isoform) {
                                        return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                    }).sort(function (isoformA, isoformB) {
                                        return isoformB[0] - isoformA[0];
                                    })[0][1];

                                renderMixplot({
                                        lines: filterPoints(dataToPoints(dataToRelativeData(_isoformData)), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                            }
                        },
                        {
                            text: 'Absolute',
                            'class': 'button btn-right',
                            action: function () {
                                _boxplot.container().style('display', 'none');
                                _mixplot.container().style('display', '');
                                _config.plot = 'isoform';

                                // Get isoform with largest maximum data point
                                var isoform = _config.isoformBoxes || extractGroups(_isoformData).map(function (isoform) {
                                        return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                    }).sort(function (isoformA, isoformB) {
                                        return isoformB[0] - isoformA[0];
                                    })[0][1];

                                renderMixplot({
                                        lines: filterPoints(dataToPoints(_isoformData), _filter.selected()),
                                        boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, isoform)), _filter.selected())
                                    },
                                    {
                                        lines: _config,
                                        boxes: _config
                                    });
                            }
                        }]
                },
                {
                    title: 'Filter',
                    buttons: [{
                        text: 'Tissue',
                        'class': 'button btn-left btn-right',
                        'data-toggle': 'modal',
                        'data-target': '#gtex-plot-modal',
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

        function generateButtonStates(config) {
            return [
                _config.plot === 'isoform' || _config.plot === 'singleTissue' || _config.plot === 'relative' ? [0,1] : [1,0],
                _config.plot === 'sex' ? [0,1] : [1,0],
                _config.scale === 'log' ? [1,0] : [0,1],
                [
                    _config.sortState === 'alphabetical' ? 1 : 0,
                    _config.sortState === 'increasing' ? 1 : 0,
                    _config.sortState === 'decreasing' ? 1 : 0
                ],
                [0,0],
                _config.outlierClass === 'outliers-on' ? [1,0] : [0,1],
                _config.whiskerClass === 'whiskers-on' ? [1,0] : [0,1],
                _config.plot === 'relative' ? [1,0] : [0,1],
                [0]
            ];
        }

        function generateButtonBoxStates(config) {
            var plot = 1,
                differentiation = 1,
                scale = 1,
                sort = 1,
                crosshair = 1,
                outliers = 1,
                medians = 1,
                range = 1,
                filter = 1;

            if (config.plot === 'gene' || config.plot === 'sex') {
                crosshair = 0;
                range = 0;
            }
            if (config.plot === 'isoform' || config.plot === 'singleTissue' || config.plot === 'relative') {
                differentiation = 0;
                crosshair = 0;
            }

            return [plot,
                    differentiation,
                    scale,
                    sort,
                    crosshair,
                    outliers,
                    medians,
                    range,
                    filter];
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

        function tissueHashToFormat (tissueHash) {
            return Object.keys(tissueHash).map(function (tissue) {
                    return {
                            tissue: tissue,
                            values: tissueHash[tissue]
                        };
                });
        }

        function isoformHashToFormat (isoformHash) {
            var mapping = isoformDataColorMapping (isoformHash);

            return Object.keys(isoformHash).map(function (isoform) {
                    return tissueHashToFormat(isoformHash[isoform]).map(
                        function (tissueFormat) {

                            var values = JSON.parse(JSON.stringify(tissueFormat.values));
                            values.color = mapping[isoform];

                            return {
                                    isoform: isoform,
                                    tissue: tissueFormat.tissue,
                                    values: values
                                };
                        }
                    );
                }).reduce(function (isoformFormatA, isoformFormatB) {
                        return isoformFormatA.concat(isoformFormatB);
                    });
        }

        function getFormatEntries (query, isoforms, tissues) {
            var format = isoformHashToFormat(query);

            if (isoforms) {
                format = format.filter(function (entry) {
                        return isoforms.indexOf(entry.isoform) > -1;
                    });
            }

            if (tissues) {
                format = format.filter(function (entry) {
                        return tissues.indexOf(entry.tissue) > -1;
                    });
            }

            return format;
        }

        function formatEntriesToBoxes (entries, category) {
            return entries.map(function (entry) {
                    return {
                            highWhisker: entry.values.high_whisker,
                            q3: entry.values.q3,
                            median: entry.values.median,
                            q1: entry.values.q1,
                            lowWhisker: entry.values.lowWhisker,
                            outliers: entry.values.outliers,
                            color: entry.values.color,
                            extra: {
                                groupName: entry[category || 'tissue']
                            }
                        };
                });
        }

        function formatEntriesToPoints (entries) {

        }

        function maxIsoformValue (isoform) {
            return d3.max(Object.keys(isoform).map(function (tissue) {
                    var values = isoform[tissue];
                    return [tissue.high_whisker,
                        tissue.q3,
                        tissue.median,
                        tissue.q1,
                        tissue.low_whisker];
                }).reduce(function (valuesA, valuesB) {
                    return valuesA.concat(valuesB);
                }).filter(function (value) { return value; }));
        }

        function isoformsSortedMaxToMin (isoformData) {
            var isoforms = Object.keys(isoformData).map(function (isoform) {
                    return {
                            value: maxIsoformValue(isoformData[isoform]),
                            isoform: isoform
                        };
                });

            isoforms.sort(function (isoformA, isoformB) {
                    return isoformB.value - isoformA.value;
                });

            return isoforms.map(function (isoform) { return isoform.isoform; });
        }

        function isoformDataColorMapping (isoformData) {
            var colors = generateDefaultColors();
            var mapping = {};

            isoformsSortedMaxToMin(isoformData).forEach(
                function (isoform, index) {
                    mapping[isoform] = colors[index];
                });

            return mapping;

        }

        function generateIsoformColors () {
            return {
                0: '#c41708',
                1: '#1fccf9',
                2: '#79e537',
                3: '#ddb501',
                4: '#60119a',
                5: '#3ea0a1',
                6: '#296f18',
                7: '#f5dbfc',
                8: '#b4e6fa',
                9: '#65079a',
                10: '#6216a4',
                11: '#8a24c6',
                12: '#a82d20',
                13: '#07ad84',
                14: '#d50fd1',
                15: '#249e5a',
                16: '#af3067',
                17: '#644ffb',
                18: '#1bb80a',
                19: '#33c5fa',
                20: '#668be6',
                21: '#cedc2a',
                22: '#6ea417',
                23: '#f80ddb',
                24: '#e3f3e4',
                25: '#1be427',
                26: '#93a3df',
                27: '#94416b',
                28: '#a37e55',
                29: '#9ba900',
                30: '#750f69',
                31: '#abfb4f',
                32: '#d257ee',
                33: '#094e9d',
                34: '#9a3574',
                35: '#cf4cc3',
                36: '#0357de',
                37: '#dd4571',
                38: '#ef6215',
                39: '#086b2b',
                40: '#e7e006',
                41: '#646a42',
                42: '#a7cebf',
                43: '#a1fd8f',
                44: '#168939',
                45: '#f6ee4d',
                46: '#1e70cb',
                47: '#92f910',
                48: '#cc41b0',
                49: '#1cd065',
                50: '#c17f19',
                51: '#d5701d',
                52: '#49e889',
                53: '#97344d',
                54: '#6ccbfa',
                55: '#b51460',
                56: '#3aa9e7',
                57: '#c4b580',
                58: '#f550b5',
                59: '#02af26',
                60: '#dbbe1c',
                61: '#9ac744',
                62: '#250501',
                63: '#176468',
                64: '#a0e7c7',
                65: '#f7cf08',
                66: '#f7cf08',
                67: '#4c0313',
                68: '#e58e54',
                69: '#f06bdb',
                70: '#c83de1',
                71: '#6bbcd0',
                72: '#b201b0',
                73: '#976027',
                74: '#da523d',
                75: '#4e74f8',
                76: '#dfc523',
                77: '#f6f43f',
                78: '#01e6c5',
                79: '#19fce0',
                80: '#3f3189',
                81: '#6a9fa6',
                82: '#f340af',
                83: '#113996',
                84: '#a0ec80',
                85: '#513f54',
                86: '#a7b48f',
                87: '#f90084',
                88: '#637acc',
                89: '#616de7',
                90: '#ec5494',
                91: '#95f459',
                92: '#8d3297',
                93: '#bc5a81',
                94: '#06e704',
                95: '#a03654',
                96: '#4576c0',
                97: '#3f8649',
                98: '#8b8a7f',
                99: '#e5c0ee'
            };
        }

        function generateDefaultColors () {
            return {
                0: '#c41708',
                1: '#1fccf9',
                2: '#79e537',
                3: '#ddb501',
                4: '#60119a',
                5: '#3ea0a1',
                6: '#296f18',
                7: '#f5dbfc',
                8: '#b4e6fa',
                9: '#65079a',
                10: '#6216a4',
                11: '#8a24c6',
                12: '#a82d20',
                13: '#07ad84',
                14: '#d50fd1',
                15: '#249e5a',
                16: '#af3067',
                17: '#644ffb',
                18: '#1bb80a',
                19: '#33c5fa',
                20: '#668be6',
                21: '#cedc2a',
                22: '#6ea417',
                23: '#f80ddb',
                24: '#e3f3e4',
                25: '#1be427',
                26: '#93a3df',
                27: '#94416b',
                28: '#a37e55',
                29: '#9ba900',
                30: '#750f69',
                31: '#abfb4f',
                32: '#d257ee',
                33: '#094e9d',
                34: '#9a3574',
                35: '#cf4cc3',
                36: '#0357de',
                37: '#dd4571',
                38: '#ef6215',
                39: '#086b2b',
                40: '#e7e006',
                41: '#646a42',
                42: '#a7cebf',
                43: '#a1fd8f',
                44: '#168939',
                45: '#f6ee4d',
                46: '#1e70cb',
                47: '#92f910',
                48: '#cc41b0',
                49: '#1cd065',
                50: '#c17f19',
                51: '#d5701d',
                52: '#49e889',
                53: '#97344d',
                54: '#6ccbfa',
                55: '#b51460',
                56: '#3aa9e7',
                57: '#c4b580',
                58: '#f550b5',
                59: '#02af26',
                60: '#dbbe1c',
                61: '#9ac744',
                62: '#250501',
                63: '#176468',
                64: '#a0e7c7',
                65: '#f7cf08',
                66: '#f7cf08',
                67: '#4c0313',
                68: '#e58e54',
                69: '#f06bdb',
                70: '#c83de1',
                71: '#6bbcd0',
                72: '#b201b0',
                73: '#976027',
                74: '#da523d',
                75: '#4e74f8',
                76: '#dfc523',
                77: '#f6f43f',
                78: '#01e6c5',
                79: '#19fce0',
                80: '#3f3189',
                81: '#6a9fa6',
                82: '#f340af',
                83: '#113996',
                84: '#a0ec80',
                85: '#513f54',
                86: '#a7b48f',
                87: '#f90084',
                88: '#637acc',
                89: '#616de7',
                90: '#ec5494',
                91: '#95f459',
                92: '#8d3297',
                93: '#bc5a81',
                94: '#06e704',
                95: '#a03654',
                96: '#4576c0',
                97: '#3f8649',
                98: '#8b8a7f',
                99: '#e5c0ee'
            };
        }

        function setGene (gene) {
            _gene = gene;

            var geneUrl = geneExpUrl + '?boxplotDetail=full&gencodeId=' + gene;
            var geneReq = new XMLHttpRequest();

            geneReq.open('GET', geneUrl);
            geneReq.onload = function(event) {
                var getBoxplotData = function(x) {
                    return {
                        low_whisker: x['data']['lowerLimit'],
                        high_whisker: x['data']['upperLimit'],
                        median: x['data']['median'],
                        num_samples: x['data']['numSamples'],
                        outliers: x['data']['outliers'],
                        q1: x['data']['q1'],
                        q3: x['data']['q3']
                    };
                };

                var isoformUrl = isoformExpUrl + '?boxplotDetail=full&gencodeId=' + gene;
                var isoformReq = new XMLHttpRequest();
                isoformReq.open('GET', isoformUrl);
                isoformReq.onload = function(event) {
                    var sexSubsetUrl = geneExpUrl + '?attributeSubset=sex&boxplotDetail=full&gencodeId=' + gene;
                    var sexSubsetReq = new XMLHttpRequest();
                    sexSubsetReq.open('GET', sexSubsetUrl);
                    sexSubsetReq.onload = function(event) {
                        var geneResponse = JSON.parse(geneReq.responseText).geneExpression;
                        var isoformResponse = JSON.parse(isoformReq.responseText).transcriptExpression;
                        var sexSubsetResponse = JSON.parse(sexSubsetReq.responseText).geneExpression;

                        //_queries.geneData = {};
                        //geneResponse.forEach(function(x) {
                        //    var tName = idNameMap[x.tissueSiteDetailId];
                        //    _queries.geneData[tName] = getBoxplotData(x);
                        //});

                        _queries.isoformData = {};
                        isoformResponse.forEach(function(x) {
                            var trId = x.transcriptId;
                            var tName = idNameMap[x.tissueSiteDetailId];
                            if (!_queries.isoformData[trId]) {
                                _queries.isoformData[trId] = {};
                            }
                            _queries.isoformData[trId][tName] = getBoxplotData(x);
                        });

                        _queries.sexSubsetData = {};
                        sexSubsetResponse.forEach(function(x) {
                            var sGroup = x.subsetGroup;
                            var tName = idNameMap[x.tissueSiteDetailId];
                            if (!_queries.sexSubsetData[sGroup]) {
                                _queries.sexSubsetData[sGroup] = {};
                            }
                            _queries.sexSubsetData[sGroup][tName] = getBoxplotData(x);
                        });

                        //_queries.colors = idColorMap;

                        //_geneData = geneDataToData(_queries.geneData, _queries.colors);
                        _isoformData = isoformDataToData(_queries.isoformData);
                        _femaleGeneData = sexPatch(geneDataToData(_queries.sexSubsetData.female, _queries.colors), 'female');
                        _maleGeneData = sexPatch(geneDataToData(_queries.sexSubsetData.male, _queries.colors), 'male');

                        //_config.titleContent = gene + ' Gene Expression';
                        //_config.width = $(outerDiv).width();
                        //_config.height = 800;

                        //renderBoxplot(dataToKeyBoxes(_geneData), _config);

                        $('#gtex-plot-modal').on('hidden.bs.modal', function () {
                            if (_filter.selected().length === 0) {
                                $('#gtex-plot-modal').modal('show');
                                $('#myModalWarning').text('Error! Select one or more tissues!');
                            }
                        });

                        _filter.callback(function (selected) {
                                if (selected.length === 0) {
                                    d3.select('#myModalWarning')
                                        .text('Error! Select one or more tissues!');
                                    return;
                                } else {
                                    d3.select('#myModalWarning')
                                        .text('');
                                }

                                var maxIsoform;
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), selected), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    maxIsoform = extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(_isoformData), selected),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, maxIsoform)), selected)
                                        },
                                        {
                                            lines: _config,
                                            boxes: _config
                                        });
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData)), selected), _config);
                                }
                                if ('relative' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    maxIsoform = extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(_isoformData), selected),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, maxIsoform)), selected)
                                        },
                                        {
                                            lines: _config,
                                            boxes: _config
                                        });
                                }
                            });

                        var filterData = [
                                [
                                    ['Adipose', true],
                                    ['Adipose - Subcutaneous', true],
                                    ['Adipose - Visceral (Omentum)', true]
                                ],
                                ['Adrenal Gland', true],
                                [
                                    ['Artery', true],
                                    ['Artery - Aorta', true],
                                    ['Artery - Coronary', true],
                                    ['Artery - Tibial', true]
                                ],
                                ['Bladder', true],
                                [
                                    ['Brain', true],
                                    ['Brain - Amygdala', true],
                                    ['Brain - Anterior cingulate cortex (BA24)', true],
                                    ['Brain - Caudate (basal ganglia)', true],
                                    ['Brain - Cerebellar Hemisphere', true],
                                    ['Brain - Cerebellum', true],
                                    ['Brain - Cortex', true],
                                    ['Brain - Frontal Cortex (BA9)', true],
                                    ['Brain - Hippocampus', true],
                                    ['Brain - Hypothalamus', true],
                                    ['Brain - Nucleus accumbens (basal ganglia)', true],
                                    ['Brain - Putamen (basal ganglia)', true],
                                    ['Brain - Spinal cord (cervical c-1)', true],
                                    ['Brain - Substantia nigra', true]
                                ],
                                ['Breast - Mammary Tissue', true],
                                [
                                    ['Cells', true],
                                    ['Cells - EBV-transformed lymphocytes', true],
                                    ['Cells - Transformed fibroblasts', true]
                                ],
                                [
                                    ['Cervix', true],
                                    ['Cervix - Ectocervix', true],
                                    ['Cervix - Endocervix', true]
                                ],
                                [
                                    ['Colon', true],
                                    ['Colon - Sigmoid', true],
                                    ['Colon - Transverse', true]
                                ],
                                [
                                    ['Esophagus', true],
                                    ['Esophagus - Gastroesophageal Junction', true],
                                    ['Esophagus - Mucosa', true],
                                    ['Esophagus - Muscularis', true]
                                ],
                                ['Fallopian Tube', true],
                                [
                                    ['Heart', true],
                                    ['Heart - Atrial Appendage', true],
                                    ['Heart - Left Ventricle', true]
                                ],
                                ['Kidney - Cortex', true],
                                ['Liver', true],
                                ['Lung', true],
                                ['Minor Salivary Gland', true],
                                ['Muscle - Skeletal', true],
                                ['Nerve - Tibial', true],
                                ['Ovary', true],
                                ['Pancreas', true],
                                ['Pituitary', true],
                                ['Prostate', true],
                                [
                                    ['Skin', true],
                                    ['Skin - Not Sun Exposed (Suprapubic)', true],
                                    ['Skin - Sun Exposed (Lower leg)', true]
                                ],
                                ['Small Intestine - Terminal Ileum', true],
                                ['Spleen', true],
                                ['Stomach', true],
                                ['Testis', true],
                                ['Thyroid', true],
                                ['Uterus', true],
                                ['Vagina', true],
                                ['Whole Blood', true]
                            ];

                        _filter.generate({data: filterData});

                        function sexPatch (data, sex) {
                            return data.map(function (datum) {
                                    var values = datum.values;
                                    values.highWhisker = values.highWhisker || 0;
                                    values.lowWhisker = values.lowWhisker || 0;
                                    values.outliers = values.outliers || [];
                                    values.extra = values.extra || {};
                                    values.extra.sex = sex;
                                    if ('female' === sex) {
                                        values.color = 'red';
                                    }
                                    if ('male' === sex) {
                                        values.color = 'blue';
                                    }
                                    return {
                                            group: datum.group,
                                            key: datum.key,
                                            values: values
                                        };
                                });
                        }

                        function colorsMutator (colors) {
                            var newColors = {};
                            Object.keys(colors).forEach(function (tissue) {
                                    newColors[colors[tissue].tissue_name]= 'rgb(' + colors[tissue].tissue_color_rgb + ')';
                                });

                            return newColors;
                        }
                    };
                    sexSubsetReq.onerror = function(event) {};
                    sexSubsetReq.send();
                };

                var geneResponse = JSON.parse(geneReq.responseText).geneExpression;

                _queries.geneData = {};
                geneResponse.forEach(function(x) {
                    var tName = idNameMap[x.tissueSiteDetailId];
                    _queries.geneData[tName] = getBoxplotData(x);
                });

                _queries.colors = idColorMap;
                _geneData = geneDataToData(_queries.geneData, _queries.colors);

                _config.titleContent = gene + ' Gene Expression';
                _config.width = $(outerDiv).width();
                _config.height = 800;

                renderBoxplot(dataToKeyBoxes(_geneData), _config);

                isoformReq.onerror = function (event) {};
                isoformReq.send();
            };
            geneReq.onerror = function (event) {};
            geneReq.send();

        }

        function devGene (datafile, colorfile, femaleFile, maleFile) {
            var oReq = new XMLHttpRequest();
            oReq.open('GET', datafile);

            oReq.onload = function (event) {
                var oReqFemale = new XMLHttpRequest();

                oReqFemale.open('GET', femaleFile);
                oReqFemale.onload = function (event) {

                    var oReqMale = new XMLHttpRequest();

                    oReqMale.open('GET', maleFile);
                    oReqMale.onload = function (event) {
                        var parsedResponse = JSON.parse(oReq.responseText);
                        // var parsedColor = JSON.parse(oReqColor.responseText);
                        var femaleResponse = JSON.parse(oReqFemale.responseText);
                        var maleResponse = JSON.parse(oReqMale.responseText);

                        _queries.geneData = parsedResponse.genetpm;
                        _queries.isoformData = parsedResponse.isoformtpm;
                        _queries.colors = colorsMutator(colorArr);

                        _geneData = geneDataToData(_queries.geneData, _queries.colors);
                        _isoformData = isoformDataToData(_queries.isoformData);
                        _femaleGeneData = sexPatch(geneDataToData(femaleResponse.genetpm, _queries.colors), 'female');
                        _maleGeneData = sexatch(geneDataToData(maleResponse.genetpm, _queries.colors), 'male');

                        renderBoxplot(dataToKeyBoxes(_geneData), _config);

                        _filter.callback(function (selected) {
                                if ('gene' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_geneData), selected), _config);
                                }
                                if ('isoform' === _config.plot) {
                                    // Get isoform with largest maximum data point
                                    var maxIsoform = extractGroups(_isoformData).map(function (isoform) {
                                            return [maxValue(filterByGroup(_isoformData, isoform)), isoform];
                                        }).sort(function (isoformA, isoformB) {
                                            return isoformB[0] - isoformA[0];
                                        })[0][1];

                                    renderMixplot({
                                            lines: filterPoints(dataToPoints(_isoformData), selected),
                                            boxes: filterBoxes(dataToKeyBoxes(filterByGroup(_isoformData, maxIsoform)), selected)
                                        },
                                        {
                                            lines: _config,
                                            boxes: _config
                                        });
                                }
                                if ('sex' === _config.plot) {
                                    renderBoxplot(filterBoxes(dataToKeyBoxes(_femaleGeneData.concat(_maleGeneData))), _config);
                                }
                            });

                        var filterData = ['All',
                            [
                                ['Adipose',
                                    [
                                        ['Adipose - Subcutaneous', null],
                                        ['Adipose - Visceral (Omentum)', null]
                                    ]
                                ],
                                ['Adrenal Gland', null],
                                ['Artery',
                                    [
                                        ['Artery - Aorta', null],
                                        ['Artery - Coronary', null],
                                        ['Artery - Tibial', null]
                                    ]
                                ],
                                ['Bladder', null],
                                ['Brain',
                                    [
                                        ['Brain - Amygdala', null],
                                        ['Brain - Anterior cingulate cortex (BA24)', null],
                                        ['Brain - Caudate (basal ganglia)', null],
                                        ['Brain - Cerebellar Hemisphere', null],
                                        ['Brain - Cerebellum', null],
                                        ['Brain - Cortex', null],
                                        ['Brain - Frontal Cortex (BA9)', null],
                                        ['Brain - Hippocampus', null],
                                        ['Brain - Hypothalamus', null],
                                        ['Brain - Nucleus accumbens (basal ganglia)', null],
                                        ['Brain - Putamen (basal ganglia)', null],
                                        ['Brain - Spinal cord (cervical c-1)', null],
                                        ['Brain - Substantia nigra', null]
                                    ]
                                ],
                                ['Breast - Mammary Tissue', null],
                                ['Cells',
                                    [
                                        ['Cells - EBV-transformed lymphocytes', null],
                                        ['Cells - Transformed fibroblasts', null]
                                    ]
                                ],
                                ['Cervix',
                                    [
                                        ['Cervix - Ectocervix', null],
                                        ['Cervix - Endocervix', null]
                                    ]
                                ],
                                ['Colon',
                                    [
                                        ['Colon - Sigmoid', null],
                                        ['Colon - Transverse', null]
                                    ]
                                ],
                                ['Esophagus',
                                    [
                                        ['Esophagus - Gastroesophageal Junction', null],
                                        ['Esophagus - Mucosa', null],
                                        ['Esophagus - Muscularis', null]
                                    ]
                                ],
                                ['Fallopian Tube', null],
                                ['Heart',
                                    [
                                        ['Heart - Atrial Appendage', null],
                                        ['Heart - Left Ventricle', null]
                                    ]
                                ],
                                ['Kidney - Cortex', null],
                                ['Liver', null],
                                ['Lung', null],
                                ['Minor Salivary Gland', null],
                                ['Muscle - Skeletal', null],
                                ['Nerve - Tibial', null],
                                ['Ovary', null],
                                ['Pancreas', null],
                                ['Pituitary', null],
                                ['Prostate', null],
                                ['Skin',
                                    [
                                        ['Skin - Not Sun Exposed (Suprapubic)', null],
                                        ['Skin - Sun Exposed (Lower leg)']
                                    ]
                                ],
                                ['Small Intestine - Terminal Ileum', null],
                                ['Spleen', null],
                                ['Stomach', null],
                                ['Testis', null],
                                ['Thyroid', null],
                                ['Uterus', null],
                                ['Vagina', null],
                                ['Whole Blood', null]
                            ]
                        ];

                        _filter.generate(filterData);

                        function sexPatch (data, sex) {
                            return data.map(function (datum) {
                                    var values = datum.values;
                                    values.highWhisker = values.highWhisker || 0;
                                    values.lowWhisker = values.lowWhisker || 0;
                                    values.outliers = values.outliers || [];
                                    values.extra = values.extra || {};
                                    values.extra.sex = sex;
                                    if ('female' === sex) {
                                        values.color = 'red';
                                    }
                                    if ('male' === sex) {
                                        values.color = 'blue';
                                    }
                                    return {
                                            group: datum.group,
                                            key: datum.key,
                                            values: values
                                        };
                                });
                        }

                        function colorsMutator (colors) {
                            var newColors = {};
                            Object.keys(colors).forEach(function (tissue) {
                                    newColors[colors[tissue].tissue_name] = 'rgb(' + colors[tissue].tissue_color_rgb + ')';
                                });

                            return newColors;
                        }
                    };

                    oReqMale.onerror = function (event) {};

                    oReqMale.send();
                };

                oReqFemale.onerror = function (event) {};

                oReqFemale.send();
            };

            oReq.onerror = function (event) {

            };

            oReq.send();

        }

        function addModal (div) {
            var container = d3.select(div);
            var multiChildrenDiv = container.append('div')
                .attr({
                    'id': 'gtex-plot-modal',
                    'class': 'modal fade in',
                    'role': 'dialog'
                })
              .append('div')
                .attr({
                    'class': 'modal-dialog',
                    'role': 'document'
                })
              .append('div')
                .attr({
                    'class': 'modal-content'
                });

            var header = multiChildrenDiv.append('div')
                .attr('class', 'modal-header');

            header.append('button')
                .attr({
                    'type': 'button',
                    'class': 'close',
                    'data-dismiss': 'modal',
                    'aria-label': 'close'
                })
              .append('span')
                .attr('aria-hidden', 'true')
                .html('&times;');

            header.append('h4')
                .attr({
                    'id': 'myModalLabel',
                    'class': 'modal-title'
                })
                .html('Tissues');

            header.append('h4')
                .attr({
                    'id': 'myModalWarning',
                    'class': 'modal-title'
                })
                .style('color', 'red');

            multiChildrenDiv.append('div')
                .attr('class', 'modal-body');
        }

        this.devGene = devGene;
        this.setGene = setGene;
        this.test = {
                queries: _queries,
                isoformHashToFormat: isoformHashToFormat,
                geneDataToData: geneDataToData,
                isoformDataToData: isoformDataToData,
                test: function () {
                    console.log('test');
                }
            };
    }

    plotviz.GtexPlot = GtexPlot;

    return plotviz;
}) (plotviz || {});
