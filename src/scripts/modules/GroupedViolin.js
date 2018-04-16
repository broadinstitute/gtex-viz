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
    constructor(data, groupInfo){
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

    render(dom, width=500, height=357, xPadding=0.05, bins=50, yDomain=[-3,3], zDomain=[-1, 1], yLabel="Y axis"){
        // Silver ratio: 500/357 =~ 1.4
        // defines the X, subX, Y, Z scales
        if (0 == yDomain.length){
            let allV = [];
            this.data.forEach((d) => allV = allV.concat(d.values));
            yDomain = extent(allV);
        }

        // re-organized this.data indexed by groups
        let groups = nest()
            .key((d) => d.group)
            .entries(this.data);

        let scale = {
            x: scaleBand()
                .rangeRound([0, width])
                .domain(groups.map((d) => d.key))
                .padding(xPadding),
            subx: scaleBand()
                .padding(xPadding),
            y: scaleLinear()
                .rangeRound([height, 0])
                .domain(yDomain),
            z: scaleLinear()
                .domain(zDomain)
        };

        groups.forEach((g, gIndex) => {
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
                        let x = scale.x(group) + scale.x.bandwidth()/2;
                        let y = scale.y(yDomain[0]) + 35; // todo: avoid hard-coded values
                        return `translate(${x}, ${y})`
                    })
                    .text((d) => `${d}: ${info[d]}`);
            }


            // this part is very GTEx customized, perhaps should not be in the GroupViolin.js
            // this is to custom-display the long tissue name
            const names = group.split(" - ");
            const customXlabel = dom.append("g");
            const customLabels = customXlabel.selectAll(".violin-group-label")
                .data(names);
            customLabels.enter().append("text")
                .attr("x", 0)
                .attr("y", 0)
                .attr("class", "violin-group-label")
                .attr("transform", (d, i) => {
                    let x = scale.x(group) + scale.x.bandwidth()/2;
                    let y = scale.y(yDomain[0]) + 55 + (10*i); // todo: avoid hard-coded values
                    return `translate(${x}, ${y})`
                })
                .text((d) => d);


            // defines the scale.subx based on scale.x
            scale.subx
                .domain(entries.map((d) => d.label))
                .rangeRound([scale.x(group), scale.x(group) + scale.x.bandwidth()]);

            entries.forEach((entry) => {

                // defines the range for scale.z based on scale.subx
                scale.z.range([scale.subx(entry.label), scale.subx(entry.label) + scale.subx.bandwidth()]);
                let size = entry.values.length;
                if (0 == size) return; // no further rendering
                entry.values = entry.values.sort(ascending);

                // console.log("Bandwidth: " + kernelBandwidth.nrd(entry.values));
                // kernel density estimation
                let vertices = kernelDensityEstimator(
                    kernel.gaussian,
                    scale.y.ticks(bins),
                    kernelBandwidth.nrd(entry.values))
                    (entry.values);
                // visual rendering
                let violin = area()
                    .x0((d) => scale.z(d[1]))
                    .x1((d) => scale.z(-d[1]))
                    .y((d) => scale.y(d[0]));

                dom.append("path")
                    .datum(vertices)
                    .attr("class", function(){
                        if (gIndex%2 == 0) return "gtex-violin-even";
                        return "gtex-violin-odd";
                    })
                    .attr("d", violin);

                const med = median(entry.values);
                dom.append("line") // the median line
                    .attr("x1", scale.z(-0.25))
                    .attr("x2", scale.z(0.25))
                    .attr("y1", scale.y(med))
                    .attr("y2", scale.y(med))
                    .attr("class", "gtex-violin-median");
            });

            // adds the subx axis
            var buffer = 5;
             dom.append("g")
            .attr("class", "violin-sub-axis")
            .attr("transform", `translate(0, ${height + buffer})`)
            .call(axisBottom(scale.subx))

        });

        // renders the x axis
        let buffer = 40;
        dom.append("g")
            .attr("class", "violin-axis")
            .attr("transform", `translate(0, ${height + buffer})`)
            .call(axisBottom(scale.x).tickFormat("")); // set tickFormat("") to show tick marks without text labels

        // adds the y Axis
        buffer = 5;
        dom.append("g")
            .attr("class", "violin-axis")
            .attr("transform", `translate(-${buffer}, 0)`)
            .call(
                axisLeft(scale.y)
                    .tickValues(scale.y.ticks(5))
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