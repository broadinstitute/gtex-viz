/*
Input data structure: a list of data object with the following structure:
[
    {
        group: "group1"
        label: "dataset 1",
        values: [a list of numerical values]
     },
     {
        group: "group1"
        label: "dataset 2",
        values: [a list of numerical values]
     },
     {
        group: "group2"
        label: "dataset 3",
        values: [a list of numerical values]
     }
]
*/

import {extent, median, ascending} from "d3-array";
import {nest} from "d3-collection";
import {scaleBand, scaleLinear} from "d3-scale";
import {area} from "d3-shape";
import {axisBottom, axisLeft} from "d3-axis";

import {kernelDensityEstimator, kernel, kernelBandwidth} from "./kde";

export default class GroupedViolin {
    /**
     * constructor for GroupedViolin
     * @param data {List}: a list of objects with attributes: group: {String}, label: {String}, values: {List} of numerical values
     * @param groupInfo {Dictionary}: metadata of the group, indexed by group ID
     */
    constructor(data, groupInfo = {}){
        this.sanityCheck(data);
        this.data = data;
        this.groupInfo = groupInfo;
    }

    /**
     * render the grouped violin plot
     * @param dom {DOM} the SVG dom object to append the violin plot to
     * @param width {Float}
     * @param height {Float}
     * @param xPadding {Float} padding of the x axis
     * @param bins {Integer} KDE bins
     * @param yDomain {List} the min and max values of the y domain
     * @param zDomain {List} the min and max values of z domain
     * @param yLabel {String}
     */

    render(dom, width=500, height=357, xPadding=0.05, bins=50, yDomain=[-3,3], zDomain=[-1, 1], yLabel="Y axis", showSubX=true, showX=true){
        // Silver ratio: 500/357 =~ 1.4
        // defines the X, subX, Y, Z scales
        if (yDomain===undefined || 0 == yDomain.length){
            let allV = [];
            this.data.forEach((d) => allV = allV.concat(d.values));
            yDomain = extent(allV);
        }

        // re-organized this.data indexed by groups
        this.groups = nest()
            .key((d) => d.group)
            .entries(this.data);

        this.scale = {
            x: scaleBand()
                .rangeRound([0, width])
                .domain(this.groups.map((d) => d.key))
                .padding(xPadding),
            subx: scaleBand()
                .padding(xPadding),
            y: scaleLinear()
                .rangeRound([height, 0])
                .domain(yDomain),
            z: scaleLinear()
                .domain(zDomain)
        };

        this.groups.forEach((g, gIndex) => {
            let group = g.key;
            let entries = g.values;
            let info = this.groupInfo[group];

            if (info !== undefined){
                 // renders group info such as p-value, group name
                // TODO: perhaps group info should not be included in the class, should be written as customization code
                const groupInfoDom = dom.append("g");
                const groupLabels = groupInfoDom.selectAll(".violin-group-label")
                    .data(['pvalue']);
                groupLabels.enter().append("text")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("class", "violin-group-label")
                    .attr("fill", (d) => {
                        // console.log(info['pvalueThreshold']);
                        return d=='pvalue'&&parseFloat(info[d])<=parseFloat(info['pvalueThreshold'])?"orangered":"SlateGray"
                    })
                    .attr("transform", (d, i) => {
                        let x = this.scale.x(group) + this.scale.x.bandwidth()/2;
                        let y = this.scale.y(yDomain[0]) + 35; // todo: avoid hard-coded values
                        return `translate(${x}, ${y})`
                    })
                    .text((d) => `${d}: ${info[d]}`);
            }

            // defines the this.scale.subx based on this.scale.x
            this.scale.subx
                .domain(entries.map((d) => d.label))
                .rangeRound([this.scale.x(group), this.scale.x(group) + this.scale.x.bandwidth()]);

            entries.forEach((entry) => {

                // defines the range for this.scale.z based on this.scale.subx
                this.scale.z.range([this.scale.subx(entry.label), this.scale.subx(entry.label) + this.scale.subx.bandwidth()]);
                let size = entry.values.length;
                if (0 == size) return; // no further rendering
                entry.values = entry.values.sort(ascending);

                // console.log("Bandwidth: " + kernelBandwidth.nrd(entry.values));
                // kernel density estimation
                let vertices = kernelDensityEstimator(
                    kernel.gaussian,
                    this.scale.y.ticks(bins),
                    kernelBandwidth.nrd(entry.values))
                    (entry.values);
                // visual rendering
                let violin = area()
                    .x0((d) => this.scale.z(d[1]))
                    .x1((d) => this.scale.z(-d[1]))
                    .y((d) => this.scale.y(d[0]));

                dom.append("path")
                    .datum(vertices)
                    .attr("d", violin)
                    .style("fill", ()=>{
                        if (entry.color !== undefined) return entry.color;
                        if(gIndex%2 == 0) return "#1595a9";
                        return "#555f66";
                    });

                const med = median(entry.values);
                dom.append("line") // the median line
                    .attr("x1", this.scale.z(-0.25))
                    .attr("x2", this.scale.z(0.25))
                    .attr("y1", this.scale.y(med))
                    .attr("y2", this.scale.y(med))
                    .attr("class", "violin-median");
            });

            // adds the subx axis if there are more than one entries
            var buffer = 5;
            if (entries.length > 1 || showSubX){
                 dom.append("g")
                .attr("class", "violin-sub-axis")
                .attr("transform", `translate(0, ${height + buffer})`)
                .call(axisBottom(this.scale.subx))
            }


        });

        // renders the x axis
        let buffer = showSubX?40:0;
        let xAxis = showX?axisBottom(this.scale.x):axisBottom(this.scale.x).tickFormat("");
        dom.append("g")
            .attr("class", "violin-axis")
            .attr("transform", `translate(0, ${height + buffer})`)
            .call(xAxis) // set tickFormat("") to show tick marks without text labels
            .selectAll("text")
            .style("text-anchor", "start")
            .attr("transform", "rotate(30, -10, 10)");

        // adds the y Axis
        buffer = 5;
        dom.append("g")
            .attr("class", "violin-axis")
            .attr("transform", `translate(-${buffer}, 0)`)
            .call(
                axisLeft(this.scale.y)
                    .tickValues(this.scale.y.ticks(5))
            );

        // adds the text label for the y axis
        dom.append("text")
            .attr("y", -20) // todo: avoid hard-coded value
            .attr("x", -40)
            .attr("class", "violin-axis-label")
            .attr("text-anchor", "start")
            .text(yLabel);

    }

    sanityCheck(data){
        const attr = ["group", "label", "values"];

        data.forEach((d) => {
            attr.forEach((a) => {
                if (d[a] === undefined) throw "GroupedViolin: input data error."
            });
            // if (0 == d.values.length) throw "Violin: Input data error";
        });
    }
}