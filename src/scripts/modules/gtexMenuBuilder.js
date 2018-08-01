"use strict";
import {json} from "d3-fetch";
import {select} from "d3-selection";
import {range} from "d3-array";
import {getGtexUrls, parseTissues} from "./gtexDataParser";

/**
 * Create the tissue (dataset) dropdown menu using select2
 * @param domId {String} the dom ID of the menu
 * @param url {String} the tissue web service url
 * dependency: select2
 */
export function createTissueMenu(domId, url = getGtexUrls().tissue){
    json(url)
        .then(function(results){
            let tissues = parseTissues(results);
            tissues.forEach((d) => {
                d.id = d.tissueSiteDetailId;
                d.text = d.tissueSiteDetail;
            });
            tissues.sort((a, b) => {
                if(a.tissueSiteDetail < b.tissueSiteDetail) return -1;
                if(a.tissueSiteDetail > b.tissueSiteDetail) return 1;
                return 0;
            });

            // external library dependency: select2
            $(`#${domId}`).select2({
                placeholder: 'Select a data set',
                data: tissues
            });

        })
        .catch(function(err){console.error(err)});
}

/**
 * Build the two-level checkbox-style tissue menu
 * dependencies: tissueGroup.css classes
 * @param groups {Dictionary} of lists of tissues indexed by the group name, this is created by gtexDataParser:parseTissueSites()
 * @param domId {String} <div> ID
 * @param forEqtl {Boolean}
 * Dependencies: jQuery, Bootstrap, tissueGroup.css
 * todo: add reset and select all options
 */
export function createTissueGroupMenu(groups, domId, forEqtl=false){
    const mainClass="tissue-group-main-level";
    const subClass = "tissue-group-sub-level";
    const lastSiteClass = "last-site";

    // erase everything in domId in case it isn't empty
    select(`#${domId}`).selectAll("*").remove();

    // add check all and reset options
    const $allTissueDiv = $('<div/>').attr('class', 'col-xs-12 col-md-12').appendTo($(`#${domId}`));
    if (forEqtl){
        $(`<label class=${mainClass}>` +
        '<input type="radio" name="allTissues" value="reset"> Reset ' +
        '</label><br/>').appendTo($allTissueDiv);
    } else {
        $(`<label class=${mainClass}>` +
        '<input type="radio" name="allTissues" value="all"> All </label> ' +
        `<label class=${mainClass}>` +
        '<input type="radio" name="allTissues" value="reset"> Reset ' +
        '</label><br/>').appendTo($allTissueDiv);
    }


    // check all or reset events
    $('input[name="allTissues"]').change(function(){
        let val = $(this).val();
        switch(val){
            case 'all': {
                $('.tissueGroup').prop('checked', true);
                $('.tissueSubGroup').prop('checked', true);
                break;
            }
            case 'reset': {
                $('.tissueGroup').prop('checked', false);
                $('.tissueSubGroup').prop('checked', false);
                break;
            }
            default:
                // do nothing

        }
        // $(this).prop('checked', false);
    });
    // sort the tissue groups alphabetically
    let groupNames = Object.keys(groups).sort();

    // create four <div> sections for the tissue menu
    // TODO: find a better way to organize tissues into sections
    const $sections = range(0,4).map((d)=>{
        return $(`<div id="section${d}" class="col-xs-12 col-md-3">`).appendTo($(`#${domId}`));
    });

    groupNames.forEach(function(gname){
        let sites = groups[gname]; // a list of site objects with attr: name and id
        const gId = gname.replace(/ /g, "_"); // replace the spaces with dashes to create a group <DOM> id
        // figure out which dom section to append this tissue site
        let $currentDom = $sections[3];
        if("Brain" == gname) $currentDom = $sections[0];
        else if (gname.match(/^[A-D]/)) $currentDom = $sections[1];
        else if (gname.match(/^[E-P]/)) $currentDom = $sections[2];

        // create the <label> for the tissue group
        $(`<label class=${mainClass}>`+
            `<input type="checkbox" id="${gId}" class="tissueGroup"> ` +
            '<span class="checkmark"></span>' +
            `<span>${gname}</span>` +
            '</label><br/>').appendTo($currentDom);

        // tissue sites in the group
        if (sites.length > 1){
             // sort sites alphabetically
            sites.sort((a, b)=>{
                if (a.id > b.id) return 1;
                if (a.id < b.id) return -1;
                return 0;
            })
            .forEach(function(site, i){
                let $siteDom = $(`<label class=${subClass}>`+
                                `<input type="checkbox" id="${site.id}" class="tissueSubGroup"> ` +
                                '<span class="checkmark"></span>' +
                                `<span>${site.name}</span>` +
                                '</label><br/>').appendTo($currentDom);
                if (i == sites.length -1) $siteDom.addClass(lastSiteClass);
                $siteDom.click(function(){
                    $('input[name="allTissues"]').prop('checked', false);
                })
            });
        }

        // custom click event for the top-level tissues: toggle the check boxes
        $("#" + gId).click(function(){
            $('input[name="allTissues"]').prop('checked', false);
            if ($('#' + gId).is(":checked")) {
                // when the group is checked, check all its tissues
                sites.forEach(function (site) {
                    if ("id" == site.id) return;
                    $('#' + site.id).prop('checked', true);
                });
            }
            else {
                // when the group is unchecked, un-check all its tissues
                sites.forEach(function (site) {
                    if ("id" == site.id) return;
                    $('#' + site.id).prop('checked', false);
                });
            }
        });
    });

}

/**
 * Parse the two-level checkbox-style tissue menu
 * @param groups {Dictionary} of lists of tissues indexed by the group name, this is created by gtexDataParser:parseTissueSites()
 * @param domId {String} <div> ID
 * Dependencies: jQuery
 */
export function parseTissueGroupMenu(groups, domId){
    let queryTissueIds = [];
    $(`#${domId}`).find(":input").each(function(){ // using jQuery to parse each input item
        if ( $(this).is(":checked")) { // the jQuery way to fetch a checked tissue
            const id = $(this).attr('id');
            if ($(this).hasClass("tissueGroup")){
                // this input item is a tissue group
                // check if this tissue group is a single-site group using the tissueGroups dictionary
                // if so, add the single site to the query list
                let groupName = id.replace(/_/g, " "); // first convert the ID back to group name
                if (groups[groupName].length == 1) {
                    queryTissueIds.push(groups[groupName][0].id);
                }
            }
            else{ // this input item is a tissue site
                queryTissueIds.push(id);
            }
        }
    });
    return queryTissueIds.filter((d)=>d!==undefined);
}
