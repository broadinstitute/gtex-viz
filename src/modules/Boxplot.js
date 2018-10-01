/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

import {ascending, median, quantile, extent, min, max} from 'd3-array';
import {select} from 'd3-selection';
import {scaleBand, scaleLinear, scaleLog} from 'd3-scale';
import {axisBottom, axisLeft} from 'd3-axis';

export default class Boxplot {
    constructor(boxplotData, useLog=true){
        this.boxplotData = boxplotData.sort(function(a, b) {
            if (a.label < b.label) return -1;
            else if (a.label > b.label) return 1;
            else return 0;
        });
        this.allVals = [];
        this.boxplotData.forEach(d => {
            d.data.sort(ascending);
            this.allVals = this.allVals.concat(d.data);
            d.q1 = quantile(d.data, 0.25);
            d.median = median(d.data);
            d.q3 = quantile(d.data, 0.75);
            d.iqr = d.q3 - d.q1;
            d.upperBound = max(d.data.filter(x => x <= d.q3 + (1.5 * d.iqr)));
            d.lowerBound = min(d.data.filter(x => x >= d.q1 - (1.5 * d.iqr)));
            d.outliers = d.data.filter(x => x < d.lowerBound || x > d.upperBound);
        });
        this.useLog=useLog;
        this.allVals.sort(ascending);
    }

    render(rootId, plotOptions={}) {
        // plot configs
        let width = plotOptions.width || 1200;
        let height = plotOptions.height || 800;
        let margins = {
            top: plotOptions.marginTop || 10,
            right: plotOptions.marginRight || 70,
            bottom: plotOptions.marginBottom || 150,
            left: plotOptions.marginLeft || 40
        };
        let padding = plotOptions.padding || 2;
        let xAxisFontSize = plotOptions.xAxisFontSize || 11;
        let xAxisLabel = plotOptions.xAxisLabel || '';
        let xAxisLabelFontSize = plotOptions.xAxisLabelFontSize || 11;
        let yAxisFontSize = plotOptions.yAxisFontSize || 10;
        let yAxisLabel = plotOptions.yAxisLabel || '';
        let yAxisLabelFontSize = plotOptions.yAxisLabelFontSize || 11;

        const svg = this._createSvg(rootId, width, height);
        const dom = svg.append('g').attr('id', 'gtex-viz-boxplot');
        let scales = this._setScales(width - (margins.left + margins.right), height - (margins.top + margins.bottom));
        let xAxis = axisBottom(scales.x);
        let yAxis = axisLeft(scales.y);

        // render x-axis
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()/2}, ${height - margins.bottom})`)
            .call(xAxis)
            .attr('text-anchor', 'start')
            .selectAll('text')
            .attr('transform', 'translate(5,1) rotate(45)')
            .attr('font-size', xAxisFontSize);
        // x-axis label
        dom.append('text')
            .attr('transform', `translate(${margins.left + width/2 + scales.x.step()/2}, ${height - xAxisLabelFontSize/2})`)
            .style('text-anchor', 'middle')
            .style('font-size', xAxisLabelFontSize)
            .text(xAxisLabel);

        // render y-axis
        dom.append('g')
            .attr('transform', `translate(${margins.left}, ${margins.top})`)
            .call(yAxis)
            .attr('font-size', yAxisFontSize);
        // y-axis label
        dom.append('text')
            .attr('transform', `translate(${yAxisLabelFontSize}, ${(height - margins.bottom)/2}) rotate(270)`)
            .style('text-anchor', 'middle')
            .style('font-size', yAxisLabelFontSize)
            .text(yAxisLabel);

        // render IQR box
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('rect')
            .data(this.boxplotData)
            .enter()
            .append('rect')
            .attr('x', (d) => scales.x(d.label) - scales.x.step()/2 + padding/2)
            .attr('y', (d) => this.useLog?scales.y(d.q3 + 0.05) : scales.y(d.q3))
            .attr('width', (d) => scales.x.step() - padding)
            .attr('height', (d) => this.useLog?scales.y(d.q1 + 0.05) - scales.y(d.q3 + 0.05) : scales.y(d.q1) - scales.y(d.q3))
            .attr('fill', (d) => `#${d.color}`)
            .attr('stroke', '#aaa');

        // render median
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('line')
            .data(this.boxplotData)
            .enter()
            .append('line')
            .attr('x1', (d) => scales.x(d.label) - scales.x.step()/2 + padding/2)
            .attr('y1', (d) => this.useLog?scales.y(d.median + 0.05) : scales.y(d.median))
            .attr('x2', (d) => scales.x(d.label) + scales.x.step()/2 - padding/2)
            .attr('y2', (d) => this.useLog?scales.y(d.median + 0.05) : scales.y(d.median))
            .attr('stroke', '#000')
            .attr('stroke-width', 2);

        // render high whisker
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('line')
            .data(this.boxplotData)
            .enter()
            .append('line')
            .attr('x1', (d) => scales.x(d.label))
            .attr('y1', (d) => this.useLog?scales.y(d.q3 + 0.05) : scales.y(d.q3))
            .attr('x2', (d) => scales.x(d.label))
            .attr('y2', (d) => this.useLog?scales.y(d.upperBound + 0.05) : scales.y(d.upperBound))
            .attr('stroke', '#aaa');
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('line')
            .data(this.boxplotData)
            .enter()
            .append('line')
            .attr('x1', (d) => scales.x(d.label) - scales.x.step()/4)
            .attr('y1', (d) => this.useLog?scales.y(d.upperBound + 0.05) : scales.y(d.upperBound))
            .attr('x2', (d) => scales.x(d.label) + scales.x.step()/4)
            .attr('y2', (d) => this.useLog?scales.y(d.upperBound + 0.05) : scales.y(d.upperBound))
            .attr('stroke', '#aaa');

        // render low whisker
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('line')
            .data(this.boxplotData)
            .enter()
            .append('line')
            .attr('x1', (d) => scales.x(d.label))
            .attr('y1', (d) => this.useLog?scales.y(d.q1 + 0.05) : scales.y(d.q1))
            .attr('x2', (d) => scales.x(d.label))
            .attr('y2', (d) => this.useLog?scales.y(d.lowerBound + 0.05) : scales.y(d.lowerBound))
            .attr('stroke', '#aaa');
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('line')
            .data(this.boxplotData)
            .enter()
            .append('line')
            .attr('x1', (d) => scales.x(d.label) - scales.x.step()/4)
            .attr('y1', (d) => this.useLog?scales.y(d.lowerBound + 0.05) : scales.y(d.lowerBound))
            .attr('x2', (d) => scales.x(d.label) + scales.x.step()/4)
            .attr('y2', (d) => this.useLog?scales.y(d.lowerBound + 0.05) : scales.y(d.lowerBound))
            .attr('stroke', '#aaa');

        // render outliers
        dom.append('g')
            .attr('transform', `translate(${margins.left + scales.x.step()}, ${margins.top})`)
            .selectAll('g')
            .data(this.boxplotData)
            .enter()
            .append('g')
                .selectAll('circle')
                .data((d) => d.outliers.map((x) => ({'label': d.label, 'val': x})))
                .enter()
                .append('circle')
                .attr('cx', (d) => scales.x(d.label))
                .attr('cy', (d) => this.useLog?scales.y(d.val + 0.05) : scales.y(d.val))
                .attr('r', '2')
                .attr('stroke', '#aaa')
                .attr('fill', 'none');
    }

    _createSvg(rootId, width, height) {
        let svg = select(`#${rootId}`).append('svg')
            .attr('width', width)
            .attr('height', height);
        return svg;
    }

    _setScales(innerWidth, innerHeight) {
        let xScale = scaleBand()
            .domain(this.boxplotData.map(d => d.label))
            .range([0, innerWidth]);

        let yScale;

        if (this.useLog) {
            yScale = scaleLog()
            .domain(extent(this.allVals).map(d => d+0.05)) // +.05 for 0's
            .range([innerHeight, 0]);
        } else {
            yScale = scaleLinear()
            .domain(extent(this.allVals))
            .range([innerHeight, 0]);
        }

        return {
            x: xScale,
            y: yScale
        };
    }
}
