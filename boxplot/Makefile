PLOTVIZ_JS=js/axisPanel.js js/boxWhiskerViewer.js js/crosshair.js \
js/data.js js/edifice.js js/filter.js js/layoutManager.js js/legend.js \
js/lineViewer.js js/plot.js js/render.js js/test.js js/testData.js \
js/textPanel.js js/toolbox.js js/tooltip.js js/gtex/gtex.js \
js/gtex/gtexBoxplot.js js/gtex/gtexEqtlPlot.js js/gtex/gtexLineplot.js \
js/gtex/gtexMixplot.js

PLOTVIZ_CSS=css/axis.css css/box.css css/filter.css css/tooltip.css css/gtex.css

all: vendor/jsmin dist/plotviz-all.unlicensed.js dist/plotviz-all.css
	vendor/jsmin < dist/plotviz-all.unlicensed.js > dist/plotviz-all.unlicensed.min.js
	cat js/license.txt > dist/plotviz-all.licensed.js
	cat dist/plotviz-all.unlicensed.js >> dist/plotviz-all.licensed.js
	cat js/license.txt > dist/plotviz-all.licensed.min.js
	cat dist/plotviz-all.unlicensed.min.js >> dist/plotviz-all.licensed.min.js
	cp dist/plotviz-all.css dist/plotviz-beta.1.css
	cp dist/plotviz-all.licensed.js dist/plotviz-beta.1.js
	cp dist/plotviz-all.licensed.min.js dist/plotviz-beta.1.min.js

vendor/jsmin: tools/JSMin/build/jsmin.o
	gcc tools/JSMin/build/jsmin.o -o vendor/jsmin

tools/JSMin/build/jsmin.o: tools/JSMin/jsmin.c
	mkdir -p tools/JSMin/build
	gcc -c tools/JSMin/jsmin.c -o tools/JSMin/build/jsmin.o

dist/plotviz-all.unlicensed.js: $(PLOTVIZ_JS)
	mkdir -p dist
	cat js/axisPanel.js >> dist/plotviz-all.unlicensed.js
	cat js/boxWhiskerViewer.js >> dist/plotviz-all.unlicensed.js
	cat js/crosshair.js >> dist/plotviz-all.unlicensed.js
	cat js/data.js >> dist/plotviz-all.unlicensed.js
	cat js/edifice.js >> dist/plotviz-all.unlicensed.js
	cat js/filter.js >> dist/plotviz-all.unlicensed.js
	cat js/layoutManager.js >> dist/plotviz-all.unlicensed.js
	cat js/legend.js >> dist/plotviz-all.unlicensed.js
	cat js/lineViewer.js >> dist/plotviz-all.unlicensed.js
	cat js/plot.js >> dist/plotviz-all.unlicensed.js
	cat js/render.js >> dist/plotviz-all.unlicensed.js
	cat js/test.js >> dist/plotviz-all.unlicensed.js
	cat js/testData.js >> dist/plotviz-all.unlicensed.js
	cat js/textPanel.js >> dist/plotviz-all.unlicensed.js
	cat js/toolbox.js >> dist/plotviz-all.unlicensed.js
	cat js/tooltip.js >> dist/plotviz-all.unlicensed.js
	cat js/gtex/gtexBoxplot.js >> dist/plotviz-all.unlicensed.js
	cat js/gtex/gtexLineplot.js >> dist/plotviz-all.unlicensed.js
	cat js/gtex/gtexMixplot.js >> dist/plotviz-all.unlicensed.js
	cat js/gtex/gtexEqtlPlot.js >> dist/plotviz-all.unlicensed.js
	cat js/gtex/gtex.js >> dist/plotviz-all.unlicensed.js

dist/plotviz-all.css: $(PLOTVIZ_CSS)
	cat css/axis.css >> dist/plotviz-all.css
	cat css/box.css >> dist/plotviz-all.css
	cat css/filter.css >> dist/plotviz-all.css
	cat css/tooltip.css >> dist/plotviz-all.css
	cat css/gtex.css >> dist/plotviz-all.css

clean:
	rm -f tools/JSMin/build/jsmin.o
	rm -f vendor/jsmin
	rm -f dist/plotviz-all.unlicensed.js
	rm -f dist/plotviz-all.licensed.js
	rm -f dist/plotviz-all.unlicensed.min.js
	rm -f dist/plotviz-all.licensed.min.js
	rm -f dist/plotviz-all.css

setup:
	npm install vows

unittest:
	node --harmony test/testScatter.js
