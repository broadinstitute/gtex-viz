/*
    Dendrogram visualizes a text-based Newick tree using D3 V4.

    dependencies:
    d3 v4
    the newick parser: newick.js

    references:
    https://github.com/d3/d3-hierarchy
    https://github.com/jasondavies/newick.js/

    notes on the underlying data structures:
    - it uses parseNewick() to convert the newick tree into the following json:
        {
            branchset:[child node json objects],
            name: "" // internal nodes would have no real labels
        }
       This json structure is the input data of d3.hierarchy()

    - In the d3.hierarchy(), the root node object has the following structure:
        {
            children: [co, co],
            data: {
                branchset: Array(2),
                name: "node name"
            },
            depth: 0,
            height: integer,
            parent: null,
            value: 9
        }
 */


class Dendrogram {

    constructor(newick, orientation='h', dimensions={w:150, h: 300}){
        this.newick = newick;
        this.orientation = orientation;
        this.width = dimensions.w;
        this.height = dimensions.h;

        this.root = d3.hierarchy(parseNewick(newick), (d) => d.branchset);
        this.leaves = this.root.leaves().sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length));
        this.xScale = undefined;
        this.yScale = undefined;
    }

    draw(dom){
        this._setXScale();
        this._setYScale();
        if ('h' == this.orientation) this._drawHTree(dom);
        else this._drawVTree(dom);
    }

    /////// private methods ///////

    _drawHTree(dom){
        const callback = function(node){
            if (node.children === undefined) {
                // a leaf node
                node.y = this.yScale(node.data.name);
                return node.y
            } else {
                // an internal node
                node.y = node.children.reduce((d, sum)=>sum+d, 0)/node.children.length();
                return node.y
            }
        };
        dom.selectAll('.node')
            .data(this.root.descendants().sort((a, b) => (a.value - b.value) || d3.ascending(a.data.length, b.data.length))) // sort nodes from the leaf level -> root
            .enter().append("circle")
            .attr("cx", (d) => this.xScale(this._getBranchLengthToRoot(d)))
            .attr("cy", (d) => callback)
            .attr("r", 2) // TODO: eliminate hard-coded value
            .attr("fill", "red") // TODO: eliminate hard-coded value
    }

    _drawVTree(){console.info("to be implemented")} // TODO: to be implemented

    _getBranchLengthToRoot(node) {
        // node: a d3.hierarchy node
        return node.path(this.root)
            .reduce((sum, d) => d.data.length?sum+d:sum, 0);
    }

    _getMaxBranchLength() {
        // pick a leaf node
        // Here, we assume all leaf nodes have the same distance to the root)
        // alternatively, we find the max branch length to the root from all leaf nodes
        let node = this.leaves[0];
        return this._getBranchLengthToRoot(node);
    }

    _setXScale(){
        if ('h' == this.orientation){
            this.xScale = d3.scaleLinear()
                .domain([0, _getMaxBranchLength()])
                .range([0, this.width])
        }
    }

    _setYScale(){
        if ('h' == this.orientation){
            this.yScale = d3.scaleBand()
                .domain(this.leaves.map((d) => d.data.name))
                .range([0, this.height])
                .padding(.05); // TODO: eliminate hard-coded value
        }
    }

}