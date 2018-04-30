/**
 * TODO: a better way of handling layout configuration
 * review all the position calculations
 */
export default class DendroHeatmapConfig {
    /**
     *
     * @param id {String} the name of the dom ID
     * @param mainPanelW {Number}
     * @param leftPanelW {Integer}, set to 0 if there's no left panel
     * @param topPanelH {Integer}, set to 0 if there's no top panel
     * @param margin {Object} with attr: top, right, bottom, left, smaller values than the default are not recommended for the heatmap
     * @param cellH {Integer}
     * @param adjust {Integer}, adjusted spacing between the heatmap and the dendrogram
     */
    constructor(id="chart", rootW=window.innerWidth, leftPanelW=100, topPanelH=100, margin={top:50, right:250, bottom:170, left:10}, cellH=12, adjust=10) {
        this.id = id;
        this.margin = margin;
        this.rootW = rootW<1000?1000:rootW;

        this.leftTreePanel = { // the row dendrogram panel
            x: margin.left,
            y: margin.top + topPanelH,
            h: undefined, // undefined initially, because it's data-dependent
            w: leftPanelW - adjust,
            id: "leftTree"
        };


        this.cell = {
            w: undefined,
            h: cellH
        };

        this.topTreePanel = { // the column dendrogram panel
            x: margin.left + leftPanelW,
            y: margin.top,
            h: topPanelH - adjust,
            w: this.rootW - (margin.left + leftPanelW + margin.right), // hard-coded values?
            id: "topTree"
        };

        this.heatmapPanel = {
            x: margin.left + leftPanelW,
            y: margin.top + topPanelH,
            h: this.leftTreePanel.h,
            w: this.topTreePanel.w,
            id: "heatmap"
        };

        this.legendPanel = { // the color legend panel
            x: margin.left + leftPanelW,
            y: 0,
            h: margin.top/2,
            w: this.topTreePanel.w,
            cell: {w: 60},
            id: "legend"
        };


    }

    get(){
        return {
            id: this.id,
            margin: this.margin,
            cell: this.cell,
            w: this.rootW,
            h: this.margin.top + this.topTreePanel.h + this.legendPanel.h + this.margin.bottom, // initial height
            panels: {
                top: this.topTreePanel,
                left: this.leftTreePanel,
                main: this.heatmapPanel,
                legend: this.legendPanel
            }
        };
    }
}

