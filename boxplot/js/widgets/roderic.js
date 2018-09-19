var roderic = (function (roderic) {

    function Plot (div, data) {
        var _svg = d3.select(div).append('svg').attr({
            width: 1000,
            height: 500
        });
        var _data = data;
        var _categories = data.map(function (d) { return d.extra.category; });
        var _layout = new plotviz.LayoutManager(_svg);
        _layout.render(generateLayout(data), {width: 1000, height: 500});
        //var _xAxis = new plotviz.AxisPanel(_layout.getPanel('xAxis'));
        var _yAxis = new plotviz.AxisPanel(_layout.getPanel('yAxis'));
        var _viewerArray = dataToBoxplotViews(data).filter(function (d){
            return d.name !== 'yAxis';
        }).map(function (d) {
            return [d.name, new plotviz.BoxWhiskerViewer(_layout.getPanel(d.name))];
        });
        _xAxisArray = dataToBoxplotXAxes(data).filter(function (d) {
            return d.name !== 'xAxisSpacer';
        }).map(function (d) {
            return [d.name.substr(0, d.name.indexOf('XAxis')), new plotviz.AxisPanel(_layout.getPanel(d.name))];
        });

        function render() {


            _viewerArray.forEach(function (d) {
                var c = d[0];
                var boxViewer = d[1];

                var dimensions = _layout.getPanelDimensions(c);

                var config= {
                    width:dimensions.width,
                    height:dimensions.height,
                };

                var realData = data.filter(function (fd) {
                    return fd.extra.category === c;
                }).map(function (bd) {
                    return {
                        high_whisker: bd.high_whisker,
                        q3: bd.q3,
                        median: bd.median,
                        q1: bd.q1,
                        low_whisker: bd.low_whisker,
                        outliers: [],
                        color: bd.color,
                        extra: {
                            group: bd.extra.category
                        }
                    };
                });

                boxViewer.render(realData, config);
            });

            var yAxisData = {
                orientation: 'left',
                label: 'Y Axis'
            };

            var yAxisDimensions = _layout.getPanelDimensions('yAxis');

            var yAxisConfig = {
                width: yAxisDimensions.width,
                height: yAxisDimensions.height,
                axis: _viewerArray[0][1].generateYAxis(
                data.map(function (d) {
                    return {
                        high_whisker: d.high_whisker,
                        q3: d.q3,
                        median: d.median,
                        q1: d.q1,
                        low_whisker: d.low_whisker,
                        outliers: [],
                        extra: {
                            group: d.extra.category
                        }
                    };
                }),
                {height:_layout.getPanelDimensions(_categories[0]).height})
            };

            _yAxis.render(yAxisData, yAxisConfig);

            _xAxisArray.forEach(function (d, i) {
                var c = d[0] + 'XAxis';
                var xAxis = d[1];

                var dimensions = _layout.getPanelDimensions(c);

                var xAxisData = {
                    orientation: 'bottom',
                    //label: d[0] + ' Axis'
                };

                var realData = data.filter(function (fd) {
                    return fd.extra.category === d[0];
                }).map(function (xd, i) {
                    return {
                        high_whisker: xd.high_whisker,
                        q3: xd.q3,
                        median: xd.median,
                        q1: xd.q1,
                        low_whisker: xd.low_whisker,
                        outliers: [],
                        extra: {
                            groupName: xd.extra.category + i
                        }
                    };
                });

                var config = {
                    axisX: 0,
                    axisY: 0,
                    width: dimensions.width,
                    height: dimensions.height,
                    axis: _viewerArray[i][1].generateXAxis(realData, {width:dimensions.width})
                };

                xAxis.render(xAxisData, config);
            });

        }

        function generateLayout (data, config) {
            return {
                type: 'vertical',
                width: 1,
                height: 1,
                panels: [
                    {
                        type: 'horizontal',
                        width: 1,
                        height: 0.75,
                        panels: dataToBoxplotViews(data)
                    },
                    {
                        type: 'horizontal',
                        width: 1,
                        height: 0.25,
                        panels: dataToBoxplotXAxes(data)
                    }
                ]
            };
        }

        function dataToBoxplotXAxes (data) {
            var categories = data.map(function (d) {
                return d.extra.category;
            });
            categories = categories.filter(function (d, i) {
                return categories.indexOf(d) === i;
            });

            return [
                {
                    type: 'leaf',
                    width: 0.25,
                    height: 1,
                    name: 'xAxisSpacer'
                }
            ].concat(categories.map(function (d) {
                return {
                    type: 'leaf',
                    width: 0.75 / categories.length,
                    height: 1,
                    name: d + 'XAxis'
                };
            }));
        }

        function dataToBoxplotViews (data) {
            var categories = data.map(function (d) {
                return d.extra.category;
            });
            categories = categories.filter(function (d, i) {
                return categories.indexOf(d) === i;
            });

            return [
                {
                    type: 'leaf',
                    width: 0.25,
                    height: 1,
                    name: 'yAxis'
                }
            ].concat(categories.map(function (d) {
                return {
                    type: 'vertical',
                    width: 0.75 / categories.length,
                    height: 1,
                    panels: [
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.1,
                            name: d + 'Title'
                        },
                        {
                            type: 'leaf',
                            width: 1,
                            height: 0.9,
                            name: d
                        }
                    ]
                };
            }));
        }

        this.render = render;

    }

    function demoData () {
        return [
        {
            key: 'a1',
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'red',
            extra: {
                category: 'a'
            }
            
        },
        {
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'red',
            extra: {
                category: 'a'
            }
            
        },
        {
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'red',
            extra: {
                category: 'a'
            }
            
        },
        {
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'blue',
            extra: {
                category: 'b'
            }
            
        },
        {
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'blue',
            extra: {
                category: 'b'
            }
            
        },
        {
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'green',
            extra: {
                category: 'c'
            }
            
        },
        {
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'green',
            extra: {
                category: 'c'
            }
            
        },
        {
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'green',
            extra: {
                category: 'c'
            }
            
        },
        {
            high_whisker: 5,
            q3: 4,
            median: 3,
            q1: 2,
            low_whisker: 1,
            color: 'green',
            extra: {
                category: 'c'
            }
            
        }
        ];
    }

    roderic.Plot = Plot;
    roderic.demoData = demoData;

    return roderic;
}) (roderic || {});
