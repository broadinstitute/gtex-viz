import {createSvg} from "./utils";
import {select} from "d3-selection";

import DendroHeatmapConfig from "./DendroHeatmapConfig";
import Dendrogram from "./Dendrogram";
import Heatmap from "./Heatmap";
import Tooltip from "./Tooltip";

export default class DendroHeatmap {

    /**
     * Constructor
     * @param columnTree {String} a newick tree
     * @param rowTree {String} a newick tree
     * @param heatmapData {List} of objects with attributes: x: String, y:String, value:Float, originalValue:Float
     * @param color {String} a color name that's available in Colors.getColorInterpolator
     * @param r {Integer} the degrees of rounded-corners of the heatmap cells
     * @param config {DendroHeatmapConfig}
     * @param useLog {Boolean}
     */
    constructor(columnTree, rowTree, heatmapData, color="YlGnBu", r=2, config=new DendroHeatmapConfig(), useLog=true){
        this.config = config.get();
        //input evaluations
        columnTree = columnTree===undefined||columnTree.startsWith("Not enough data")?undefined:columnTree;
        rowTree = rowTree===undefined||rowTree.startsWith("Not enough data")?undefined:rowTree;
        // assign attribute values based on input arguments
        this.data = {
            columnTree: columnTree,
            rowTree: rowTree,
            heatmap: heatmapData,
            external: undefined
        };
        this.objects = {
            columnTree: this.data.columnTree===undefined? undefined:new Dendrogram(this.data.columnTree, "v"),
            rowTree: this.data.rowTree===undefined?undefined:new Dendrogram(this.data.rowTree, "h"),
            heatmap: new Heatmap(this.data.heatmap, useLog, color, r)
        };
        this.visualComponents = {
            tooltip: new Tooltip("tooltip", false), // TODO: remove hard-coded tooltip DOM ID
            svg: undefined,
            columnTree: undefined,
            rowTree: undefined
        };
    }

    /**
     * Render the dendrograms and corresponding heatmap
     * @param domId {String} the DOM id of the SVG
     * @param showColumnTree {Boolean} render the column dendrogram
     * @param showRowTree {Boolean} render the row dendrogram
     * @param legendPos {Enum} where to place the color legend: bottom, top
     * @param ticks {Integer} number of bins of the color legend
     */
    render(domId, showColumnTree=true, showRowTree=true, legendPos="top", ticks=10){
        this._updateConfig(legendPos);
        this.visualComponents.svg = createSvg(domId, this.config.w, this.config.h, this.config.margin);

        let xlist = undefined,
            ylist = undefined;

        if (showColumnTree && this.objects.columnTree!==undefined){
            this.visualComponents.columnTree = this._renderTree("column", this.objects.columnTree, this.config.panels.top);
            xlist = this.objects.columnTree.xScale.domain();
        }
        if (showRowTree && this.objects.rowTree !== undefined){
            this.visualComponents.rowTree = this._renderTree("row", this.objects.rowTree, this.config.panels.left);
            ylist = this.objects.rowTree.yScale.domain();
        }

        this._renderHeatmap(this.objects.heatmap, xlist, ylist, ticks);
    }

    /**
     * renders a newick tree
     * @param direction {enum} column or row
     * @param tree {Dendrogram} a Dendrogram object
     * @param config {Object} a panel config with attributes: x, y, width and height
     * @private
     */
    _renderTree(direction, tree, config){
        let svg = this.visualComponents.svg;
        const labelClass = direction=="row"?".exp-map-ylabel":".exp-map-xlabel";

        const tooltip = this.visualComponents.tooltip;
        const g = svg.append("g")
            .attr("id", config.id)
            .attr("transform", `translate(${config.x}, ${config.y})`);
        tree.draw(g, config.w, config.h);

        const mouseout = function(){
            select(this)
                .attr("r", 2)
                .attr("fill", "#333");
            svg.selectAll(labelClass).classed("highlighted", false);
        };

        const mouseover = function(d){
            select(this)
                .attr("r", 6)
                .attr("fill", "red");
            let ids = d.leaves().map((node)=>node.data.name);
            svg.selectAll(labelClass)
                .filter((label)=>ids.includes(label))
                .classed("highlighted", true);
        };

        g.selectAll(".dendrogram-node")
            .on("mouseover", mouseover)
            .on("mouseout", mouseout);
        return g;
    }

    /**
     * renders the heatmap and color legend
     * @param heatmap {Heatmap} a Heatmap object
     * @param xList {List} a list of x labels
     * @param yList {List} a list of y labels
     * @param ticks {Integer} the number of bins in the color legend
     * @private
     */
    _renderHeatmap(heatmap, xList, yList, ticks=10){
        let dom = this.visualComponents.svg;
        const config = this.config.panels.main;
        const g = dom.append("g")
            .attr("id", config.id)
            .attr("transform", `translate(${config.x}, ${config.y})`);
        heatmap.redraw(g, xList, yList, {w: config.w, h: config.h});
        heatmap.drawColorLegend(dom, this.config.panels.legend, ticks);
    }



    /**
     * adjusts the layout dimensions based on the actual data
     * @param legendPos {String} bottom or top
     * @private
     */
    _updateConfig(legendPos){
        const rows = this.objects.rowTree===undefined?1:this.objects.rowTree.leaves.length;

        // updates the left panel's height based on the data
        this.config.panels.left.h = this.config.cell.h * rows<20?20:this.config.cell.h * rows;
        this.config.h += this.config.panels.left.h;
        this.config.panels.main.h = this.config.panels.left.h;
        if(legendPos=="bottom") this.config.panels.legend.y += this.config.panels.main.h + this.config.panels.main.x + 50;


    }
}