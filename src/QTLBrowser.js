/**
 * Copyright © 2015 - 2019 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */

//TODO: code review on setting configurations
// TODO: unify QTL tracks' pvalue scale

"use strict";
import {tsv} from "d3-fetch";
import {select} from "d3-selection";
import {max} from "d3-array";
import MiniGenomeBrowser from "./modules/MiniGenomeBrowser.js";
import BubbleMap from "./modules/BubbleMap.js";
import Heatmap from "./modules/Heatmap.js";
import HalfMap from "./modules/HalfMap.js";
import {createSvg} from "./modules/utils";

export function render(geneId, par=CONFIG){
    par.height = Object.keys(par.panels)
        .reduce((total, panelKey, i)=>{
            let p = par.panels[panelKey];
            if (i > 0){
                 // calculate panels' yPos
                p.yPos = total;
            }
            return total + p.height // summing the height
        }, 0);

    let mainSvg = createSvg(par.id, par.width, par.height, {left:0, top:0});
    const promises = ["genes", "eqtls", "sqtls"].map((dType)=>tsv(par.urls[dType]));

    Promise.all(promises)
        .then((args)=> {
            let genes = renderGeneVisualComponents(geneId, mainSvg, args[0], par);
            let queryGene = genes.filter((g)=>g.geneSymbol == geneId)[0];
            console.log(queryGene);
            renderVariantVisualComponents(queryGene, mainSvg, par, args[1], args[2])
        })
        .catch((err)=>{console.error(err)})
}

function renderVariantVisualComponents(queryGene, mainSvg, par=CONFIG, eqData, sqData){ // TODO: separate the variant tracks and bubble map rendering into two functions

    // eQTL position track data
    let eqtlFeatures = eqData.map(par.parsers.qtlFeatures);
    eqtlFeatures.sort(par.dataSort.features);
    let eqtlPanel = par.panels.eqtlTrack;
    eqtlPanel.data = eqtlFeatures;

    // sQTL position track data
    let sqtlFeatures = sqData.map(par.parsers.qtlFeatures);
    sqtlFeatures.sort(par.dataSort.features);
    let sqtlPanel = par.panels.sqtlTrack;
    sqtlPanel.data = sqtlFeatures;

    // QTL bubble map data
    let qtlMapPanel = par.panels.qtlMap;
    qtlMapPanel.data = [];
    qtlMapPanel.data = qtlMapPanel.data.concat(eqData.map((d)=>{return par.parsers.qtlBubbles(d, "eQTL")}));
    qtlMapPanel.data = qtlMapPanel.data.concat(sqData.map((d)=>{return par.parsers.qtlBubbles(d, "sQTL")}));

    // QTL tracks rendering
    ////// find the max color value (-log(p-value)) from all QTLs, for creating a shared color scale for all variant tracks
    const maxColorValue = max(eqtlPanel.data.concat(sqtlPanel.data).filter((d)=>isFinite(d.colorValue)).map((d)=>d.colorValue));
    // console.log(maxColorValue);
    const eqtlTrackViz = renderFeatureTrack(queryGene.geneSymbol, mainSvg, eqtlPanel, true, maxColorValue);
    const sqtlTrackViz = renderFeatureTrack(queryGene.geneSymbol, mainSvg, sqtlPanel, true, maxColorValue);
    let bmap = new BubbleMap(qtlMapPanel.data, qtlMapPanel.useLog, qtlMapPanel.logBase, qtlMapPanel.colorScheme);
    bmap.addTooltip(qtlMapPanel.id);
    let bmapG = mainSvg.append("g")
        .attr("id", qtlMapPanel.id)
        .attr("class", "focus")
        .attr("transform", `translate(${qtlMapPanel.margin.left}, ${qtlMapPanel.margin.top + qtlMapPanel.yPos})`);

    // LD map
    tsv(par.urls.ld)
        .then((data)=>{
            // render bubble map
            let bmapInWidth = qtlMapPanel.width-(qtlMapPanel.margin.left + qtlMapPanel.margin.right);
            let bmapInHeight = qtlMapPanel.height-(qtlMapPanel.margin.top + qtlMapPanel.margin.bottom);
            bmap.drawSvg(bmapG, {w:bmapInWidth, h:bmapInHeight, top: 0, left:0});
            bmap.fullDomain = bmap.xScale.domain();

             //-- TSS and TES markers
            findVariantsNearGeneStartEnd(queryGene, bmap);
            renderGeneStartEndMarkers(bmap, bmapG);

            // LD map
            let variantLookup = {};
            bmap.xScale.domain().forEach((x)=>{variantLookup[x]=true})
            let ldData = data.map(par.parsers.ld)
                .filter((d)=>{
                    return par.dataFilters.ld(d, variantLookup)
                });
            const vList = {};
            ldData.forEach((d)=>{
                vList[d.x] = true;
                vList[d.y] = true;
            });
            let ldConfig = par.ld;
            ldConfig.data = ldData.concat(Object.keys(vList).map((v)=>{
                return {
                    x: v,
                    y: v,
                    value: 1,
                    displayValue: "1"
                }
            }));
            const ldBrush = renderLdMap(ldConfig, bmap);
            // render the chromosome position axis and zoom brush
            const callback = (left, right)=>{
                let focusDomain = bmap.fullDomain.filter((d)=>{
                    let pos = parseInt(d.split("_")[1]);
                    return pos>=left && pos<=right
                });
                bmap.renderWithNewDomain(bmapG, focusDomain);

                // -- gene TSS and TES markers
                renderGeneStartEndMarkers(bmap, bmapG);

                // LD updates
                ldBrush();

            };
            sqtlTrackViz.renderAxis(sqtlPanel.height + 30, true, callback); // TODO: remove hard-coded adjustment
        });

}

function renderLdMap(config, bmap){
    let ldMap = new HalfMap(config.data, config.cutoff, false, undefined, config.colorScheme, [0,1]);
    ldMap.addTooltip(config.id);
    let ldCanvas = select(`#${config.id}`).append("canvas")
        .attr("id", config.id + "-ld-canvas")
        .attr("width", config.width)
        .attr("height", config.width)
        .style("position", "absolute");
    let ldContext = ldCanvas.node().getContext('2d');
    ldContext.translate(config.margin.left, config.margin.top);
    let ldSvg = createSvg(config.id, config.width, config.width, {top: 0, left:0});
    let ldG = ldSvg.append("g")
        .attr("class", "ld")
        .attr("id", "ldG")
        .attr("transform", `translate(${config.margin.left}, ${config.margin.top})`);
    ldMap.drawColorLegend(ldSvg, {x: config.margin.left, y: 100}, 10, "LD");
    ldG.selectAll("*").remove(); // clear all child nodes in ldG before rendering
    const drawConfig = {w: config.width-(config.margin.left+config.margin.right), top: 0, left: 0}
    ldMap.draw(ldCanvas, ldG, drawConfig, [0, 1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain())

    // update the brush event with interactive LD map
    const ldBrush = ()=>{
        ldG.selectAll("*").remove();
        ldMap.draw(ldCanvas, ldG, drawConfig, [0, 1], false, undefined, bmap.xScale.domain(), bmap.xScale.domain())
    };
    return ldBrush;
}

/**
 * Render the visual components related to genes: GWAS trait heatmap, gene position track
 * @param geneId {String} the anchor gene's ID/symbol
 * @param mainSvg {d3 svg} the root svg
 * @param data {List} a list of gene objects with attr: geneSymbol, strand, start, end, geneType
 * @param par {Object} the configuration object of the overall visualization
 */
function renderGeneVisualComponents(geneId, mainSvg, data, par = CONFIG){
    let genes = data.map(par.parsers.genes).filter(par.dataFilters.genes); // genes are filtered by gene types defined in the config object
    genes.sort(par.dataSort.genes);

    par.panels.gwasMap.data = generateRandomMatrix({x:genes.length, y:4, scaleFactor:1}, genes.map((d)=>d.geneSymbol));
    const heatmapViz = renderGwasHeatmap(geneId, mainSvg, par.panels.gwasMap);


    par.panels.tssTrack.data = genes;
    const geneTrackViz = renderFeatureTrack(geneId, mainSvg, par.panels.tssTrack);

    //// draw connecting lines between the GWAS trait heatmap and gene position track
    let gwasMapPanel = par.panels.gwasMap;
    let tssPanel = par.panels.tssTrack;

    let xAdjust = gwasMapPanel.margin.left - tssPanel.margin.left + (heatmapViz.xScale.bandwidth()/2);
    let trackHeight = tssPanel.height - (tssPanel.margin.top + tssPanel.margin.bottom);

    geneTrackViz.svg.selectAll(".connect")
        .data(genes)
        .enter()
        .append('line')
        .attr("class", "connect")
        .attr("x1", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("x2", (d)=>geneTrackViz.scale(d.start))
        .attr("y1", trackHeight/2-20)
        .attr("y2", trackHeight/2)
        .attr("stroke", (d)=>d.geneSymbol==geneId?"red":"#ababab")
        .attr("stroke-width", 0.5);

    geneTrackViz.svg.selectAll(".connect2")
        .data(genes)
        .enter()
        .append('line')
        .attr("class", "connect2")
        .attr("x1", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("x2", (d)=>heatmapViz.xScale(d.geneSymbol) + xAdjust)
        .attr("y1", trackHeight/2-20)
        .attr("y2", (d)=>{
            let adjust = -(gwasMapPanel.margin.bottom+tssPanel.margin.top - 10) +(d.geneSymbol.length*heatmapViz.yScale.bandwidth());
            adjust = adjust > -20?-20:adjust;
            return trackHeight/2 + adjust;
        })
        .attr("stroke", (d)=>d.geneSymbol==geneId?"red":"#ababab")
        .attr("stroke-width", 0.5);

    return genes;
}

/**
 * Rendering the GWAS Heatmap
 * @param geneId {String}
 * @param svg {D3 SVG} the root SVG object
 * @param panel {Object} the panel object defined in CONFIG
 * @returns {Heatmap}
 */
function renderGwasHeatmap(geneId, svg, panel=CONFIG.panels.gwasMap){

    let inWidth = panel.width - (panel.margin.left + panel.margin.right);
    let inHeight = panel.height - (panel.margin.top + panel.margin.bottom);
    if (inWidth * inHeight <= 0) throw "The inner height and width of the GWAS heatmap panel must be positive values. Check the height and margin configuration of this panel"
    let mapG = svg.append("g")
        .attr("id", panel.id)
        .attr("transform", `translate(${panel.margin.left}, ${panel.margin.top})`);
    let tooltipId = `${panel.id}Tooltip`;

    let hViz = new Heatmap(panel.data, false, undefined, panel.colorScheme, panel.cornerRadius, tooltipId);
    hViz.draw(mapG, {w:inWidth, h:inHeight}, panel.columnLabel.angle, false, panel.columnLabel.adjust);
    hViz.drawColorLegend(mapG, {x: 20, y:-20}, 10);

    // CUSTOMIZATION: highlight the anchor gene
    mapG.selectAll(".exp-map-xlabel")
        .attr('fill', (d)=>d==geneId?"red":"#000000");

    hViz.svg = mapG;
    return hViz

}

function renderFeatureTrack(geneId, svg, panel=CONFIG.panels.tssTrack, useColorScale=false, maxColorValue=undefined){
    // preparation for the plot
    let inWidth = panel.width - (panel.margin.left + panel.margin.right);
    let inHeight = panel.height - (panel.margin.top + panel.margin.bottom);
    let trackG = svg.append("g")
        .attr("id", panel.id)
        .attr("transform", `translate(${panel.margin.left}, ${panel.margin.top + panel.yPos})`);

    let featureViz = new MiniGenomeBrowser(panel.data, panel.centerPos);
    featureViz.render(
        trackG,
        inWidth,
        inHeight,
        false,
        panel.showLabels,
        panel.label,
        panel.color.background,
        panel.color.feature,
        useColorScale,
        maxColorValue
    );
    featureViz.svg = trackG;
    return featureViz

}

function generateRandomMatrix(par={x:20, y:20, scaleFactor:1}, cols = []){
    let range = n => Array.from(Array(n).keys());
    let X = cols === undefined?range(par.x):cols; // generates a 1-based list.
    let Y = range(par.y);
    let data = [];
    X.forEach((x)=>{
        x = cols===undefined?'col ' + x.toString():x;
        Y.forEach((y)=>{
            y = 'trait ' + y.toString();
            let v = Math.random()*par.scaleFactor;
            let dataPoint = {
                x: x,
                y: y,
                value: v,
                displayValue: v.toPrecision(3)
            };
            data.push(dataPoint);
        })
    });
    return data;
}

/**
 * Find the closest left-side variant of the gene start and end sites (tss and tes)
 * This function creates two new attributes, tss and tes, for bmap
 * @param gene {Object} that has attributes start and end
 * @param bmap {BubbleMap}
 */
function findVariantsNearGeneStartEnd(gene, bmap) {
    let tss = gene.strand == '+' ? gene.start : gene.end;
    let tes = gene.strand == '+' ? gene.end : gene.start;
    let variants = bmap.fullDomain;
    const findLeftSideNearestNeighborVariant = (site) => {
        return variants.filter((d, i) => {
            // if the variant position is the site position
            let pos = parseFloat(d.split('_')[1]); // assumption: the variant ID has the genomic location
            if (pos === site) return true;

            // else find where the site is located
            // first, get the neighbor variant
            if (variants[i + 1] === undefined) return false;
            let next = parseFloat(variants[i + 1].split('_')[1]) || undefined;
            return (pos - site) * (next - site) < 0; // rationale: the value would be < 0 when the site is located between two variants.
        })
    };

    let tssVariant = findLeftSideNearestNeighborVariant(tss);
    let tesVariant = findLeftSideNearestNeighborVariant(tes);
    bmap.tss = tssVariant[0]; // bmap.tss stores the closest left-side variant of the start site
    bmap.tes = tesVariant[0]; // bmap.tes stores the closest left-side variant of the end site
}

/**
 * Render the TSS and TES of the Gene if applicable
 * @param bmap {BubbleMap}
 * @param bmapSvg {D3} the SVG object of the bubble map
 */
function renderGeneStartEndMarkers(bmap, dom){
    // rendering TSS

    select('#siteMarkers').selectAll("*").remove(); // clear previously rendered markers
    select('#siteMarkers').remove();
    let g = dom.append('g')
        .attr('id', 'siteMarkers');
    if (bmap.tss && bmap.xScale(bmap.tss)){
         g.append('line')
        .attr('x1', bmap.xScale(bmap.tss) + bmap.xScale.bandwidth()/2)
        .attr('x2', bmap.xScale(bmap.tss) + bmap.xScale.bandwidth()/2)
        .attr('y1', 0)
        .attr('y2', bmap.yScale.range()[1])
        .style('stroke', '#94a8b8')
        .style('stroke-width', 2);
         g.append('text')
             .text('TSS')
             .attr('x', bmap.xScale(bmap.tss))
             .attr('y', -5)
             .attr('text-anchor', 'center')
             .style('font-size', "12px")
    }

    if (bmap.tes && bmap.xScale(bmap.tes)){
        g.append('line')
        .attr('x1', bmap.xScale(bmap.tes) + bmap.xScale.bandwidth()/2)
        .attr('x2', bmap.xScale(bmap.tes) + bmap.xScale.bandwidth()/2)
        .attr('y1', 0)
        .attr('y2', bmap.yScale.range()[1])
        .style('stroke', '#748797')
        .style('stroke-width', 2);
        g.append('text')
             .text('TES')
             .attr('x', bmap.xScale(bmap.tes))
             .attr('y', -5)
             .attr('text-anchor', 'center')
             .style('font-size', "12px")
    }

}


const GlobalWidth = window.innerWidth;
const AnchorPosition = 66546395;

const CONFIG = {
    id: "qtl-browser",
    ldId: "ld-browser",
    width: GlobalWidth,
    height: null, // should be dynamically calculated
    urls: {
        genes: "../tempData/ACTN3.neighbor.genes.csv",
        eqtls: "/tempData/ACTN3.eqtls.csv",
        sqtls:  "/tempData/ACTN3.sqtls.csv",
        ld: "/tempData/ACTN3.ld.csv"
    },
    parsers: {
        genes: (d)=>{
            d.start = parseInt(d.start);
            d.end = parseInt(d.end);
            d.pos = parseInt(d.tss);
            d.featureLabel = d.geneSymbol;
            d.featureType = d.geneType;
            return d;
        },
        qtlFeatures: (d)=>{
            // let id = d.variantId;
            d.chr = d.chromosome;
            d.start = parseInt(d.pos);
            d.end = d.start;
            d.pos = parseInt(d.pos);
            d.featureType = "variant";
            d.featureLabel = d.snpId||d.variantId;
            d.strand = "+";
            d.colorValue = -Math.log10(parseFloat(d.pValue));
            return d;
        },
        qtlBubbles: (d, dataType)=>{
            d.x = d.variantId;
            d.y = dataType;
            d.value = parseFloat(d.nes);
            d.r = -Math.log10(parseFloat(d.pValue));
            return d;
        },
        ld: (d)=>{
            d.x = d.snpId1;
            d.y = d.snpId2;
            d.value = parseFloat(d.rSquared);
            d.displayValue = parseFloat(d.value).toPrecision(3)
            return d;
        }
    },
    dataFilters: {
        genes: (d) => {
            return d.featureType == "protein coding" || d.featureType == "lincRNA"
        },
        ld: (d, lookupTable)=>{
            return lookupTable[d.x] && lookupTable[d.y];
        }
    },
    dataSort: {
        features: (a, b) => {
            return parseInt(a.start) - parseInt(b.start)
        }
    },
    panels: {
        gwasMap: {
            id: 'gwas-map',
            data: null,
            useLog: false,
            logBase: null,
            margin: {
                top: 40, // provide enough space for the color legend
                right: 100, // provide enough space for the row labels
                bottom: 100, // provide enough space for the column labels
                left: 80
            },
            width: GlobalWidth,
            height: 180, // outer height: this includes top and bottom margins + inner height
            colorScheme: "Greys",
            cornerRadius: 2,
            columnLabel: {
                angle: 90,
                adjust: 10
            },
            rowLabel: {
                width: 100
            }
        },
        tssTrack: {
            id: 'tss-track',
            label: 'TSS location',
            data: null,
            centerPos: AnchorPosition,
            yPos: null, // where the panel should be placed to be calculated based on the panel layout
            margin: {
                top: 50,
                right: 50,
                bottom: 15,
                left: 80
            },
            width: GlobalWidth,
            height: 100, // outer height=inner height + top margin + bottom margin
            showLabels: false, // whether to show the feature labels
            color: {
                background: "#ffffff",
                feature: "#ababab"
            }
        },

        eqtlTrack: {
            id: 'eqtl-track',
            label: 'ACTN3 eQTLs',
            data: null,
            centerPos: AnchorPosition,
            yPos: null,
            margin: {
                top: 0,
                right: 50,
                bottom: 0,
                left: 80
            },
            width: GlobalWidth,
            height: 20, // outer height. outer height=inner height + top margin + bottom margin.
            showLabels: false,
            color: {
                background: "#ffffff",
                feature: "#ababab"
            }

        },

        sqtlTrack: {
            id: 'sqtl-track',
            label: 'ACTN3 sQTLs',
            data: null,
            centerPos: AnchorPosition,
            yPos: null,
            margin: {
                top: 0,
                right: 50,
                bottom: 0,
                left: 80
            },
            width: GlobalWidth,
            height: 20, // outer height. outer height=inner height + top margin + bottom margin.
            showLabels: false,
            color: {
                background: "#ffffff",
                feature: "#ababab"
            }
        },

        qtlMap: {
            id: 'qtl-map', // the bubble heat map of QTLs
            width: GlobalWidth,
            data: null,
            yPos: null,
            margin: {
                top: 70, // provide space for the genome position scale
                right: 50,
                bottom: 70, // provide space for the column labels
                left: 80
            },
            height: 200,
            colorScheme: "RdBu",
            colorScaleDomain: [-1, 1],
            useLog: false,
            logBase: null,
            label: {
                column: {
                    show: true,
                    angle: 90,
                    adjust: 10,
                    location: 'bottom',
                    textAlign: 'left'
                },
                row: {
                    show: true,
                    width: 150,
                    angle: 0,
                    adjust: 0,
                    location: 'left',
                    textAlign: 'right'
                }
            }
        }
    },
    ld: { // LD configuration is separate from the panels because it's in its own DIV and is rendered using canvas.
        id: "ld-browser",
        data: [],
        cutoff: 0.1,
        width: GlobalWidth,
        margin: {
            top: 10,
            right: 50,
            bottom: 0,
            left: 80
        },
        colorScheme: "Greys"
    }
};

