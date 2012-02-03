// ==UserScript==
// @name        Youtube: Show Ratings
// @description Show video ratings on Youtube
// @namespace   kole@userscripts.org
// @homepageURL https://userscripts.org/scripts/show/113918
// @version     1.2.4
// @updateURL   https://userscripts.org/scripts/source/113918.meta.js
// @include     http://*youtube.com/*
// ==/UserScript==

// MAIN SCRIPT ////////////////////////////////////////////////////////////////////////////////////

if (unsafeWindow == window)
{
	unsafeWindow = (function() {
		var el = document.createElement("p");
		el.setAttribute("onclick", "return window;");
		return el.onclick();
	}())
}

var boxes = Array();
var boxesIds = Array();

var wm = document.getElementById("watch-more-related");
if (wm) {
	// On "Load More Suggestions" button click
	wm.addEventListener ('DOMNodeInserted', OnAttrModified, false);
}

showBars();

function OnAttrModified (event) {
	if (typeof event.target.tagName == "undefined") return;

	if (event.target.tagName.toLowerCase() != "li") {
		return;
	}
	
	var newBox = event.target.getElementsByClassName("clip")[0];
	if (!newBox) {
		return;
	}
	
	showRating(newBox);
}

function showRating(box)
{
	boxes.push(box);
		
	// Get all related video ids for each video box
	boxesIds.push(getBoxId(box));
	var skip = checkIfAlreadyExists(box);
	if (!skip)
	{
		// Send a request to fetch videos info from YouTube's API to the background page
		callBackVideoLink(box);
	}
}

function showBars()
{
	// Get all video boxes in which to put the rating bar at the bottom
	var tempBoxes = document.getElementsByClassName("clip");
	for (var i = 0; i < tempBoxes.length; ++i) {
		showRating(tempBoxes[i]);
	}
}

function checkIfAlreadyExists(video_div)
{
	var childDivs = video_div.getElementsByTagName("div");
	for (var i = 0; i < childDivs.length; ++i)
	{
		if (childDivs[i].getAttribute("id") == "ytrp_rating_bar")
		{
			return true;
		}
	}
	return false;
}

// Receive the videos info
function callBackVideoLink(box) { // related videos
	var id = getBoxId(box);
	setTimeout(function() {
		GM_xmlhttpRequest({
			method: 'GET',
			url: "http://gdata.youtube.com/feeds/api/videos/" + id + "?v=2",
			onload: function(response) 
			{
				if (response.status == 200) 
				{
					response.responseXML = new 	DOMParser().parseFromString(response.responseText, "text/xml");
					var entry   = response.responseXML.getElementsByTagName("entry"); //root element of response is entry
					var rating  = entry[0].getElementsByTagName('yt:rating')[0];      // tag name yt:rating holds the ratings
				} 
				else
				{
					return;
				}
				if (rating)
				{
					var num_likes    = parseInt(rating.getAttribute("numLikes"));
					var num_dislikes = parseInt(rating.getAttribute("numDislikes"));

					var i = boxesIds.indexOf(id);
					attachBar(box, num_likes, num_dislikes);
				}
			}
		});
	}, 0);
}

// HELPER FUNCTIONS ///////////////////////////////////////////////////////////////////////////////

// Get all related video ids for each video box
function getBoxId(box)
{
	var anchor;
	var href;
	var params;
	var found;

	try
	{
		if (box.parentNode.parentNode.tagName.toLowerCase() == "a") // Link to video is in parent^2 node (most probable)
		{
			anchor = box.parentNode.parentNode;
		}
		else if (box.parentNode.parentNode.parentNode.tagName.toLowerCase() == "a") // Link to video is in parent^3 node (quite probable)
		{
			anchor = box.parentNode.parentNode.parentNode;
		}
		else if (box.parentNode.tagName.toLowerCase() == "a") // Link to video is in parent node (unlikely)
		{
			anchor = box.parentNode;
		}
		else if (box.tagName.toLowerCase() == "a") // Link to video is in current node (unlikely)
		{
			anchor = box;
		}
		else // Link to video not found
		{
			throw "Link to video not found, insert empty id";
		}
		
		// Extract video id from link
		href = anchor.getAttribute("href");
		params = (href.split("?")[1]).split("&");
		for (var j = 0; j < params.length; j++)
		{
			if (params[j].substr(0, 2).toLowerCase() == "v=")
			{
				return params[j].substr(2);
			}
		}
		
		throw "Link to video not found, insert empty id";
	}
	catch (err)
	{
		return "";
	}

	return "";
}


// Attaches the rating bar to the bottom of the element
function attachBar(videoThumb, likes, dislikes)
{
	while (videoThumb.getAttribute("class").indexOf("video-thumb") == -1)
	{
		videoThumb = videoThumb.parentNode;
	}
	if (videoThumb == null) return;
	
	var total = likes + dislikes;
	var totalWidth = videoThumb.offsetWidth;
	
	if (totalWidth > 0)
	{
		var ratingDiv = document.createElement("div");
		ratingDiv.setAttribute("id", "ytrp_rating_bar");
		ratingDiv.setAttribute("style", "position: absolute; top: 0; left: 0; right: 0; height: 5px; background-color: white;");

		if (total > 0)
		{
			ratingDiv.setAttribute("title", (Math.round((likes / total) * 10000) / 100) + "% likes (" + ts(total) + " ratings)");
			
			var likesWidth = Math.floor((likes / total) * totalWidth);
			var dislikesWidth = Math.ceil((dislikes / total) * totalWidth);
			
			// Keep white spacing between bars
			if (likesWidth > 0 && dislikesWidth > 0)
			{
				if (likesWidth >= dislikesWidth)
				{
					likesWidth -= 1;
				}
				else
				{
					dislikesWidth -= 1;
				}
			}
			
		
			var likesDiv = document.createElement("div");
			likesDiv.setAttribute("style", "position: absolute; top: 0; left: 0; height: 4px; width: " + likesWidth + "px; background: #060;");
			
			
			var dislikesDiv = document.createElement("div");
			dislikesDiv.setAttribute("style", "position: absolute; top: 0; right: 0; height: 4px; width: " + dislikesWidth + "px; background: #C00;");

			ratingDiv.appendChild(likesDiv);
			ratingDiv.appendChild(dislikesDiv);
		}
		else
		{
			ratingDiv.setAttribute("title", "No ratings");
			var noRatingsDiv = document.createElement("div");
			noRatingsDiv.setAttribute("style", "position: absolute; top: 0; left: 0; right: 0; height: 4px;  background: #BBB;");
			
			ratingDiv.appendChild(noRatingsDiv);
		}
		
		videoThumb.style.position = "relative";
		videoThumb.appendChild(ratingDiv);
	}
}

// Formats the number with thousand separators
function ts(v)
{
	var val = v.toString();
	var result = "";
	var len = val.length;
	while (len > 3)
	{
		result = "," + val.substr(len - 3, 3) + result;
		len -= 3;
	}
	return val.substr(0, len) + result;
}
