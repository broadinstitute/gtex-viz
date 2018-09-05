# GTEx Visualizations 

## Versioning
For the versions available, see the [tags on this repository](https://github.com/broadinstitute/gtex-viz/tags).

## Authors
   Katherine Huang  
   François Aguet  
   Kane Hadley  
   Duyen Nguyen  
   Jared Nedzel  
   Kristin Ardlie

## License
This project is licensed under the terms of the BSD 3-clause license - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgements
* Funding agencies?

## GTEx eQTL Dashboard

## To run ExpressMap locally
- You need to have internet access. 
- In the repo's root directory, start the Python HTTP server and specify a port:

```python python/runServer.py```

Then, you will be able to see the demo in a web browser at: 

```localhost:<the port>```

## rollup
- For production mode: set NODE_ENV to prod:
```export NODE_ENV="prod"```

- Batch Gene Heatmap:
```rollup -c rollup/rollup.batch.gene.expression.config.js```



