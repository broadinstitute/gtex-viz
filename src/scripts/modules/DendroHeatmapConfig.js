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
    w: window.innerWidth - (100 + 150) // hard-coded values?
};

let adjust = 5; // spacing adjustment
let leftTreePanel = { // the row dendrogram panel
    x: margin.left,
    y: margin.top + topTreePanel.h + adjust,
    h: undefined, // data-dependent
    w: 100 - (adjust)
};

let heatmapPanel = {
    x: 100,
    y: margin.top + topTreePanel.h + adjust,
    h: leftTreePanel.h,
    w: topTreePanel.w
};

let legendPanel = { // the color legend panel
    x: 100,
    y: margin.top + topTreePanel.h + adjust,
    h: 50,
    w: topTreePanel.w,
    cell: {w: 60}
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