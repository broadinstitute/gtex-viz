let margin = {
    left: 10,
    top: 10,
    right: 10,
    bottom: 170,
};

let cell = { // are these used?
    width: undefined,
    height: undefined
};

let topTreePanel = { // the column dendrogram panel
    x: 100,
    y: 0,
    height: 80,
    width: window.innerWidth - (100 + 150) // hard-coded values?
};

let adjust = 5; // spacing adjustment
let leftTreePanel = { // the row dendrogram panel
    x: margin.left,
    y: margin.top + topTreePanel.height + adjust,
    height: undefined, // data-dependent
    width: 100 - (margin.left + adjust)
};

let heatmapPanel = {
    x: 100,
    y: margin.top + topTreePanel.height + adjust,
    height: leftTreePanel.height,
    width: topTreePanel.width
};

let legendPanel = { // the color legend panel
    x: 100,
    y: margin.top + topTreePanel.height + adjust,
    height: 50,
    width: topTreePanel.width,
    cell: {width: 60}
};

export let heatmapConfig = {
    margin: margin,
    cell: cell,
    width: window.innerWidth,
    height: window.innerWidth*3/4,
    panels: {
        top: topTreePanel,
        left: leftTreePanel,
        main: heatmapPanel
    }
};