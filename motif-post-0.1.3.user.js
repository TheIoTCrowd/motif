// ==UserScript==
// @name         Moderator Tools Improved for Stack Exchange — Post Tweaks
// @namespace    https://raw.githubusercontent.com/TheIoTCrowd/motif/master/
// @version      0.1.3
// @description  Tweaks to moderator tools for Stack Exchange sites.
// @author       Aurora0001
// @match        https://*.stackexchange.com/questions/*
// @match        https://*.meta.stackexchange.com/questions/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
    .smt-flag-menu {
        box-shadow: 0 2px 4px rgba(36,39,41,0.3);
        background-color: #FFF;
        border: solid 1px #9fa6ad;
        position: absolute;
        z-index: 800;
        display: block;
        width: 600px;
        padding: 12px;
    }
    .smt-flag-menu > * {
        display: inline-block;
    }
    .post-issue-display {
        display: none;
    }
    .extended-br {
        line-height: 200%;
    }
    `);

    $(document).ready(function() {
        $(".post-moderator-link").each(function(i, modLink) {
            // Add timeline link to posts
            const idParts = modLink.id.split("-");
            const id = idParts[idParts.length - 1];
            const timelineLink = document.createElement("a");
            timelineLink.href = "/admin/posts/timeline/" + id;
            timelineLink.innerText = "timeline";
            const postMenu = $(modLink).parent();
            postMenu.append(timelineLink);
        });

        $(".user-info").has(".user-gravatar32 .anonymous-gravatar").each(function(i, userInfo) {
            // Allow easier viewing of deleted users.
            let userDetails = $(userInfo).find(".user-details");
            const userName = userDetails.text().trim();
            if (userName.indexOf("user") !== -1) {
                const uid = userName.substring(4);
                userDetails.html(`<a href="/users/${uid}">${userName}</a>`);
            }
        });
    });

    $(document).ajaxSuccess(function(event, xhr, ajaxOptions) {
        if (ajaxOptions.url.indexOf("/admin/posts/issues") !== -1) {
            // Add 'view flags' link to bottom of posts, move deleted comments link to more convenient place

            // The API call is of form site.stackexchange.com/admin/posts/issues/post1id;post2id;post3id?_=12489012589012
            // We just want post1id;post2id;post3id, and so on.
            let idsRegex = new RegExp(/(;?\d+)+/, "g");
            let postIdList = ajaxOptions.url.match(idsRegex)[0];
            let postIds = postIdList.split(";");
            let postIssues = $(xhr.responseText);
            $(postIssues).find(".post-issue").each(function(i, postIssue) {
                let flaggedLinks = $(postIssue).find(".post-issue-display a[data-shortcut='F']");
                let deletedLinks = $(postIssue).find(".post-issue-display a[data-shortcut='D']");

                if (flaggedLinks.length > 0) {
                    let postMenu = $("#post-moderator-link-"+postIssue.dataset.postid).parent();
                    let flaggedLink = flaggedLinks[0];
                    flaggedLink.style.color = "#B65454";
                    flaggedLink.innerHTML = `<b>${flaggedLink.innerText.trim().split(' ')[0]}</b> flags ▼`;
                    flaggedLink.onclick = function () {
                        if (flaggedLink.innerHTML.indexOf("▼") !== -1) {
                            flaggedLink.innerHTML = flaggedLink.innerHTML.replace("▼", "▲");

                            if ($("#smt-flag-menu-" + postIssue.dataset.postid).length !== 0) {
                                $("#smt-flag-menu-" + postIssue.dataset.postid).show();
                                return;
                            }

                            $.get("/admin/posts/"+postIssue.dataset.postid+"/show-flags", function(data) {
                                var containerDiv = document.createElement("div");
                                containerDiv.id = "smt-flag-menu-" + postIssue.dataset.postid;
                                containerDiv.classList += "smt-flag-menu";

                                $(data).find("tr td:nth-child(3) b").parent().parent().each(function(i, flagRow) {
                                    let flagDate = $(flagRow).children("td:nth-child(1)").text().trim();
                                    let flagger = $(flagRow).children("td:nth-child(2)");
                                    let flagText = $(flagRow).children("td:nth-child(3)").text().trim();
                                    let flagHandler = $(flagRow).children("td:nth-child(5)");
                                    let flagComment = $(flagRow).children("td:nth-child(6)").text().trim();
                                    let flagResult = $(flagRow).children("td:nth-child(7)");
                                    $(containerDiv).append(`<b>${flagText}</b> ${flagComment !== flagText ? "(" + flagComment + ")" : ""} — `);
                                    $(containerDiv).append(flagger);
                                    $(containerDiv).append(" (" + flagDate + ")");
                                    $(containerDiv).append("&nbsp;&nbsp;");
                                    let flagResultIcon = document.createElement("span");
                                    let flagResultText = flagResult.text().trim();
                                    flagResultIcon.classList += "bounty-indicator-tab";
                                    flagResultIcon.style.display = "inline";
                                    if (flagResultText === "Helpful") {
                                        flagResultIcon.style.background = "#5FAD21";
                                    } else if (flagResultText === "Declined") {
                                        flagResultIcon.style.background = "#B65454";
                                    }
                                    $(flagResultIcon).append(flagResultText !== "" ? flagResult : document.createTextNode("Pending"));
                                    $(containerDiv).append(flagResultIcon);
                                    if (flagHandler.text().trim() !== "") {
                                        $(containerDiv).append(" — ");
                                        $(containerDiv).append(flagHandler);
                                    }
                                    $(containerDiv).append('<br class="extended-br" />');
                                });

                                $(postMenu).append(containerDiv);
                            });
                        } else {
                            flaggedLink.innerHTML = flaggedLink.innerHTML.replace("▲", "▼");
                            $("#smt-flag-menu-" + postIssue.dataset.postid).hide();
                        }
                    };

                    flaggedLink.href = "javascript:void(0)";


                    postMenu.append("<br />");
                    postMenu.append(flaggedLink);
                }

                if (deletedLinks.length > 0) {
                    let deletedLink = deletedLinks[0];
                    deletedLink.innerHTML = `(<b>${deletedLink.innerText.trim().split(" ")[0]}</b> deleted)`;
                    deletedLink.classList += " comments-link";
                    deletedLink.style.color = "#B65454";
                    deletedLink.onclick = function() {
                        $(".post-issue[data-postid="+postIssue.dataset.postid+"] .post-issue-display .fetch-deleted-comments")[0].click();
                        deletedLink.style.display = "none";
                    };
                    deletedLink.href = "javascript:void(0)";
                    $("#comments-link-" + postIssue.dataset.postid).append("").append(deletedLink);
                }
            });
        }
    });
})();
