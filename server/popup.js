'use strict';
var popup = function (global, undefined) {
	var popups = {};
	var currentPopup = false;
	global.addEventListener("keydown", function (e) {
		var kc = e.keyCode;
		if(kc === 27 && currentPopup!==false && popups[currentPopup].options.closable !== false) {
			if(Colorpicker !== undefined && Colorpicker.isOpen()) return;
			that.hide();
		}
	}, false);
	var that = {
		add: function (name, id, callback, options) {
			var node = document.getElementById(id);
			if(!options) options = {};
			popups[name] = {
				node: node,
				callback: callback,
				content: "",
				options: options
			};
			var tmp = node.className.split(" ")
			tmp.push("popup")
			node.className = tmp.join(" ");
			popups[name].content = node.innerHTML;
			
			popups[name].content = node.innerHTML =  "<table cellspacing=0 cellpadding=0 width=100% height=100%><tbody><tr><td align=center><div class=\"wrap\"><div id=\""+node.id+"\">"+popups[name].content+"</div></div></td></tr></tbody></table>";
			node.id = "";
			node.addEventListener("contextmenu", function (e) {
				/*var t = e.target;
				while(t !== node) {
					if(t === node.firstChild) {
						return;
					}
					t = t.parentNode;
				}*/
				if(this.firstChild.firstChild.firstChild.firstChild === e.target) {
					e.preventDefault();
					return false;
				}
				//Popup.hide();
			}, false);
			return {
				open: function () {
					this.open(name);
				}
			};
		},
		open: function (name) {
			if(currentPopup !== false) return;
			//popups[name].node.innerHTML = popups[name].content; // Force redraw
			popups[name].node.style.visibility = 'visible';
			popups[name].node.style.opacity = '1';
			currentPopup = name;
		},
		hide: function (param) {
			if(currentPopup===false) return;
			popups[currentPopup].node.style.opacity = '0';
			popups[currentPopup].node.style.visibility = 'hidden';
			if(param !== undefined && popups[currentPopup].callback !== undefined) {
				popups[currentPopup].callback(param);
			}
			currentPopup = false;
		},
		isOpen: function () {
			return currentPopup !== false;
		}
	};
	return that;
};
