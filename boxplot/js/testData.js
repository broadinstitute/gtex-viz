/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {

    plotviz.testInput2 = {
        metadata: {
            title: "Title",
            xlabel: "XAxisTest",
            ylabel: "YAxisTest",
            controls: ['orientation',
                        'sorting',
                        'scaling'],
            width: 1000,
            height: 400
        },
        data: [
            {
                key: 'key1',
                value: [
                    {
                        key: "key1",
                        value: {
                            high_whisker: 5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 0.1,
                            extra: {num_ticks: 7},
                            outliers: [6, 7, 7.5, 8],
                            color: 'red'
                        }
                    },
                    {
                        key: "key2",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 7,
                            low_whisker: 6,
                            color: 'green',
                            extra: {num_ticks: 6},
                            outliers: [2, 3, 2.5]
                        }
                    }
                ]
            },
            {
                key: 'key4',
                value: [
                    {
                        key: "key4",
                        value: {
                            high_whisker: 7,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 3,
                            color: 'blue',
                            extra: {num_ticks: 1},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key6',
                value: [
                    {
                        key: "key6",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 2,
                            low_whisker: 1,
                            color: 'yellow',
                            extra: {num_ticks: 2},
                            outliers: []
                        }
                    },
                    {
                        key: "key7",
                        value: {
                            high_whisker: 8,
                            q3: 7,
                            median: 6,
                            q1: 5,
                            low_whisker: 4,
                            color: 'orange',
                            extra: {num_ticks: 3},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key9',
                value: [
                    {
                        key: "key9",
                        value: {
                            high_whisker: 4.5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 1.5,
                            color: 'purple',
                            extra: {num_ticks: 4},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key10',
                value : [
                    {
                        key: "key10",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'cyan',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    }
                ]
            }
        ],
        legend: [
            {
                key: 'key1',
                value: {
                    label: 'label1',
                    color: 'red'
                }
            },
            {
                key: 'key2',
                value: {
                    label: 'label2',
                    color: 'blue'
                }
            },
            {
                key: 'key3',
                value: {
                    label: 'label3',
                    color: 'red'
                }
            }
        ]
    };

    plotviz.normalInput = {
        metadata: {
            title: "Title",
            xlabel: "XAxisTest",
            ylabel: "YAxisTest",
            controls: ['orientation',
                        'sorting',
                        'scaling'],
            width: 1400,
            height: 800
        },
        data: [
            {
                key: 'key1',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 0.1,
                            extra: {num_ticks: 7},
                            outliers: [
                                {
                                    key: 'one',
                                    value: {
                                        outlier: 6
                                    }
                                },
                                {
                                    key: 'two',
                                    value: {
                                        outlier: 7,
                                        extra: 'surprise'
                                    }
                                },
                                {
                                    key: 'three',
                                    value: {
                                        outlier: 7.5
                                    }
                                },
                                {
                                    key: 'four',
                                    value: {
                                        outlier: 8
                                    }
                                }
                            ],
                            color: 'red'
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 7,
                            low_whisker: 6,
                            color: 'blue',
                            extra: {
                                num_ticks: 6,
                                opacity: 0.5
                            },
                            outliers: [
                                {
                                    key: 'one',
                                    value: {
                                        outlier: 2
                                    }
                                },
                                {
                                    key: 'two',
                                    value: {
                                        outlier: 3
                                    }
                                },
                                {
                                    key: 'three',
                                    value: {
                                        outlier: 2.5
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            {
                key: 'key4',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 7,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 3,
                            color: 'red',
                            extra: {num_ticks: 1},
                            outliers: []
                        }
                    },
                    {
                    }
                ]
            },
            {
                key: 'key6',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 10,
                            q3: 9,
                            median: 8,
                            q1: 2,
                            low_whisker: 1,
                            color: 'red',
                            extra: {num_ticks: 2},
                            outliers: []
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 8,
                            q3: 7,
                            median: 6,
                            q1: 5,
                            low_whisker: 4,
                            color: 'blue',
                            extra: {num_ticks: 3},
                            outliers: []
                        }
                    }
                ]
            },
            {
                key: 'key9',
                value: [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 4.5,
                            q3: 4,
                            median: 3,
                            q1: 2,
                            low_whisker: 1.5,
                            color: 'red',
                            extra: {num_ticks: 4},
                            outliers: []
                        }
                    },
                    {
                    }
                ]
            },
            {
                key: 'key10',
                value : [
                    {
                        key: "odd",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'red',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    },
                    {
                        key: "even",
                        value: {
                            high_whisker: 9,
                            q3: 6,
                            median: 5,
                            q1: 4,
                            low_whisker: 1,
                            color: 'blue',
                            extra: {num_ticks: 5},
                            outliers: []
                        }
                    }
                ]
            }
        ],
        legend: [
            {
                key: 'key1',
                value: {
                    label: 'label1',
                    color: 'red'
                }
            },
            {
                key: 'key2',
                value: {
                    label: 'label2',
                    color: 'blue'
                }
            },
            {
                key: 'key3',
                value: {
                    label: 'label3',
                    color: 'red'
                }
            }
        ]
    };

    return plotviz;
})
    (plotviz || {});
