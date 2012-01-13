"use strict";

var contextmenu = (function (global, undefined) {
	var menus = {};
	var currentMenu = false;
	var menuOrigin = [0, 0];
	var currentNode = null;
	var menusContainer = global.document.createElement('div');
	menusContainer.id = 'contextmenuStorage';
	global.document.body.appendChild(menusContainer);
	var that = {};
	
	var hideMenu = function () {
		if(currentMenu !== false) {
			menusContainer.style.display = 'none';
			menus[currentMenu].node.style.display = 'none';
			currentMenu = false;
			menuOrigin = [0, 0];
		}
	};
	
	that.bind = function (node, menuname, precheck) {
		node.addEventListener('contextmenu', function (e) {
			var bounding = node.getBoundingClientRect();
			var xpos = e.pageX;
			var ypos = e.pageY;
			var offx = xpos - bounding.left;
			var offy = ypos - bounding.top;
			if(precheck(offx, offy) !== false) {
				currentMenu = menuname;
				menuOrigin = [offx, offy];
				menusContainer.style.display = 'block';
				menus[menuname].node.style.display = 'block';
				menus[menuname].node.style.left = xpos + "px";
				menus[menuname].node.style.top = ypos + "px";
				currentNode = node;
			}
			e.preventDefault();
			e.returnValue = false;
			return false;
		}, false);
	};
	
	that.create = function (name, structure) {
		if(menus.hasOwnProperty(name)) {
			throw "Error: Contextmenu \""+name+"\" already exists!";
		};
		menus[name] = {};
		var container = global.document.createElement('div');
		var menu = global.document.createElement('ul');
		container.className = 'contextmenu';
		
		var clickItem = function (item) {
			return function (e) {
				if(item.node.className !== 'disabled' && item.onclick) {
					if(item.onclick(menuOrigin[0], menuOrigin[1], currentNode) !== false)
						hideMenu();
				}
			};
		};
		var createRecursive = function (tree, parent) {
			var itemTitle, listItem, subList;
			for(var i = 0; i < tree.length; i+=1) {
				listItem = global.document.createElement('li');
				if(tree[i] === undefined) {
					listItem.appendChild(global.document.createElement('hr'));
				}
				else {
					if(tree[i].disabled === true) {
						listItem.className = 'disabled';
					}
					itemTitle = global.document.createElement('div');
					itemTitle.textContent = tree[i].title;
					listItem.appendChild(itemTitle);
					if(tree[i].sub !== undefined) {
						itemTitle.style.background = "url(media/icons/arrow_right.png) right center no-repeat";
						subList = global.document.createElement('ul');
						createRecursive(tree[i].sub, subList);
						listItem.appendChild(subList);
					}
					tree[i].node = listItem;
					listItem.addEventListener('click', clickItem(tree[i]), false);
				}
				parent.appendChild(listItem);
			}
		};
		createRecursive(structure, menu);
		container.appendChild(menu);
		menusContainer.appendChild(container);
		menus[name].node = container;
		return structure;
	};
	
	global.document.body.addEventListener("mousedown", function (e) {
		if(currentMenu === false) return;
		var t = e.target;
		while(t !== global.document.body) {
			if(t === menus[currentMenu].node) {
				return;
			}
			t = t.parentNode;
		}
		hideMenu();
	}, false);
	global.addEventListener("keydown", function (e) {
		var kc = e.keyCode;
		if(kc === 27 && currentMenu !== false) {
			hideMenu();
		}
	}, false);
	global.addEventListener("blur", function (e) {
		hideMenu();
	}, false);
	
	return that;
	
})(this);

