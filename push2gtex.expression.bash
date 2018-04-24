HOME=/Users/khhuang/Sites
SOURCE=$HOME/gtex-d3
DEST=$HOME/gtex-cloud/contexts/external/gtex/media/expressHeatmap

export NODE_ENV="prod"
rollup -c rollup.batch.gene.expression.config.js
rollup -c rollup.isoform.expression.config.js

echo "Copying *.min.js and *.css to $DEST"
cp $SOURCE/build/js/batch-gene-expression.bundle.min.js $DEST/build
cp $SOURCE/build/js/isoform-expression.bundle.min.js $DEST/build
cp $SOURCE/src/css/*.css $DEST/css
