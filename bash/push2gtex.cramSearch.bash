HOME=/Users/khhuang/Sites
SOURCE=$HOME/gtex-d3
DEST=$HOME/gtex-cloud/contexts/external/gtex/media/cramSearch

export NODE_ENV="prod"
rollup -c rollup/rollup.cram.file.query.config.js

echo "Copying *.min.js and *.css to $DEST"
cp $SOURCE/build/js/cram-file-query.bundle.min.js $DEST/build
