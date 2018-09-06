
![GTEx logo](/images/gtex2.png) 

# GTEx Visualizations tools
The GTEx web portal (http://gtexportal.org) develops custom-built visualization tools for exploring tissue-specific gene expression and regulation data. Here, we share the source code of these web-based interactive tools in this public repository, including visualizations for expression data at gene, transcript, and exon levels, as well as viewers for tissue-specific regulatory effects of genetic variations acting on genes.  

[GTEx eQTL Dashboard](#eqtl-dashboard)

[GTEx Gene-eQTL Visualizer](#gene-eqtl-visualizer)

---

### Running the demos locally on your computer
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

## <a name="eqtl-dashboard"></a>GTEx eQTL Dashboard
GTEx eQTL Dashboard reports single-tissue eQTLs for a user-provided list of gene-variant pairs and tissues. All eQTL results, including non-significant ones, are visualized in a grid of violin plots grouped horizontally by the gene-variant pairs and aligned vertically by tissues. Each violin plot shows three expression distributions of the genotypes: homozygous reference, heterozygous, and homozygous alternative alleles. When an eQTL is significant (i.e. smaller than or equal to the gene-specific p-value threshold), its p-value is highlighted in red.

[Portal Link](https://gtexportal.org/home/eqtlDashboardPage)

![GTEX eQTL Dashboard Screen Shot](/images/GTEx-eQTL-dashboard.png)

---

## <a name="gene-eqtl-visualizer"></a>GTEx Gene-eQTL Visualizer
GTEx Gene-eQTL Visualizer displays the single-tissue eQTLs for a selected gene in a bubble
heatmap. In the heatmap, the rows are tissues in alphabetical order, and the columns are variants sorted by
genomic location. Each eQTL is represented as a circle (bubble), and its color and size are
scaled by the normalized effect size (NES) and p-value, respectively. Only tissues with
significant eQTLs associated with the query gene are reported and rendered. The pairwise linkage
disequilibrium (LD) values of the variants are aligned and displayed below the bubble heatmap
columns.

[Portal Link](https://gtexportal.org/home/bubbleHeatmapPage/ACTN3)

![GTEx Gene-eQTL Visualizer Screen Shot](/images/GTEx-gene-eqtl-visualizer.png)

---

##### Versioning
For the versions available, see the [tags on this repository](https://github.com/broadinstitute/gtex-viz/tags).

##### Developers
Katherine Huang, Duyen Nguyen, Kane Hadley, Jared Nedzel.

##### License
This project is licensed under the terms of the BSD 3-clause license - see the [LICENSE.md](LICENSE.md) file for details.

##### Acknowledgements
The GTEx portal is supported by NIH contract HHSN268201000029C and U41 grant HG009494-01. We thank our Pfizer collaborators for contributing to visualization discussions and suggestions. 


