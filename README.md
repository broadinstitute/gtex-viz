# GTEx Visualizations 

## Versioning
For the versions available, see the [tags on this repository](https://github.com/broadinstitute/gtex-viz/tags).

## Authors
GTEx portal team.

## License
This project is licensed under the terms of the BSD 3-clause license - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgements
* Funding agencies?

## Visualization tools
### Running the demo locally
#### Prerequisites
* Access to the internet for obtaining demo data from the GTEx web services.
* A modern web browser.
#### Demo
- In the repo's root directory, start up the Python HTTP server and specify a port (e.g. 8000):

```python python/runServer.py```

Then, in a web browser, provide the following URL: 

```localhost:8000 (or the port of your choice)``` 

## rollup
- For production mode: set NODE_ENV to prod:
```export NODE_ENV="prod"```

- Batch Gene Heatmap:
```rollup -c rollup/rollup.batch.gene.expression.config.js```



