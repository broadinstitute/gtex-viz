
// render the heatmap
const containerId = "chart";
const margin = {
    left: 150,
    top: 150,
    right: 100,
    bottom: 200
};
const dim = {
    width: 1000,
    height: 500
};

const palette = {
    blues: d3.schemeBlues[9],
    gnbu: d3.schemeGnBu[9],
    reds: ["#FFE4DE", "#FFC6BA", "#F7866E", "#d9745e", "#D25C43", "#b6442c", "#9b3a25", "#562015"],
    ygb: ["#FFF09D", "#F0EFB4", "#E2E9A6", "#D3E397", "#BCDCA5", "#A4D4B3", "#8DCDC1", "#87B1A4","#829487", "#7C786A"]

};

const svgConfig = {
        divId: "#" + containerId,
        width: dim.width,
        height: dim.height,
        colors: palette.reds,
        nullColor: "#e6e6e6"
};

const svg = d3.select(svgConfig.divId).append("svg")
    .attr("width", svgConfig.width)
    .attr("height", svgConfig.height)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



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

// parse data
const jsonFile = "genes.median.tpm.json";
const useLog = true;

d3.json(jsonFile, function(error, data){
    data.forEach(function(d){
        d.value = useLog?Math.log10(+d.medianTPM):+d.medianTPM;
        d.x = d.tissueId;
        d.y = d.geneSymbol;
        d.originalValue = d.medianTPM;
    });

    // use d3.nest to group by
    const dataByX = d3.nest()
        .key(function(d){return d.x})
        .entries(data);
    const xList = dataByX.map((d) => d.key);
    const dataByY = d3.nest()
        .key((d) => d.y)
        .entries(data);
    const yList = dataByY.map((d) => d.key);

    // set the scales
    const colorScale = d3.scaleQuantile() // scaleQuantile maps the continuous domain to a discrete range
        .domain([0, svgConfig.colors.length-1, d3.max(data, (d) => d.value)])
        .range(svgConfig.colors);

    const xScale = d3.scaleBand()
        .domain(xList)
        .range([0, svgConfig.width - margin.left - margin.right])
        // .round(true)
        .padding(.05);
    const yScale = d3.scaleBand()
        .domain(yList)
        .range([0, svgConfig.height - margin.top - margin.bottom])
        // .round(true)
        .padding(.05);

    // text labels
    const xLabels = svg.selectAll(".xLabel")
        .data(xList)
        .enter().append("text")
        .text((d) => d.replace(/_/g, " "))
        .attr("x", 0)
        .attr("y", 0)
        .attr("class", (d, i) => `xLabel normal x${i}`)
        .style("text-anchor", "end")
        .attr("transform", (d) => {
            let angle = -60;
            let x = xScale(d) + 10;
            return `translate(${x}, ${yScale.range()[1] + (yScale.bandwidth()/2)}) rotate(${angle})`;
        });
    const yLabels = svg.selectAll(".yLabel")
        .data(yList)
        .enter().append("text")
        .text((d) => d)
        .attr("x", xScale.range()[1] + (xScale.bandwidth()/2))
        .attr("y", (d) => yScale(d) + (yScale.bandwidth()/1.5))
        .attr("class", (d, i) => `yLabel normal y${i}`)
        .style("text-anchor", "start");

    // heatmap cells
    const cells = svg.selectAll(".cell")
        .data(data, (d) => d.value);
    cells.enter().append("rect")
        .attr("row", (d) => `x${xList.indexOf(d.x)}`)
        .attr("col", (d) => `y${yList.indexOf(d.y)}`)
        .attr("x", (d) => xScale(d.x))
        .attr("y", (d) => yScale(d.y))
        .attr("rx", 2)
        .attr('ry', 2)
        .attr("class", (d) => `cell expressmap-bordered`)
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .style("fill", (d) => svgConfig.colors[0])
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .merge(cells)
        .transition()
        .duration(2000)
        .style("fill", (d) => d.originalValue==0?svgConfig.nullColor:colorScale(d.value));




});


