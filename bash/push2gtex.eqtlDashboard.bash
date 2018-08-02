HOME=/Users/khhuang/Sites
HOME=/var/www/html
SOURCE=$HOME/gtex-d3
DEST=$HOME/gtex-cloud/contexts/external/gtex/media/eqtlDashboard

export NODE_ENV="prod"
#rollup -c $SOURCE/rollup/rollup.eqtl.dashboard.config.js
rollup -c rollup/rollup.eqtl.dashboard.config.js

echo "Copying *.min.js and *.css to $DEST"
cp $SOURCE/build/js/eqtl-dashboard.bundle.min.js $DEST/build
cp $SOURCE/src/css/eqtlDashboard.css $DEST/css
cp $SOURCE/src/css/violin.css $DEST/css
