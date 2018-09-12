/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    function GtexPlot (div, url, url2) {
        var _boxplotContainer;
        var _lineplotContainer;
        var _boxplot;
        var _lineplot;
        var _root;

        var _gene;

        var _queryGeneData;
        var _geneColorData;
        var _maleData;
        var _femaleData;
        var _ageData = {};

        var _server = url;
        var _server2 = url2;
        var _colorURL = 'http://gtexportal.org/api/v1/samples';

        var _emphasizedIsoform = null;
        var _emphasizedIsoformWidth = 12;

        var CONTROL_POSITION = {
            left: 1/8,
            top: 0.05 
        };
        var TITLE_POSITION = {
            x: 0.5,
            y: 0.8,
            align: 'center'
        };

        function genderBoxplotSort(data, config) {
            var newData = JSON.parse(JSON.stringify(data));
            if ('alphabetical' === config.sorting) {
                newData.data.sort(function (boxGroupA, boxGroupB) {
                    if (boxGroupA.key > boxGroupB.key) return 1;
                    if (boxGroupA.key < boxGroupB.key) return -1;
                    return 0;
                });
            }
            if ('increasing' === config.sorting) {
                newData.data.sort(function (boxGroupA, boxGroupB) {
                    return boxGroupA.value[0].value.median + boxGroupA.value[1].value.median - (boxGroupB.value[0].value.median + boxGroupB.value[1].value.median);
                });
            }
            if ('decreasing' === config.sorting) {
                newData.data.sort(function (boxGroupA, boxGroupB) {
                    return boxGroupB.value[0].value.median + boxGroupB.value[1].value.median - (boxGroupA.value[0].value.median + boxGroupA.value[1].value.median);
                });
            }

            newData.data.forEach(function (boxGroup) {
                boxGroup.value.sort(function (boxA, boxB) {
                    if ('male' === boxA.key && 'female' === boxB.key) return -1;
                    if ('female' === boxA.key && 'male' === boxB.key) return 1;
                    return 0; // Should not be reachable
                });
            });

            return newData;
        }

        var minimumSize = 1150;
        var _width = Math.max(parseInt(window.getComputedStyle(div).width), minimumSize);

        _root = d3.select(div).append('div')
            .attr({
                id: 'root',
                'class': 'root'
            });

        _boxplotContainer = _root.append('div');
        _boxplot = new plotviz.Plot(_boxplotContainer.node());

        _lineplotContainer = _root.append('div');
        _lineplot = new plotviz.Plot(_lineplotContainer.node());

        var _buttons;

        var holdResize = window.resize;

        window.addEventListener('resize', function () {
            if (_gene) {
                _width = Math.max(parseInt(window.getComputedStyle(div).width), minimumSize);
                console.log(_width);
                var newData;

                if ('none' === _boxplotContainer.style('display')) {
                    newData = _lineplot.data();

                    newData.metadata.width = _width;
                    _lineplot.data(newData);
                    setButtonsToSync('line', 'line');
                    _lineplot.render(newData);
                }
                if ('none' === _lineplotContainer.style('display')) {
                    newData = _boxplot.data();

                    newData.metadata.width = _width;
                    _boxplot.data(newData);
                    _boxplot.render(newData);
                    setButtonsToSync('box', 'box');
                }
            }
        });

        function create (url) {

        }

        function start () {

        }

        function grabButtons () {
            _buttons = {
                gene: {
                    plot: {
                        gene: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#plot-buttons div.button-options div.button.btn-left'),
                        isoform: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#plot-buttons div.button-options div.button.btn-right')
                    },
                    differentiation: {
                        none: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#differentiation-buttons div.button-options div.button.btn-left'),
                        gender: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#differentiation-buttons div.button-options div.button.btn-right')
                    },
                    scale: {
                        log: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#scale-buttons div.button-options div.button.btn-left'),
                        linear: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#scale-buttons div.button-options div.button.btn-right')
                    },
                    sort: {
                        alphabetical: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-left'),
                        increasing: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-middle'),
                        decreasing: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-right')
                    },
                    crosshair: {
                        on: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#crosshair-buttons div.button-options div.button.btn-left'),
                        off: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#crosshair-buttons div.button-options div.button.btn-right')
                    },
                    outliers: {
                        on: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#outliers-buttons div.button-options div.button.btn-left'),
                        off: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#outliers-buttons div.button-options div.button.btn-right')
                    },
                    medians: {
                        on: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#medians-buttons div.button-options div.button.btn-left'),
                        off: d3.select('div#plotviz-rootDiv-boxname div#plotviz-controlDiv div.plotviz-floatWrap div#medians-buttons div.button-options div.button.btn-right')
                    }
                },
                isoform: {
                    plot: {
                        gene: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#plot-buttons div.button-options div.button.btn-left'),
                        isoform: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#plot-buttons div.button-options div.button.btn-right')
                    },
                    scale: {
                        log: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#scale-buttons div.button-options div.button.btn-left'),
                        linear: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#scale-buttons div.button-options div.button.btn-right')
                    },
                    sort: {
                        alphabetical: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-left'),
                        increasing: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-middle'),
                        decreasing: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#sort-buttons div.button-options div.button.btn-right')
                    },
                    range: {
                        relative: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#range-buttons div.button-options div.button.btn-left'),
                        absolute: d3.select('div#plotviz-rootDiv-linename div#plotviz-controlDiv div.plotviz-floatWrap div#range-buttons div.button-options div.button.btn-right')
                    }
                }
            };
        }

        function deactivateButton (button) {
            button.className = button.className.replace
                        (/(?:^|\s)btn-active(?!\S)/g, ' btn-inactive');
        }

        function activateButton (button) {
            button.className = button.className.replace
                        (/(?:^|\s)btn-inactive(?!\S)/g, ' btn-active');
        }

        function setButtonsToSync (fromType, toType) {
            if ('box' === fromType && 'line' === toType) {
                activateButton(_buttons.isoform.plot.isoform.node());
                deactivateButton(_buttons.isoform.plot.gene.node());
                if ('log' === _boxplot.option('scale')) {
                    _buttons.isoform.scale.log.node().click();
                }
                if ('linear' === _boxplot.option('scale')) {
                    _buttons.isoform.scale.linear.node().click();
                }
                if ('alphabetical' === _boxplot.option('sorting')) {
                    _buttons.isoform.sort.alphabetical.node().click();
                }
                if ('increasing' === _boxplot.option('sorting')) {
                    _buttons.isoform.sort.increasing.node().click();
                }
                if ('decreasing' === _boxplot.option('sorting')) {
                    _buttons.isoform.sort.decreasing.node().click();
                }
            }
            if ('box' === fromType && 'box' === toType) {
                if ('log' === _boxplot.option('scale')) {
                    _buttons.gene.scale.log.node().click();
                }
                if ('linear' === _boxplot.option('scale')) {
                    _buttons.gene.scale.linear.node().click();
                }
                if ('alphabetical' === _boxplot.option('sorting')) {
                    _buttons.gene.sort.alphabetical.node().click();
                }
                if ('increasing' === _boxplot.option('sorting')) {
                    _buttons.gene.sort.increasing.node().click();
                }
                if ('decreasing' === _boxplot.option('sorting')) {
                    _buttons.gene.sort.decreasing.node().click();
                }
            }
            if ('line' === fromType && 'box' === toType) {
                activateButton(_buttons.gene.plot.gene.node());
                deactivateButton(_buttons.gene.plot.isoform.node());
                if ('log' === _lineplot.option('scale')) {
                    _buttons.gene.scale.log.node().click();
                }
                if ('linear' === _lineplot.option('scale')) {
                    _buttons.gene.scale.linear.node().click();
                }
                if ('alphabetical' === _lineplot.option('sorting')) {
                    _buttons.gene.sort.alphabetical.node().click();
                }
                if ('increasing' === _lineplot.option('sorting')) {
                    _buttons.gene.sort.increasing.node().click();
                }
                if ('decreasing' === _lineplot.option('sorting')) {
                    _buttons.gene.sort.decreasing.node().click();
                }
                _buttons.gene.differentiation.none.node().click();
            }
            if ('line' === fromType && 'line' === toType) {
                if ('log' === _lineplot.option('scale')) {
                    _buttons.isoform.scale.log.node().click();
                }
                if ('linear' === _lineplot.option('scale')) {
                    _buttons.isoform.scale.linear.node().click();
                }
                if ('alphabetical' === _lineplot.option('sorting')) {
                    _buttons.isoform.sort.alphabetical.node().click();
                }
                if ('increasing' === _lineplot.option('sorting')) {
                    _buttons.isoform.sort.increasing.node().click();
                }
                if ('decreasing' === _lineplot.option('sorting')) {
                    _buttons.isoform.sort.decreasing.node().click();
                }
            }

        }

        function setGene (gene) {
            var flagOptions = '?boxplot=true&isoforms=true';
            var url = _server + gene + flagOptions;

            _gene = gene;

            var oReq = new XMLHttpRequest();

            oReq.open('GET', url);

            oReq.onload = function (event) {
                var status = oReq.status;
                var response = oReq.responseText;

                var parsedResponse = JSON.parse(response);
                _queryGeneData = parsedResponse;

                var oReq2 = new XMLHttpRequest();

                oReq2.open('GET', _colorURL);

                oReq2.onload = function (event2) {
                    var colorResponse = JSON.parse(oReq2.responseText);
                    _geneColorData = colorResponse;

                    var oReq3 = new XMLHttpRequest();

                    //oReq3.open('GET', 'http://vgtxportaltest:9000/v3/expression/' + gene + '?boxplot=true&gender=male');
                    oReq3.open('GET', _server2 + gene + '?boxplot=true&gender=male');

                    oReq3.onload = function (event3) {
                        var status3 = oReq3.status;
                        var response3 = oReq3.responseText;

                        _maleData = JSON.parse(response3);

                        var oReq4 = new XMLHttpRequest();

                        //oReq4.open('GET', 'http://vgtxportaltest:9000/v3/expression/' + gene + '?boxplot=true&gender=female');
                        oReq4.open('GET', _server2 + gene + '?boxplot=true&gender=female');

                        oReq4.onload = function (event4) {
                            var status4 = oReq4.status;
                            var response4 = oReq4.responseText;

                            _femaleData = JSON.parse(response4);

                    var boxplotData = generateBoxData(_queryGeneData.generpkm, _geneColorData);
                    var lineplotData = generateLineData(_queryGeneData.isoformrpkm, _geneColorData);
                    _boxplot.create(boxplotData, 'boxname');
                    _boxplot.data(boxplotData);
                    _boxplot.tooltip(boxToolTipFunction);
                    _boxplot.render(boxplotData);

                    _lineplot.create(lineplotData, 'linename');
                    _lineplot.data(lineplotData);
                    _lineplot.mouseclick(mouseClickFunction);
                    _lineplot.mousemove(mouseMoveFunction);
                    _lineplot.render(lineplotData);
                    _lineplotContainer.style('display', 'none');

                    // TODO: Figure out a better way to sync buttons than this
                    grabButtons();
                    _buttons.gene.scale.log.node().click();
                        };

                        oReq4.onerror = function (event4) {
                            
                        };

                        oReq4.send();
                    };

                    oReq3.onerror = function (event3) {

                    };

                    oReq3.send();
                };

                oReq2.onerror = function (event2) {

                };

                oReq2.send();

            };

            oReq.onerror = function (event) {
                console.log('Error: couldn\'t load ' + url);
            };

            oReq.send();
        }

        function generateGenderData (male, female, colors) {
            return {
                metadata: {
                    type: 'box',
                    title: _gene + ' Gender Gene View',
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    boxGroupSpacing: 0.3,
                    significanceLine: {
                        key: 'on',
                        value: {
                            significanceValue: 0.1
                        }
                    },
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        yAxisLabel: {
                            rotation: 90
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [{key: 'differentiation', value: {key: 'differentiation', initial: 'gender'}}],
                    controls: [
                        generateGeneIsoformControl(),
                        generateNoneGenderAgeControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        'crosshair',
                        'outliers',
                        'medians'
                    ],
                },
                data: convertToGenderData(male.generpkm, female.generpkm, colors),
                legend: [
                    {
                        key: 'male',
                        value: {
                            label: 'male',
                            color: 'rgb(58, 152, 219)'
                        }
                    },
                    {
                        key: 'female',
                        value: {
                            label: 'female',
                            color: 'rgb(247, 73, 73)'
                        }
                    }
                ]
            };
        }

        function generateAgeData (ageData, colors) {
            return {
                metadata: {
                    type: 'box',
                    title: _gene + ' Age Gene View',
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        yAxisLabel: {
                            rotation: 90
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [],
                    controls: [
                        generateGeneIsoformControl(),
                        generateNoneGenderAgeControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        'crosshair',
                        'outliers',
                        'medians'
                    ],
                },
                data: convertToAgeData(ageData, colors),
                legend: []
            };
        }

        function generateBoxData (generpkm, colors) {
            return {
                metadata: {
                    type: 'box',
                    title: _gene + ' Gene View',
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        yAxisLabel: {
                            rotation: 90
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [
                        { key: 'differentiation', value: { key:'differentiation', initial: 'none'}}
                    ],
                    controls: [
                        generateGeneIsoformControl(),
                        generateNoneGenderAgeControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        'crosshair',
                        'outliers',
                        'medians'
                    ]
                },
                data: convertToBoxData(generpkm, colors),
                legend: [
                ]
            };
        }

        function convertToBoxLegend (raw, colors) {
            var legendData = [];

            for (var tissue in raw) {
                legendData.push({
                    key: tissue,
                    value: {
                        label: tissue,
                        color: 'rgb(' + colors[tissue].tissue_color_rgb + ')'
                    }
                });
            }

            return legendData;
        }

        function convertToAgeData (ageData, colors) {
            var data = [];

            Object.keys(ageData['20,30']).forEach(function (tissue) {
                data.push({
                    key: tissue,
                    axisLine: {color: colors[tissue]},
                    value: d3.range(20,81,10).map(function (ageStart) {
                        var ageEntry = ageData[ageStart + ',' + (ageStart + 10)];
                        return {
                            key: ageStart + ',' + (ageStart + 10),
                            value: {
                                    high_whisker: ageEntry[tissue].high_whisker,
                                    q3: ageEntry[tissue].q3,
                                    median: ageEntry[tissue].median,
                                    q1: ageEntry[tissue].q1,
                                    low_whisker: ageEntry[tissue].low_whisker,
                                    color: 'rgb(' + colors[tissue] + ')',
                                    outliers: ageEntry[tissue].outliers ? ageEntry[tissue].outliers.map(function (d, i) {
                                        return {
                                            key: i,
                                            value: {
                                                outlier: d
                                            }
                                        };
                                    }) : [],
                                    extra: {
                                        num_samples: ageEntry.num_samples
                                    }
                            }
                        };
                    })
                });
            });

            return data;
        }

        function convertToGenderData (male, female, colors) {
            var data = [];

            Object.keys(male).forEach(function (tissue) {
                var maleEntry = male[tissue];
                var femaleEntry = female[tissue];
                data.push({
                    key: tissue,
                    axisLine: {color: 'rgb(' + colors[tissue].tissue_color_rgb + ')'},
                    value: [{
                            key: 'male',
                            value: {
                                    // TODO: Remove Quality Control hack from these. Should get correct data from web service.
                                    high_whisker: maleEntry.high_whisker || maleEntry.q3 || maleEntry.median || 0,
                                    q3: maleEntry.q3 || maleEntry.median || 0,
                                    median: maleEntry.median,
                                    q1: maleEntry.q1 || maleEntry.median || 0,
                                    low_whisker: maleEntry.low_whisker || maleEntry.q1 || maleEntry.median,
                                    //color: 'rgb(' + colors[tissue].tissue_color_rgb + ')',
                                    color: 'rgb(58, 152, 219)',
                                    outliers: maleEntry.outliers ? maleEntry.outliers.map(function (d, i) {
                                        return {
                                            key: i,
                                            value: {
                                                outlier: d
                                            }
                                        };
                                    }) : [],
                                    extra: {
                                        num_samples: maleEntry.num_samples,
                                        medianColor: maleEntry.num_samples > 0 ? 'black' : 'rgb(58, 152, 219)',
                                        tissue: tissue
                                    }
                                }
                        },
                    {
                            key: 'female',
                            value: {
                                    high_whisker: femaleEntry.high_whisker,
                                    q3: femaleEntry.q3,
                                    median: femaleEntry.median,
                                    q1: femaleEntry.q1,
                                    low_whisker: femaleEntry.low_whisker,
                                    //color: 'rgb(' + colors[tissue].tissue_color_rgb + ')',
                                    color: 'rgb(247, 73, 73)',
                                    outliers: femaleEntry.outliers ? femaleEntry.outliers.map(function (d, i) {
                                        return {
                                            key: i,
                                            value: {
                                                outlier: d
                                            }
                                        };
                                    }) : [],
                                    extra: {
                                        num_samples: femaleEntry.num_samples,
                                        medianColor: femaleEntry.num_samples > 0 ? 'black' : 'rgb(247, 73, 73)',
                                        tissue: tissue
                                    }
                                }
                        }
                    ]
                });
            });

            return data;
        }

        function convertToBoxData (raw, colors) {
            var data = [];

            Object.keys(raw).forEach(function (tissue) {
                var entry = raw[tissue];
                data.push({
                    key: tissue,
                    axisLine: false,
                    value: [{
                        key: tissue,
                        value: {
                            high_whisker: entry.high_whisker,
                            q3: entry.q3,
                            median: entry.median,
                            q1: entry.q1,
                            low_whisker: entry.low_whisker,
                            color: 'rgb(' + colors[tissue].tissue_color_rgb + ')',
                            outliers: entry.outliers.map(function (d, i) {
                                return {
                                    key: i,
                                    value: {
                                        outlier: d
                                    }
                                };
                            }),
                            extra: {
                                num_samples: entry.num_samples
                            }
                        }
                    }]
                });
            });

            return data;
        }

        function generateLineData (isoformrpkm, colors) {

            return {
                metadata: {
                    type: 'line',
                    title: _gene + ' Isoform View',
                    //width: _width - (_width / 7),
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        legend: {
                            left: 6/7,
                            top: 1/8,
                            right: 6/7
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [
                        {
                            key: 'range',
                            value: {
                                key: 'range',
                                initial: 'absolute'
                            }
                        }
                    ],
                    controls: [
                        generateGeneIsoformControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        generateAbsoluteRelativeControl()
                    ]
                },
                data: convertToLineData(isoformrpkm, generateIsoformColors(isoformrpkm)),
                legend: convertToLineLegend(isoformrpkm, generateIsoformColors(isoformrpkm))
            };
        }

        function generateRelativeLineData (isoformrpkm, colors) {

            return {
                metadata: {
                    type: 'line',
                    title: _gene + ' Isoform View',
                    //width: _width - (_width / 7),
                    width: _width,
                    height: 800,
                    xlabel: '',
                    ylabel: 'RPKM',
                    position: {
                        control: CONTROL_POSITION,
                        title: TITLE_POSITION,
                        legend: {
                            left: 6/7,
                            top: 1/8,
                            right: 6/7
                        },
                        xAxisLabel: {
                            tickRotation: -45,
                            tickTranslate: -15,
                            tickAlign: 'end'
                        }
                    },
                    options: [
                        {
                            key: 'range',
                            value: {
                                key: 'range',
                                initial: 'absolute'
                            }
                        }
                    ],
                    controls: [
                        generateGeneIsoformControl(),
                        generateLogLinearScaleControl(),
                        generateSortingControl(),
                        generateAbsoluteRelativeControl()
                    ]
                },
                data: convertToRelativeLineData(isoformrpkm, generateIsoformColors(isoformrpkm)),
                legend: convertToLineLegend(isoformrpkm, generateIsoformColors(isoformrpkm))
            };
        }

        function convertToLineData (raw, colors) {
            var data = [];

            for (var isoform in raw) {
                var iso = raw[isoform];
                var isodata = [];
                for (var tissue in iso) {
                    isodata.push({
                        key: tissue,
                        value: {
                            median: iso[tissue].median
                        }
                    });
                }
                data.push({
                    key: isoform,
                    value: {
                        color: colors[isoform],
                        points: isodata,
                        style: {
                            strokeWidth: isoform === _emphasizedIsoform ? 12 : 1
                        }
                    }
                });
            }

            return data;
        }

        function convertToRelativeLineData (raw, colors) {
            var data = [];

            var totals = {};

            Object.keys(raw).forEach(function (isoform) {
                Object.keys(raw[isoform]).forEach(function (tissue) {
                    if (totals[tissue]) {
                        totals[tissue] += raw[isoform][tissue].median;
                    } else {
                        totals[tissue] = raw[isoform][tissue].median;
                    }
                });
            });

            for (var isoform in raw) {
                var iso = raw[isoform];
                var isodata = [];
                for (var tissue in iso) {
                    isodata.push({
                        key: tissue,
                        value: {
                            median: iso[tissue].median / totals[tissue]
                        }
                    });
                }
                data.push({
                    key: isoform,
                    value: {
                        color: colors[isoform],
                        points: isodata
                    }
                });
            }

            return data;
        }

        function convertToLineLegend (raw, colors) {
            return Object.keys(raw).map(function (isoform) {
                return {
                    key: isoform,
                    value: {
                        label: isoform,
                        color: colors[isoform]
                    }
                };
            });
        }

        function generateGeneIsoformControl () {
            return {
                key: 'plot',
                value: {
                    id: 'plot-buttons',
                    text: 'Plot',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'Gene',
                            className: 'button btn-left',
                            pre: null,
                            post: function (plot, data, config) {
                                _boxplot.data(generateBoxData(_queryGeneData.generpkm, _geneColorData));
                                _boxplotContainer.style('display', '');
                                _boxplot.render(generateBoxData(_queryGeneData.generpkm, _geneColorData));
                                _lineplotContainer.style('display', 'none');
                                setButtonsToSync(plot.data().metadata.type, 'box');
                                _buttons.gene.differentiation.none.node().click();
                            },
                            active: true
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: 'Isoform',
                            className: 'button btn-right',
                            pre: null,
                            post: function (plot, data, config) {
                                _boxplotContainer.style('display', 'none');
                                _lineplotContainer.style('display', '');
                                _lineplot.render(generateLineData(_queryGeneData.isoformrpkm, _geneColorData));
                                setButtonsToSync(plot.data().metadata.type, 'line');
                            }
                        }
                    }]
                }
            };
        }

        function generateNoneGenderAgeControl () {
            return {
                key: 'differentiation',
                value: {
                    id: 'differentiation-buttons',
                    text: 'Differentiation',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'None',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('differentiation', 'none');
                            },
                            post: function (plot, data, config) {
                                _boxplot.data(generateBoxData(_queryGeneData.generpkm, _geneColorData));
                                _boxplotContainer.style('display', '');
                                _boxplot.render(generateBoxData(_queryGeneData.generpkm, _geneColorData));
                                _lineplotContainer.style('display', 'none');
                                setButtonsToSync(plot.data().metadata.type, 'box');
                            },
                            active: true
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: 'Gender',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('differentiation', 'gender');
                            },
                            post: function (plot, data, config) {
                                _boxplot.data(generateGenderData(_maleData, _femaleData, _geneColorData));
                                _boxplotContainer.style('display', '');
                                _boxplot.render(generateGenderData(_maleData, _femaleData, _geneColorData));
                                _lineplotContainer.style('display', 'none');
                                setButtonsToSync(plot.data().metadata.type, 'box');
                            }
                        }
                    }]
                }
            };
        }

        function generateLogLinearScaleControl () {
            return {
                key: 'scale',
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
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                newData.metadata.ylabel = 'Log10(RPKM)';
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            },
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
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            },
                            active: true
                        }
                    }]
                }
            };
        }

        function generateSortingControl () {
            return {
                key: 'sort',
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
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            },
                            active: true
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: '\u25B2',
                            className: 'button btn-middle',
                            pre: function (plot, data, config) {
                                plot.option('sorting', 'increasing');
                            },
                            post: function (plot, data, config) {
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
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
                                var newData = JSON.parse(JSON.stringify(data));
                                if ('relative' === plot.option('range')) {
                                    newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                }
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render('gender' === plot.option('differentiation') ? genderBoxplotSort(newData, config) : plot.sort(newData, config));
                            }
                        }
                    }]
                }
            };
        }

        function generateAbsoluteRelativeControl () {
            return {
                key: 'range',
                value: {
                    id: 'range-buttons',
                    text: 'Range',
                    buttons: [{
                        key: 'button1',
                        value: {
                            text: 'Relative',
                            className: 'button btn-left',
                            pre: function (plot, data, config) {
                                plot.option('range', 'relative');
                            },
                            post: function (plot, data, config) {
                                var newData = generateRelativeLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render(plot.sort(newData, config));
                            }
                        }
                    },
                    {
                        key: 'button2',
                        value: {
                            text: 'Absolute',
                            className: 'button btn-right',
                            pre: function (plot, data, config) {
                                plot.option('range', 'absolute');
                            },
                            post: function (plot, data, config) {
                                var newData = generateLineData(_queryGeneData.isoformrpkm, _geneColorData);
                                if ('log' === plot.option('scale')) {
                                    newData.metadata.ylabel = 'Log10(RPKM)';
                                }
                                if (_emphasizedIsoform) {
                                    newData.data.forEach(function (d) {
                                        if (_emphasizedIsoform === d.key) {
                                            d.value.style = {};
                                            d.value.style.strokeWidth = 12;
                                        }
                                    });
                                }
                                plot.render(plot.sort(newData, config));
                                _buttons.isoform.plot.isoform.node().click();
                            },
                            active: true
                        }
                    }]
                }
            };
        }

        function boxToolTipFunction (x, y, input) {
            if ('tooltip' === input.key) {
                if ('box' === input.value.type) {
                    return input.value.data ? input.value.data.key + (input.value.data.key === 'male' || input.value.data.key === 'female' ? '<br/>' + input.value.data.value.extra.tissue : '') + '<br/>Number of Samples: ' + input.value.data.value.extra.num_samples : null;
                }
                if ('outlier' === input.value.type) {
                    return 'Outlier RPKM: ' + input.value.data.value.outlier;
                }
            }

        }

        function lineToolTipFunction () {

        }

        function legendMouseClickFunction (x, y, input) {
            if ('legend' === input.value.type) {
                console.log('Legend clicked! ' + JSON.stringify(input));
                var isoform = input.value.data.key;
                _boxplotContainer.style('display', '');
                _lineplotContainer.style('display', 'none');

                var boxSpecificData = _queryGeneData.isoformrpkm[isoform];
                boxSpecificData = Object.keys(boxSpecificData).map(function (tissue) {
                    var localBox = boxSpecificData[tissue];
                    return {
                        key: tissue,
                        value: [{
                            key: tissue,
                            value: {
                                high_whisker: localBox.high_whisker,
                                q3: localBox.q3,
                                median: localBox.median,
                                q1: localBox.q1,
                                low_whisker: localBox.low_whisker,
                                color: input.value.data.value.color,
                                outliers: localBox.outliers.map(function (outlier, i) {
                                    return {
                                        key: i,
                                        value: {
                                                outlier: outlier
                                           }
                                    };
                                }),
                                extra: {
                                    opacity: 1
                                }
                            }
                        }]
                    };
                });

                var newBoxPlotData = {
                    metadata: {
                        type: 'box',
                        title: _gene + ' Isoform View ' + isoform,
                        //width: _width - (_width / 7),
                        width: _width,
                        height: 800,
                        xlabel: '',
                        ylabel: 'RPKM',
                        position: {
                            control: CONTROL_POSITION,
                            title: TITLE_POSITION,
                            yAxisLabel: {
                                rotation: 90
                            },
                            xAxisLabel: {
                                tickRotation: -45,
                                tickTranslate: -15,
                                tickAlign: 'end'
                            }
                        },
                        options: [

                        ],
                        controls: [
                            generateGeneIsoformControl(),
                            generateLogLinearScaleControl(),
                            generateSortingControl(),
                            'crosshair',
                            'outliers',
                            'medians'
                        ]
                    },
                    data: boxSpecificData,
                    legend: convertToLineLegend(_queryGeneData.isoformrpkm, generateIsoformColors(_queryGeneData.isoformrpkm))
                };

                _boxplot.data(newBoxPlotData);
                _boxplot.mouseclick(mouseClickFunction);
                _boxplot.render(newBoxPlotData);
            }
        }

        function axisMouseClickFunction (x, y, input) {
            if ('axis' === input.value.type && 'tick' === input.value.subtype) {
                console.log('Axis click! ' + JSON.stringify(input));
                var tissue = input.value.data;

                var boxSpecificData = Object.keys(_queryGeneData.isoformrpkm).map(
                    function (isoform) {
                        var localIsoform = _queryGeneData.isoformrpkm[isoform];
                        var colors = generateIsoformColors(_queryGeneData.isoformrpkm);
                        return {
                            key: isoform,
                            value: [{
                                key: isoform,
                                value: {
                                    high_whisker: localIsoform[tissue].high_whisker,
                                    q3: localIsoform[tissue].q3,
                                    median: localIsoform[tissue].median,
                                    q1: localIsoform[tissue].q1,
                                    low_whisker: localIsoform[tissue].low_whisker,
                                    outliers: localIsoform[tissue].outliers.map(
                                        function (outlier, index) {
                                            return {
                                                key: index,
                                                value: {
                                                    outlier: outlier
                                                }
                                            };
                                        }),
                                    extra: {
                                        opacity: 1,
                                        num_samples: localIsoform[tissue].num_samples
                                    },
                                    color: colors[isoform]
                                }
                            }]
                        };
                    });

                var newBoxPlotData = {
                    metadata: {
                        type: 'box',
                        title: _gene + ' Isoform View ' + tissue,
                        //width: _width - (_width / 7),
                        width: _width,
                        height: 800,
                        xlabel: '',
                        ylabel: 'RPKM',
                        position: {
                            control: CONTROL_POSITION,
                            title: TITLE_POSITION,
                            yAxisLabel: {
                                rotation: 90
                            },
                            xAxisLabel: {
                                tickRotation: -45,
                                tickTranslate: -15,
                                tickAlign: 'end'
                            },
                            legend: {
                                left: 6/7,
                                top: 1/8,
                                right: 6/7,
                                align: 'left'
                            }
                        },
                        options: [

                        ],
                        controls: [
                            generateGeneIsoformControl(),
                            generateLogLinearScaleControl(),
                            generateSortingControl(),
                            'crosshair',
                            'outliers',
                            'medians'
                        ]
                    },
                    data: boxSpecificData,
                    legend: convertToLineLegend(_queryGeneData.isoformrpkm, generateIsoformColors(_queryGeneData.isoformrpkm))
                };

                _boxplot.data(newBoxPlotData);
                _boxplot.mouseclick(mouseClickFunction2);
                _boxplotContainer.style('display', '');
                _boxplot.render(newBoxPlotData);
                _lineplotContainer.style('display', 'none');
            }
        }

        function axisMouseClickFunction2 (x, y, input) {
            if ('axis' === input.value.type && 'tick' === input.value.subtype) {
                console.log('Legend clicked! ' + JSON.stringify(input));
                var isoform = input.value.data;
                _boxplotContainer.style('display', '');
                _lineplotContainer.style('display', 'none');

                var boxSpecificData = _queryGeneData.isoformrpkm[isoform];
                boxSpecificData = Object.keys(boxSpecificData).map(function (tissue) {
                    var localBox = boxSpecificData[tissue];
                    var colors = generateIsoformColors(_queryGeneData.isoformrpkm);
                    return {
                        key: tissue,
                        value: [{
                            key: tissue,
                            value: {
                                high_whisker: localBox.high_whisker,
                                q3: localBox.q3,
                                median: localBox.median,
                                q1: localBox.q1,
                                low_whisker: localBox.low_whisker,
                                color: colors[isoform],
                                outliers: localBox.outliers.map(function (outlier, i) {
                                    return {
                                        key: i,
                                        value: {
                                                outlier: outlier
                                           }
                                    };
                                }),
                                extra: {
                                    opacity: 1
                                }
                            }
                        }]
                    };
                });

                var newBoxPlotData = {
                    metadata: {
                        type: 'box',
                        title: _gene + ' Isoform View ' + isoform,
                        //width: _width - (_width / 7),
                        width: _width,
                        height: 800,
                        xlabel: '',
                        ylabel: 'RPKM',
                        position: {
                            control: CONTROL_POSITION,
                            title: TITLE_POSITION,
                            yAxisLabel: {
                                rotation: 90
                            },
                            xAxisLabel: {
                                tickRotation: -45,
                                tickTranslate: -15,
                                tickAlign: 'end'
                            },
                            legend: {
                                left: 6/7,
                                top: 1/8,
                                right: 6/7,
                                align: 'left'
                            }
                        },
                        options: [

                        ],
                        controls: [
                            generateGeneIsoformControl(),
                            generateLogLinearScaleControl(),
                            generateSortingControl(),
                            'crosshair',
                            'outliers',
                            'medians'
                        ]
                    },
                    data: boxSpecificData,
                    legend: convertToLineLegend(_queryGeneData.isoformrpkm, generateIsoformColors(_queryGeneData.isoformrpkm))
                };

                _boxplot.data(newBoxPlotData);
                _boxplot.mouseclick(mouseClickFunction);
                _boxplot.render(newBoxPlotData);
            }
        }

        function mouseClickFunction (x, y, input) {
            legendMouseClickFunction(x, y, input);
            axisMouseClickFunction(x, y, input);
        }

        function mouseMoveFunction (x, y, input) {
            var isoform = input.value.data.key;

            _emphasizedIsoform = isoform;

            var lineplotData = generateLineData(_queryGeneData.isoformrpkm, _geneColorData);
            //lineplotData.data.forEach(function (iso) {
            //    if (isoform === iso.key) {
            //        iso.value.style = iso.value.style || {};
            //        iso.value.style.strokeWidth = 12;
            //    }
            //});

            //_lineplot.render(_lineplot.sort(lineplotData, _lineplot.config()));
            if ('log' === _lineplot.option('scale')) {
                _buttons.isoform.scale.log.node().click();
            }
            if ('linear' === _lineplot.option('scale')) {
                _buttons.isoform.scale.linear.node().click();
            }
        }

        function mouseClickFunction2 (x, y, input) {
            legendMouseClickFunction(x, y, input);
            axisMouseClickFunction2(x, y, input);
        }

        generateIsoformColors = function (data) {
            var colors = {
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

            var isoformColors = {};

            Object.keys(data).map(function (isoform) {
                return {
                    isoform:isoform,
                    maxValue: Math.max.apply(null, Object.keys(data[isoform]).map(function (tissue) {
                        return data[isoform][tissue].median;
                    }))
                };
            }).sort(function (a, b) {
                return b.maxValue - a.maxValue;
            }).map(function (isovalue, index) {
                return {
                    isoform: isovalue.isoform,
                    color: colors[index]
                };
            }).forEach(function (isoform) {
                isoformColors[isoform.isoform] = isoform.color;
            });

            return isoformColors;
        };

        this.setGene = setGene;
    }

    plotviz.GtexPlot = GtexPlot;

    return plotviz;
}) (plotviz || {});
