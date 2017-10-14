# ExpressMap: A D3-based Gene Expression Heatmap

## To run ExpressMap locally
- You need to have internet access. 
- In the repo's root directory, start the Python HTTP server:

```python python/runServer.py```

Then, you will be able to see the demo in a web browser at: 

```localhost:8000```

- You can also choose a different host name and port to run the demo:

```python python/runServer.py <hostname:port>```

## Test data 
- GTEx data: The top 100 expressed genes in blood. 
- Pre-computed gene and tissue dendrograms were generated using python/cluster.py.

## UI features
### Toolbar
#### Tissue column sorting options 
- By default, the tissue columns in the heatmap are arranged according to the tissue dendrogram (the leaf nodes). 
- Alternatively, tissues can be sorted alphabetically. The tissue dendrogram is hidden in this view mode.

### Heatmap mouse events
#### Gene label
- **Click** shows the gene's detailed expression boxplot.
- **Alt-Click** adds the gene to the existing boxplot.
#### Cell
- **Mouseover** reports the underlying expression data in the tooltip.

### Dendrogram mouse events
#### Internal node
- **Mouseover** reports the leaf nodes in the tooltip.




