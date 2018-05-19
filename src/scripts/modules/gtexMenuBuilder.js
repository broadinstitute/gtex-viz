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
                d.id = d.tissueId;
                d.text = d.tissueName;
            });
            tissues.sort((a, b) => {
                if(a.tissueName < b.tissueName) return -1;
                if(a.tissueName > b.tissueName) return 1;
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
 * dependencies: eqtlDashboard.css classes // todo: move related css somewhere else
 * @param groups {Dictionary} of lists of tissues indexed by the group name, this is created by gtexDataParser:parseTissueSites()
 * @param domId {String} <div> ID
 * Dependencies: jQuery, Bootstrap, eqtlDashboard.css
 * todo: add reset and select all options
 */
export function createTissueGroupMenu(groups, domId){
    const mainClass="ed-tissue-main-level";
    const subClass = "ed-tissue-sub-level";
    const lastSiteClass = "last-site";

    // erase everything in domId in case it isn't empty
    select(`#${domId}`).selectAll("*").remove();

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
                                `<input type="checkbox" id="${site.id}"> ` +
                                '<span class="checkmark"></span>' +
                                `<span>${site.name}</span>` +
                                '</label><br/>').appendTo($currentDom);
                if (i == sites.length -1) $siteDom.addClass(lastSiteClass);
            });
        }

        // custom click event for the top-level tissues: toggle the check boxes
        $("#" + gId).click(function(){
            if ($('#' + gId).is(":checked")) {
                // when the group is checked, check all its tissues
                sites.forEach(function (site) {
                    if ("id" == site.id) return;
                    $('#' + site.id).attr('checked', true);
                });
            }
            else {
                // when the group is unchecked, un-check all its tissues
                sites.forEach(function (site) {
                    if ("id" == site.id) return;
                    $('#' + site.id).attr('checked', false);
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
    return queryTissueIds;
}