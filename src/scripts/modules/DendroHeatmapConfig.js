let margin = {
    left: 10,
    top: 10,
    right: 10,
    bottom: 170,
};

let cell = { // are these used?
    w: undefined,
    h: 12
};

let topTreePanel = { // the column dendrogram panel
    x: 100,
    y: 0,
    h: 80,
    w: window.innerWidth - (100 + 150), // hard-coded values?
    id: "topTree"
};

let adjust = 5; // spacing adjustment
let leftTreePanel = { // the row dendrogram panel
    x: margin.left,
    y: margin.top + topTreePanel.h + adjust,
    h: undefined, // data-dependent
    w: 100 - (adjust),
    id: "leftTree"
};

let heatmapPanel = {
    x: 100,
    y: margin.top + topTreePanel.h + adjust,
    h: leftTreePanel.h,
    w: topTreePanel.w,
    id: "heatmap"
};

let legendPanel = { // the color legend panel
    x: 100,
    y: margin.top + topTreePanel.h + adjust + 150,
    h: 50,
    w: topTreePanel.w,
    cell: {w: 60},
    id: "legend"
};

export let heatmapConfig = {
    margin: margin,
    cell: cell,
    w: window.innerWidth,
    h: margin.top + topTreePanel.h + legendPanel.h + margin.bottom, // initial height
    panels: {
        top: topTreePanel,
        left: leftTreePanel,
        main: heatmapPanel,
        legend: legendPanel
    }
};