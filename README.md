
# ![GTEx logo](/images/gtex2.png) 

The GTEx web portal (http://gtexportal.org) develops specialized web-based visualization tools for exploring tissue-specific gene expression and regulation. Currently, in this public repository, we provide the source code of the following tools:

- [GTEx Expression Map](#expression-map)
- [GTEx Transcript Browser](#transcript-browser)
- [GTEx eQTL Dashboard](#eqtl-dashboard)
- [GTEx Gene-eQTL Visualizer](#gene-eqtl-visualizer)

---

### Running demos locally on your computer
#### Prerequisites
* A local copy of this repo.
* Access to the internet, for real-time data retrieval from the GTEx web service and external library dependencies.
* A modern web browser.
#### Launching the demo
In the repo's root directory on your computer, start up the provided simple Python HTTP server, and specify a port (e.g. 8000):

```python python/runServer.py```

Once the HTTP server is running, open the demo home page using the following URL in a web browser: 

```localhost:8000 (or the port of your choice)``` 

---

## <a name="expression-map"></a>GTEx Expression Map
GTEx Expression Map is an interactive heatmap specifically designed for rendering expression data. The GTEx portal uses this tool to report and summarize multi-gene, multi-tissue expression data. 

[Portal Link](https://gtexportal.org/home/multiGeneQueryPage)

![GTEx Expression Map Screen Shot](/images/GTEx-expression-map.png)

---

## <a name="transcript-browser"></a>GTEx Transcript Browser
GTEx Transcript Browser is for exploring expression of individual transcripts of a gene.

[Portal Link](https://gtexportal.org/home/isoformPage)

![GTEx Transcript Browser](/images/GTEx-transcript-browser.png)

---

## <a name="eqtl-dashboard"></a>GTEx eQTL Dashboard
GTEx eQTL Dashboard reports single-tissue eQTLs for a user-provided list of gene-variant pairs and tissues. All eQTL results, including non-significant ones, are visualized in a grid of violin plots grouped horizontally by the gene-variant pairs and aligned vertically by tissues. Each violin plot shows three expression distributions of the genotypes: homozygous reference, heterozygous, and homozygous alternative alleles. 

[Portal Link](https://gtexportal.org/home/eqtlDashboardPage)

![GTEX eQTL Dashboard Screen Shot](/images/GTEx-eQTL-dashboard.png)

---

## <a name="gene-eqtl-visualizer"></a>GTEx Gene-eQTL Visualizer
GTEx Gene-eQTL Visualizer displays single-tissue eQTLs of a gene in a bubble
heatmap--the rows are tissues in alphabetical order, and columns are variants sorted by
genomic location. The color and size of the bubbles are scaled by the normalized effect size (NES) and p-value of the eQTLs. Only tissues with significant eQTLs associated with the query gene are reported and rendered. The pairwise linkage
disequilibrium (LD) values of the variants are also displayed and aligned below the bubble heatmap
columns.

[Portal Link](https://gtexportal.org/home/bubbleHeatmapPage/ACTN3)

![GTEx Gene-eQTL Visualizer Screen Shot](/images/GTEx-gene-eqtl-visualizer.png)

---

### Versioning
For the versions available, see the [tags on this repository](https://github.com/broadinstitute/gtex-viz/tags).

### GTEx Portal Team
- Katherine Huang
- Kane Hadley
- Duyen Nguyen
- Jared Nedzel
- François Aguet
- Kristin Ardlie

### License
This project is licensed under the terms of the BSD 3-clause license - see the [LICENSE.md](LICENSE.md) file for details.

### Acknowledgements
The GTEx portal is supported by NIH contract HHSN268201000029C and U41 grant HG009494-01. We also thank our Pfizer collaborators for contributing to visualization discussions and suggestions. 


