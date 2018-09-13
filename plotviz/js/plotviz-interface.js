/**
 * Copyright © 2015 - 2018 The Broad Institute, Inc. All rights reserved.
 * Licensed under the BSD 3-clause license (https://github.com/broadinstitute/gtex-viz/blob/master/LICENSE.md)
 */
var plotviz = (function (plotviz) {
    'use strict';



    /* Exposing these functions of convenience to the public. */
/*    plotviz.renderLog10SVG = renderLog10SVG;
    plotviz.renderLinearSVG = renderLinearSVG;
    plotviz.renderAlphabeticalSVG = renderAlphabeticalSVG;
    plotviz.renderMedianIncreaseSVG = renderMedianIncreaseSVG;
    plotviz.renderMedianDecreaseSVG = renderMedianDecreaseSVG;
    plotviz.renderVerticalSVG = renderVerticalSVG;
    plotviz.renderHorizontalSVG = renderHorizontalSVG;
*/

    /**
     * Turns other buttons in the button box off.
     *
     * @param - HTMLElement - buttonBox
     */
    function turnOffSiblingButtons (buttonBox) {
        var i = 0,
            buttons = buttonBox.parentNode.childNodes;

        for (; i < buttons.length; i++) {
            buttons[i].className =
                buttons[i].className.replace
                    (/(?:^|\s)btn-active(?!\S)/g , ' btn-inactive');
        }
    }


    /**
     * Turns on button in the button box.
     *
     * @param - HTMLElement - button
     */
    function turnOnSelfButton (button) {
        button.className =
            button.className.replace
                ( /(?:^|\s)btn-inactive(?!\S)/g , ' btn-active' );
    }


    /**
     * Creates a button with a class, text in the button, and a function to be called when clicked.
     *
     * @param - string - className
     * @param - string - text
     * @param - function - action - Function to be called when clicked.
     * @returns - HTMLElement - button - The created button
     */
    function createButton(className, text, action) {
        var button = document.createElement('div');
        button.className = className;
        button.textContent = text;
        button.onclick = action;
        return button;
    }


    /** Configuration for which buttons should be turned on or off when creating the controlling div. */
    plotviz.interfaceComponentsSVG = {
        scaling: {enabled:true, func:plotviz.createScalingButtonsDivSVG, option:'scale'},
        sorting: {enabled:true, func:plotviz.createSortingButtonsDivSVG, option:'sorting'},
        orientation: {enabled:true, func:plotviz.createOrientationSelectionButtonsDivSVG, option:'orientation'}
    };

    return plotviz;
}) (plotviz || {});
