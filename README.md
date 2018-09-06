
![GTEx logo](/images/gtex2.png) 

# GTEx Visualizations tools
The GTEx web portal (http://gtexportal.org) develops custom-built visualization tools for exploring tissue-specific gene expression and regulation data. Here, we share the source code of these web-based interactive tools in this public repository, including visualizations for expression data at gene, transcript, and exon levels, as well as viewers for tissue-specific regulatory effects of genetic variations acting on genes.  

### How to run the visualization demos locally
#### Prerequisites
* Access to the internet for obtaining demo data from the GTEx web services.
* A modern web browser.
#### Demo
In the repo's root directory, start up the simple Python HTTP server included in the repo, and specify a port (e.g. 8000):

```python python/runServer.py```

Once the HTTP server is running, open the demo home page using the following URL in a web browser: 

```localhost:8000 (or the port of your choice)``` 

## GTEx eQTL Dashboard
GTEx eQTL Dashboard reports single-tissue eQTLs for a user-provided list of gene-variant pairs and tissues. All eQTL results, including non-significant ones, are visualized in a grid of violin plots grouped horizontally by the gene-variant pairs and aligned vertically by tissues. Each violin plot shows three expression distributions of the genotypes: homozygous reference, heterozygous, and homozygous alternative alleles. When an eQTL is significant (i.e. smaller than or equal to the gene-specific p-value threshold), its p-value is highlighted in red.

![GTEX eQTL Dashboard Screen Shot](/images/GTEx-eQTL-dashboard.png)

---

##### Versioning
For the versions available, see the [tags on this repository](https://github.com/broadinstitute/gtex-viz/tags).

##### Authors
GTEx portal team.

##### License
This project is licensed under the terms of the BSD 3-clause license - see the [LICENSE.md](LICENSE.md) file for details.

##### Acknowledgements
List all our funding agencies....


