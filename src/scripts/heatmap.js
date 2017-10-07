class Heatmap {
    /* data is a json with the following attributes:
        x: the x label
        y: the y label
        value: the rendered numerical value (transformed)
        originalValue: the original numerical value
     */
    constructor(data, dimensions={w:1000, h:600}, colors=d3.schemeBlues[9]){
        this.data = data;
        this.width = dimensions.w;
        this.height = dimensions.h;
        this.nullColor = "#e6e6e6";
        this.colors = colors;
        this.colorScale = undefined;
        this.xList = undefined;
        this.yList = undefined;
        this.xScale = undefined;
        this.yScale = undefined;
    }

    drawLegend(dom) {
        if (this.colorScale === undefined) this._setColorScale();
        if (this.yList === undefined) this._setYList();

        const legend = dom.selectAll(".legend")
            .data([0].concat(this.colorScale.quantiles()), (d) => d);

        const legendGroups = legend.enter().append("g")
            .attr("class", "legend");

        legendGroups.append("rect")
            .attr("x", (d, i) => 50*i) // TODO: hard-coded value
            .attr("y", 5)
            .attr("width", 50) // TODO: hard-coded value
            .attr("height", this.yScale.bandwidth()/2)
            .style("fill", (d) => this.colorScale(d));

        legendGroups.append("text")
            .attr("class", "normal")
            .text((d) => d==0?">0":"≥ " + Math.round(Math.pow(2, d)))
            .attr("x", (d, i) => 50 * i) // TODO: hard-coded value
            .attr("y", 16 + this.yScale.bandwidth()/2); // TODO: hard-coded value

        if(useLog){
            legendGroups.append("text")
                .attr("class", "normal")
                .text("Median TPM")
                .attr("x", 50 * 10) // TODO: hard-coded value
                .attr("y", 16 + this.yScale.bandwidth()/2) // TODO: hard-coded value
        }
    }

    draw(dom){
        if (this.xList === undefined) this._setXList();
        if (this.yList === undefined) this._setYList();
        if (this.colorScale === undefined) this._setColorScale();
        // text labels
        const xLabels = dom.selectAll(".xLabel")
            .data(this.xList)
            .enter().append("text")
            .text((d) => d.replace(/_/g, " ")) // TODO: eliminate gtex specific text modification
            .attr("x", 0)
            .attr("y", 0)
            .attr("class", (d, i) => `xLabel normal x${i}`)
            .style("text-anchor", "start")
            .attr("transform", (d) => {
                let angle = 60; // TODO: hard-coded value
                let x = this.xScale(d);
                return `translate(${x}, ${this.yScale.range()[1] + (this.yScale.bandwidth()/2)}) rotate(${angle})`;
            });

        const yLabels = dom.selectAll(".yLabel")
            .data(this.yList)
            .enter().append("text")
            .text((d) => d)
            .attr("x", this.xScale.range()[1] + (this.xScale.bandwidth()/2))
            .attr("y", (d) => this.yScale(d) + (this.yScale.bandwidth()/1.5))
            .attr("class", (d, i) => `yLabel normal y${i}`)
            .style("text-anchor", "start")
            .on('click', (d) => {
                alert(`ouch, ${d} got clicked`)
            });

        // heatmap cells
        const cells = dom.selectAll(".cell")
            .data(this.data, (d) => d.value);
        cells.enter().append("rect")
            .attr("row", (d) => `x${this.xList.indexOf(d.x)}`)
            .attr("col", (d) => `y${this.yList.indexOf(d.y)}`)
            .attr("x", (d) => this.xScale(d.x))
            .attr("y", (d) => this.yScale(d.y))
            .attr("rx", 2)
            .attr('ry', 2)
            .attr("class", (d) => `cell expressmap-bordered`)
            .attr("width", this.xScale.bandwidth())
            .attr("height", this.yScale.bandwidth())
            .style("fill", (d) => this.colors[0])

            .merge(cells)
            .transition()
            .duration(2000)
            .style("fill", (d) => d.originalValue==0?this.nullColor:this.colorScale(d.value));

        this._addCellMouseEvents(cells);

    }

    _addCellMouseEvents(cells){
        const tooltip = new Tooltip("tooltip");
        // mouse events
        const mouseover = function(d) {
            const selected = d3.select(this);
            const rowClass = selected.attr("row");
            const colClass = selected.attr("col");
            d3.selectAll(".xLabel").filter(`.${rowClass}`)
                .classed('normal', false)
                .classed('highlighted', true);
            d3.selectAll(".yLabel").filter(`.${colClass}`)
                .classed('normal', false)
                .classed('highlighted', true);
            selected.classed('expressmap-highlighted', true);
            let row = d.x.replace(/_/g, " ");
            let column = d.y;
            tooltip.show(`Tissue: ${row} <br> Gene: ${column} <br> Median TPM: ${parseFloat(d.originalValue.toExponential()).toPrecision(4)}`);
        };
        const mouseout = function(d){
            const selected = d3.select(this);
            const rowClass = selected.attr("row");
            const colClass = selected.attr("col");

            d3.selectAll(".xLabel").filter(`.${rowClass}`)
                .classed('normal', true)
                .classed('highlighted', false);
            d3.selectAll(".yLabel").filter(`.${colClass}`)
                .classed('normal', true)
                .classed('highlighted', false);
            selected.classed('expressmap-highlighted', false);
            tooltip.hide();
        };
        cells.on('mouseover', mouseover)
            .on('mouseout', mouseout)
    }

    _setXList() {
        this.xList = d3.nest()
            .key((d) => d.x)
            .entries(this.data)
            .map((d) => d.key);
        this.xScale = d3.scaleBand()
            .domain(this.xList)
            .range([0, this.width])
            .padding(.05); // TODO: eliminate hard-coded value
    }

    _setYList() {
        this.yList = d3.nest()
            .key((d) => d.y)
            .entries(this.data)
            .map((d) => d.key);
        this.yScale = d3.scaleBand()
                .domain(this.yList)
                .range([0, this.height])
                .padding(.05); // TODO: eliminate hard-coded value
    }

    _setColorScale() {
        this.colorScale = d3.scaleQuantile() // scaleQuantile maps the continuous domain to a discrete range
            .domain([0, Math.round(d3.max(this.data, (d) => d.value))])
            // .domain([0, 10])
            .range(this.colors);
    }
}