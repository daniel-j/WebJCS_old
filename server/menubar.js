var makeMainMenu = function (navnode, items) {
	var menunode = document.createElement("ul");
	var child1, ul, child2, div, a;
	var i, j;
	var toggle = function (i) {
		if(curMenu === -1) {
			menunode.childNodes[i].childNodes[1].style.display = 'block';
			menunode.childNodes[i].childNodes[0].className = "selected";
			curMenu = i;
		}
		else {
			menunode.childNodes[curMenu].childNodes[1].style.display = 'none';
			menunode.childNodes[curMenu].childNodes[0].className = "";
			curMenu = -1;
		}
	};
	var curMenu = -1;
	var hideMenu = function () {
		if(curMenu !== -1) {
			menunode.childNodes[curMenu].childNodes[1].style.display = 'none';
			menunode.childNodes[curMenu].childNodes[0].className = "";
			curMenu = -1;
		}
	};
	var swapMenu = function (i) {
		if(curMenu !== -1) {
			hideMenu();
			menunode.childNodes[i].childNodes[1].style.display = 'block';
			menunode.childNodes[i].childNodes[0].className = "selected";
			curMenu = i;
		}
	};
	menunode.addEventListener("mousedown", function (e) {
		e.preventDefault();
		return false;
	}, false);
	addEventListener("keydown", function (e) {
		var kc = e.keyCode;
		if(kc === 27 && curMenu!==false) {
			hideMenu();
		}
	}, false);
	for (i=0; i < items.length; i+=1) {
		child1 = document.createElement("li");
		div = document.createElement("div");
		div.innerHTML = items[i].name;
		child1.appendChild(div);
		div.addEventListener("click", (function (i) {
			return function (e) {toggle(i);};
		}(i)), false);
		child1.addEventListener("mouseover", (function (i) {
			return function (e) {swapMenu(i);};
		}(i)), false);
		ul = document.createElement("ul");

		for (j=0; j < items[i].items.length; j+=1) {
			child2 = document.createElement("li");
			if(items[i].items[j] !== undefined) {
				a = document.createElement("a");
				a.innerHTML = items[i].items[j].name;
				if(items[i].items[j].key) {
					a.innerHTML += " <span style=\"float:right;\">"+items[i].items[j].key+"<\/span>";
				}
				if(items[i].items[j].href) {
					a.href = items[i].items[j].href;
				}
				a.target = "_blank";
				if(items[i].items[j].target) {
					a.target = items[i].items[j].target;
				}
				if(items[i].items[j].icon) {
					a.style.background = "url('media/icons/"+items[i].items[j].icon+".png') no-repeat 3px 1px";
				}
				a.addEventListener("click", (function (e, i, j) {
					return function (e) {
						if(items[i].items[j].listItem.className.split(' ').indexOf('disabled') === -1) {
							setTimeout(function () {
								hideMenu();
								if(items[i].items[j].action !== undefined) {
									items[i].items[j].action(e);
								}
							}, 0);
						}
					};
				}(null, i, j)), false);
				if(items[i].items[j].disabled) {
					child2.className = "disabled";
				}
				if(items[i].items[j].id) {
					child2.id = items[i].items[j].id;
				}
				child2.menuItem = items[i].items[j];
				items[i].items[j].listItem = child2;
				child2.appendChild(a);
			}
			else {
				child2.className = "line";
			}
			ul.appendChild(child2);
		}
		child1.appendChild(ul);
		menunode.appendChild(child1);
	}
	navnode.appendChild(menunode);
	document.body.addEventListener("mousedown", function (e) {
		var t = e.target;
		while(t !== document.body) {
			if(t === navnode) {
				return;
			}
			t = t.parentNode;
		}
		hideMenu();
	}, false);
	addEventListener("blur", function (e) {
		hideMenu();
	}, false);
};
