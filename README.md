# GTEx D3 Repository

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



