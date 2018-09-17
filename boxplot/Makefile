PLOTVIZ_JS=js/plotviz-data.js js/plotviz-interface.js js/plotviz-render.js js/plotviz-testData.js js/plotviz.js js/plotviz-Plot.js

all: vendor/jsmin dist/plotviz-all.unlicensed.js
	vendor/jsmin < dist/plotviz-all.unlicensed.js > dist/plotviz-all.unlicensed.min.js
	cat js/license.txt > dist/plotviz-all.licensed.js
	cat dist/plotviz-all.unlicensed.js >> dist/plotviz-all.licensed.js
	cat js/license.txt > dist/plotviz-all.licensed.min.js
	cat dist/plotviz-all.unlicensed.min.js >> dist/plotviz-all.licensed.min.js
	cp dist/plotviz-all.licensed.js dist/plotviz.js
	cp dist/plotviz-all.licensed.min.js dist/plotviz.min.js

vendor/jsmin: tools/JSMin/build/jsmin.o
	gcc tools/JSMin/build/jsmin.o -o vendor/jsmin

tools/JSMin/build/jsmin.o: tools/JSMin/jsmin.c
	mkdir -p tools/JSMin/build
	gcc -c tools/JSMin/jsmin.c -o tools/JSMin/build/jsmin.o

dist/plotviz-all.unlicensed.js: $(PLOTVIZ_JS)
	mkdir -p dist
	cat js/plotviz-data.js              > $@
	cat js/plotviz-interface.js        >> $@
	cat js/plotviz-render.js           >> $@
	cat js/plotviz-testData.js         >> $@
	cat js/plotviz-Plot.js             >> $@
	cat js/plotviz.js                  >> $@
	cat js/plotviz-axisPanel.js        >> $@
	cat js/plotviz-boxWhiskerViewer.js >> $@
	cat js/plotviz-crosshair.js        >> $@
	cat js/plotviz-legend.js           >> $@
	cat js/plotviz-lineViewer.js       >> $@
	cat js/plotviz-filter.js           >> $@
	cat js/plotviz-toolbox.js          >> $@
	cat js/gtex/plotviz-gtex.js        >> $@
	cat js/gtex/plotviz-eqtl.js        >> $@

clean:
	rm -r tools/JSMin/build
	rm vendor/jsmin
	rm dist/plotviz-all.unlicensed.js
	rm dist/plotviz-all.licensed.js
	rm dist/plotviz-all.unlicensed.min.js
	rm dist/plotviz-all.licensed.min.js
	rm dist/plotviz.js
	rm dist/plotviz.min.js
	rmdir dist

