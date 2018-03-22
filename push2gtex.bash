HOME=/Users/khhuang/Sites
SOURCE=$HOME/expressMap
DEST=$HOME/gtex-cloud/contexts/external/gtex/media/expressHeatmap

export NODE_ENV="prod"
rollup -c rollup.batch.gene.expression.config.js
cp $SOURCE/build/js/batch-gene-expression.bundle.min.js $DEST/build
cp $SOURCE/src/css/*.css $DEST/css
