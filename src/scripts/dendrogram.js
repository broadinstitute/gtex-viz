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

    constructor(newick, orientation='h', dimensions={w:150, h: 200}){
        this.newick = newick;
        this.orientation = orientation;
        this.width = dimensions.w;
        this.height = dimensions.h;
        this.postorder = [];
        this.root = d3.hierarchy(parseNewick(newick), (d) => d.branchset)
            .sum((d)=>d.branchset?0:1)
            .sort((a,b)=>a.value-b.value||a.data.length-b.data.length);
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
        const setY = (node) => {
            if (node.children === undefined) {
                // a leaf node
                node.y = this.yScale(node.data.name);
            } else {
                // an internal node
                // the y coordinate of an internal node is the average y from its children
                node.y = node.children.reduce((sum, d)=>sum+d.y, 0)/node.children.length;
            }
        };
        const setX = (node) => {
            node.x = this.xScale(this._getBranchLengthToRoot(node));
        };

        // post-order: from the leaf level -> root
        const nodes = this.root.descendants().sort((a, b) => (a.height - b.height) || d3.ascending(a.data.length, b.data.length));
        nodes.forEach((node) => {
            setX(node);
            setY(node);
        });
        dom.selectAll('.node')
            .data(nodes)
            .enter().append("circle")
            .attr("cx", (d) => d.x)
            .attr("cy", (d) => d.y + this.yScale.bandwidth()/2)
            .attr("r", 2) // TODO: eliminate hard-coded value
            .attr("fill", "#8DCDC1"); // TODO: eliminate hard-coded value

        dom.selectAll('.branch')
            .data(nodes)
            .enter().append("line")
            .attr("x1", (d) => d.x)
            .attr("x2", (d) => d.data.length?d.x - this.xScale(d.data.length):d.x)
            .attr("y1", (d) => d.y + this.yScale.bandwidth()/2) // TODO: eliminate hard-coded adjustment
            .attr("y2", (d) => d.y + this.yScale.bandwidth()/2)
            .attr("stroke", "gray") // TODO: eliminate hard-coded value
            .attr("stroke-width", 1); // TODO: eliminate hard-coded value

        // for all internal nodes
        const inodes = this.root.descendants().filter((d)=>d.height).sort((a,b)=>b.height-a.height);
        dom.selectAll('.arm')
            .data(inodes)
            .enter().append("line")
            .attr("x1", (d) => d.x)
            .attr("x2", (d) => d.x)
            .attr("y1", (d) => d.children[0].y + this.yScale.bandwidth()/2)
            .attr("y2", (d) => d.children[1].y + this.yScale.bandwidth()/2)
            .attr("stroke", "gray") // TODO: eliminate hard-coded value
            .attr("stroke-width", 1); // TODO: eliminate hard-coded value

    }

    _drawVTree(){console.info("to be implemented")} // TODO: to be implemented

    _getBranchLengthToRoot(node) {
        // node: a d3.hierarchy node
        return node.path(this.root)
            .reduce((sum, d) => d.data.length?sum+d.data.length:sum, 0);
    }

    _getMaxBranchLength() {
        // the assumption here is that all leaf nodes have the same distance to the root.
        let node = this.leaves[0]; // randomly picks a leaf node
        return this._getBranchLengthToRoot(node);
    }

    _setXScale(){
        if ('h' == this.orientation){
            this.xScale = d3.scaleLinear()
                .domain([0, this._getMaxBranchLength()])
                .range([0, this.width])
        }
    }
    _assignPostorder(node){
        // assigns post-order of all leaf nodes
        if(node.children === undefined){
            // base case
            this.postorder.push(node);
            return;
        } else {
            this._assignPostorder(node.children[0]);
            this._assignPostorder(node.children[1]);
            return;
        }
    }
    _setYScale(){
        if ('h' == this.orientation){
            this._assignPostorder(this.root);
            console.log(this.postorder);
            this.yScale = d3.scaleBand()
                .domain(this.postorder.map((d) => d.data.name))
                .range([0, this.height])
                .padding(.05); // TODO: eliminate hard-coded value
        }
    }

}