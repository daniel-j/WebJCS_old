"use strict";

window.requestAnimFrame = (function(){
	return window.requestAnimationFrame       ||
	       window.webkitRequestAnimationFrame ||
	       window.mozRequestAnimationFrame    ||
	       window.oRequestAnimationFrame      ||
	       window.msRequestAnimationFrame     ||
	       function(/* function */ callback, /* DOMElement */ element) {
	          window.setTimeout(callback, 1000 / 10);
	       };
})();

if(!window.BlobBuilder) {
	window.BlobBuilder = window.WebKitBlobBuilder || window.MozBlobBuilder;
}

// From http://stackoverflow.com/questions/1359761/sorting-a-json-object-in-javascript
/*function sortObject(o) {
	var sorted = {};
	var key;
	var a = [];
	for (key in o) {
		if (o.hasOwnProperty(key)) {
			a.push(key);
		}
	}
	a.sort(function (a, b) {
		a = a.toLowerCase();
		b = b.toLowerCase();
		if (a < b)
			return -1;
		if (a > b)
			return 1;
		return 0;
	});
	for (key = 0; key < a.length; key+=1) {
		sorted[a[key]] = o[a[key]];
	}
	return sorted;
};*/

var alphaSort = function (a) {
	a.sort(function (a, b) {
		a = a.title;
		b = b.title;
		if (a < b)
			return -1;
		if (a > b)
			return 1;
		return 0;
	});
};

var trimNull = function (str) {
	str = str.replace(/^\0\0*/, '');
	var ws = /\0/;
	var i = str.length;
	while (ws.test(str.charAt(--i)));
	return str.slice(0, i + 1);
};

function cloneObject(obj) {
	var clone = {};
	for(var i in obj) {
		if(obj.hasOwnProperty(i)) {
			if(typeof(obj[i]) === "object")
				clone[i] = cloneObject(obj[i]);
			else
				clone[i] = obj[i];
		}
	}
	return clone;
};

var WebJCS = (function (global, undefined) {
	var fs;
	
	var createCookie = function (name, value, days) {
		if (days) {
			var date = new Date();
			date.setTime(date.getTime()+(days*24*60*60*1000));
			var expires = "; expires="+date.toGMTString();
		}
		else var expires = "";
		global.document.cookie = name+"="+value+expires+"; path=/";
	};
	var readCookie = function (name) {
		var nameEQ = name + "=";
		var ca = global.document.cookie.split(';');
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return '';
	};
	
	var contentSection = global.document.getElementById('content');
	var tilesetdiv = global.document.getElementById('tilesetdiv');
	var layerdiv = global.document.querySelector("#layerdiv");
	var layercanvas = global.document.getElementById("layercanvas");
	var animsdrag = global.document.querySelector("#animsdrag");
	animsdrag.isDragging = false;
	var animsdiv = global.document.querySelector("#animsdiv");
	var animscanvas = global.document.querySelector("#animscanvas");
	var moveAnimUp = global.document.querySelector("#moveAnimUp");
	var moveAnimDown = global.document.querySelector("#moveAnimDown");
	var parallaxdrag = global.document.querySelector("#parallaxdrag");
	parallaxdrag.isDragging = false;
	var parallaxdiv = global.document.querySelector("#parallaxdiv");
	var parallaxcanvas = global.document.querySelector("#parallaxcanvas");
	var parallaxLight = global.document.getElementById('parallaxLight');
	var pxLightOutput = global.document.getElementById('pxLightOutput');
	var pxLightLevel = 100;
	var lightcanvas = global.document.createElement('canvas');
	var lightc = lightcanvas.getContext('2d');
	var chatPanel = global.document.getElementById('chatPanel');
	var chatResizer = global.document.getElementById('chatResizer');
	var chatUserlist = global.document.getElementById('chatUserlist');
	var chatContent = global.document.getElementById('chatContent');
	var chatInput = global.document.getElementById('chatInput');
	var chatSend = global.document.getElementById('chatSend');
	var pingDiv = document.getElementById('ping');
	var pingVal = document.getElementById('pingval');
	var layerbuttons = global.document.querySelector("#layerbuttons");
	var clearLayerButton = global.document.getElementById('clearLayerButton');
	var layerpropertiesbutton = global.document.getElementById('layerpropertiesbutton');
	var layerpropertiesform = global.document.forms['layerpropertiesform'];
	var levelpropertiesform = global.document.forms['levelpropertiesform'];
	var selecteventform = global.document.forms['selecteventform'];
	var animpropertiesform = global.document.forms['animpropertiesform'];
	var tmpHelpStrings;
	var toolbarLayerName = global.document.getElementById('toolbarLayerName');
	var lc = layercanvas.getContext("2d");
	var pxc = parallaxcanvas.getContext("2d");
	var anc = animscanvas.getContext("2d");
	var lightBgColor = localStorage['WebJCS_lightBgColor'] || 'rgb(72, 48, 168)';
	var darkBgColor = localStorage['WebJCS_darkBgColor'] || 'rgb(32, 24, 80)';
	global.document.getElementById('lightBgColorPicker').textContent = lightBgColor;
	global.document.getElementById('darkBgColorPicker').textContent = darkBgColor;
	var fpsSpan = global.document.getElementById('fpsSpan');
	var fps = 0;
	var eventPointers = {
		230: 240,
		/*95: 234,
		246: 234,
		21: 130*/
	};
	var eventPointerCache = [];
	var zoomlevelSpan = global.document.querySelector('#zoomlevel');
	var frameOffset = 0;
	var layernames = ['Foreground layer #2', 'Foreground layer #1', 'Sprite foreground layer', 'Sprite layer', 'Background layer #1', 'Background layer #2', 'Background layer #3', 'Background layer'];
	var fixJ2L = function () {
		selectedTiles = [[{'id': 0, 'animated': false, 'flipped': false, 'event': 0}]];
		selectedSource = 'tileset';
		animSelection =  false;
		J2L = {
			'fileName': 'Untitled.j2l',
			'LEVEL_INFO':
				{
					'JcsHorizontal': 0,
					'SecurityEnvelope1': 0,
					'JcsVertical': 0,
					'SecurityEnvelope2': 0,
					'SecEnvAndLayer': 0,
					'MinimumAmbient': 64,
					'StartingAmbient': 64,
					'AnimsUsed': 0,
					'SplitScreenDivider': 0,
					'IsItMultiplayer': 0,
					'StreamSize': 0,
					'LevelName': 'Untitled',
					'Tileset': '',
					'BonusLevel': '',
					'NextLevel': '',
					'SecretLevel': '',
					'MusicFile': '',
					'HelpString': ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
					'LayerProperties': [0, 0, 0, 0, 0, 0, 0, 3],
					'LayerUnknown1': [0, 0, 0, 0, 0, 0, 0, 0],
					'IsLayerUsed': [0, 0, 0, 1, 0, 0, 0, 0],
					'LayerWidth': [864, 576, 256, 256, 171, 114, 76, 8],
					'JJ2LayerWidth': [864, 576, 256, 256, 171, 114, 76, 8],
					'LayerHeight': [216, 144, 64, 64, 43, 29, 19, 8],
					'LayerUnknown2': [-300, -200, -100, 0, 100, 200, 300, 400],
					'LayerUnknown3': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
					'LayerXSpeed': [3.375, 2.25, 1, 1, 0.6666717529296875, 0.4444580078125, 0.2963104248046875, 0],
					'LayerYSpeed': [3.375, 2.25, 1, 1, 0.6666717529296875, 0.4444580078125, 0.2963104248046875, 0],
					'LayerAutoXSpeed': [0, 0, 0, 0, 0, 0, 0, 0],
					'LayerAutoYSpeed': [0, 0, 0, 0, 0, 0, 0, 0],
					'LayerUnknown4': [0, 0, 0, 0, 0, 0, 0, 0],
					'LayerRGB1': [0, 0, 0],
					'LayerRGB2': [0, 0, 0],
					'LayerRGB3': [0, 0, 0],
					'LayerRGB4': [0, 0, 0],
					'LayerRGB5': [0, 0, 0],
					'LayerRGB6': [0, 0, 0],
					'LayerRGB7': [0, 0, 0],
					'LayerRGB8': [0, 0, 0],
					'StaticTiles': 1024
				},
			'HEADER_INFO':
				{
					'Copyright': 'Jazz Jackrabbit 2 Data File...',
					'Identifier': 'LEVL',
					'PasswordHash': 0,
					'HideLevel': 0,
					'LevelName': 'Untitled',
					'Version': 513,
					'FileSize': 0,
					'CRC32': 0,
					'CSize1': 0,
					'USize1': 0,
					'CSize2': 0,
					'USize2': 0,
					'CSize3': 0,
					'USize3': 0,
					'CSize4': 0,
					'USize4': 0
				},
			'ANIMS': [],
			'MAX_TILES': 1024,
			'isTSF': false,
			'LEVEL': [, , , , , , , ],
			'TilesetProperties':
				{
					'TileEvent': [],
					'TileUnknown1': [],
					'TileType': [],
					'TileUnknown2': []
				}
		};
		J2L.EVENTS = new Uint32Array(J2L.LEVEL_INFO.LayerWidth[3]*J2L.LEVEL_INFO.LayerHeight[3]);
		setTimeout(function () {updateEventPointers();}, 0);
		var l = 8;
		var x, y, w, h;
		for(l=0; l < 8; l+=1) {
			J2L.LEVEL[l] = [];
			w = J2L.LEVEL_INFO.LayerWidth[l];
			h = J2L.LEVEL_INFO.LayerHeight[l];
			for(x=0; x < w; x+=1) {
				J2L.LEVEL[l][x] = [];
				for(y=0; y < h; y+=1) {
					J2L.LEVEL[l][x][y] = {'flipped': false, 'animated': false, 'id': 0};
				}
			}
		}
		var i;
		for(i=0; i < J2L.MAX_TILES; i+=1) {
			J2L.TilesetProperties.TileEvent[i] = 0;
			J2L.TilesetProperties.TileUnknown1[i] = 0;
			J2L.TilesetProperties.TileType[i] = 0;
			J2L.TilesetProperties.TileUnknown2[i] = 0;
		}
		global.document.title = "Jazz Creation Station - "+J2L.LEVEL_INFO.LevelName+" - "+J2L.fileName;
	};
	var J2L;
	var J2T;
	fixJ2L();
	//console.log(J2L);
	
	var currentLayer = 3;
	var changeLayer = function (l) {
		layerbuttons.childNodes[currentLayer].className = '';
		layerbuttons.childNodes[l].className = 'selected';
		currentLayer = l;
		toolbarLayerName.textContent = "Layer "+(l+1)+": "+layernames[l];
		layermenu[0].node.className = layermenu[1].node.className = layermenu[2].node.className = currentLayer === 3 ? '' : 'disabled';
	};
	var scrollbars = 	{
	'layers':
		{
			gripPosition: [0, 0],
			contentSize: [0, 0],
			scrollSize: [0, 0],
			gripSize: [0, 0],
			scroll: [0, 0],
			offset: [0, 0],
			bar: ""
		},
	'anims':
		{
			gripPosition: [0, 0],
			contentSize: [0, 0],
			scrollSize: [0, 0],
			gripSize: [0, 0],
			scroll: [0, 0],
			offset: [0, 0],
			bar: ""
		},
	'tileset':
		{
			gripPosition: [0, 0],
			contentSize: [0, 0],
			scrollSize: [0, 0],
			gripSize: [0, 0],
			scroll: [0, 0],
			offset: [0, 0],
			bar: ""
		}
	};
	var scrollingWhat = "";
	var scrollarrow = new Image(); scrollarrow.src = "media/icons/scroll-arrow.png";
	var unknownTile = new Image(); unknownTile.src = "media/images/unknown-tile.png";
	var mousetarget = null;
	var mousepos = false;
	var mousedownpos = false;
	var mousedownscroll = false;
	var whichmouse = 0;
	var tileSelection = false;
	var animSelection = false;
	var holdingShiftKey = false;
	var holdingCtrlKey = false;
	var holdingFlipKey = false;
	var holdingTileTypeKey = false;
	var isBSelecting = false;
	var BSelectStart = [0, 0];
	var BSelection = [0, 0, 0, 0];
	var holdingBKey = false;
	var windowFocus = true;
	var selectedTiles = [[{'id': 0, 'animated': false, 'flipped': false, 'event': 0}]];
	var selectedSource = 'tileset';
	var selectedEvent = 0;
	var selectEventPos = [0, 0, null];
	var oldEvent = {'id': 0, 'params': []};
	var starttime = 0;
	var selectTileset = global.document.querySelector("#selectTileset");
	var tilesetTypePicker = global.document.querySelector("#tilesetType");
	var tilePositionDiv = global.document.querySelector("#tilePositionDiv");
	var eventInfoSpan = global.document.querySelector("#eventInfoSpan");
	var tilesetTypeSelected = 2;
	var tilesetcanvas = global.document.querySelector("#tilesetcanvas");
	var tilec = tilesetcanvas.getContext('2d');
	var currentTileset = new Image();
	var currentTilesetMask = new Image();
	var zoomin = global.document.querySelector("#zoomin");
	var zoomout = global.document.querySelector("#zoomout");
	var zoomlevel = 1;
	var tilesets = [];
	var tile_url = "", mask_url = "";
	var toggleMask = global.document.querySelector("#toggleMask");
	var toggleEvents = global.document.querySelector("#toggleEvents");
	var toggleParallaxEvents = global.document.querySelector("#toggleParallaxEvents");
	var toggleAnimMask = global.document.querySelector("#toggleAnimMask");
	var showLayerMask = false;
	var showLayerEvents = true;
	var showParallaxEvents = true;
	var showAnimMask = false;
	var diffColors = ["white", "yellow", "red", "#F0F"];
	var JCSini;
	var ANIMS = false;
	var undoStack = [];
	var redoStack = [];
	
	var handleUndoRedo = function (newPart, isRedo) {
		if(socket && socket.readyState === 1) {
			sendUpdate(newPart);
		}
		switch(newPart.what) {
			case 'layer':
				newPart.selection = updateTiles(newPart.layer, newPart.startX, newPart.startY, newPart.width, newPart.height, newPart.selection, newPart.includeEmpty);
				updateEventPointers();
				break;
			case 'event':
				var oldEvt = 0;
				oldEvt = J2L.EVENTS[newPart.x+J2L.LEVEL_INFO.LayerWidth[3]*newPart.y]
				J2L.EVENTS[newPart.x+J2L.LEVEL_INFO.LayerWidth[3]*newPart.y] = newPart.event;
				newPart.event = oldEvt;
				updateEventPointers();
				break;
			default:
				console.log('UNDO/REDO DEBUG:', newPart, undoStack, redoStack);
				break;
		}
	};
	var doUndo = function () {
		if(undoStack.length === 0) return;
		var newPart = undoStack.pop();
		handleUndoRedo(newPart, false);
		redoStack.push(newPart);
		if(undoStack.length === 0) menuUndo.className = 'disabled';
		menuRedo.className = '';
	};
	var doRedo = function () {
		if(redoStack.length === 0) return;
		var newPart = redoStack.pop();
		handleUndoRedo(newPart, true);
		undoStack.push(newPart);
		if(redoStack.length === 0) menuRedo.className = 'disabled';
		menuUndo.className = '';
	};
	var clearUndoHistory = function () {
		menuUndo.className = 'disabled';
		menuRedo.className = 'disabled';
		undoStack = [];
		redoStack = [];
	};
	
	var Popup = popup(global);
	global.hidePopup = Popup.hide; // Can be accessed through buttons etc..
	var menuNewLevel = function () {
		Popup.hide();
		Colorpicker.hide();
		if(confirm("Are you sure you want to create a new level?")) {
			//document.location.reload();
			if(socket && socket.readyState === 1) {
				sendUpdate({what: 'new'});
			}
			else {
				fixJ2L();
				changeTileset(0);
				clearUndoHistory();
			}
		}
	};
	var menuOpenLevel = function () {
		Popup.hide();
		Colorpicker.hide();
		getFileList(function (err, results) {
			if(err) {
				alert('Could not read list of files');
				return;
			}
			global.document.forms['openlevelform'].reset();
			Popup.open('openlevel');
			var levellist = global.document.querySelector("#openlevel #levellist");
			levellist.options.length = 0;
			var i, l = results.length;
			var levels = [];
			for(i=0; i < l; i+=1) {
				if(results[i].substr(-4, 4).toLowerCase() !== '.j2l') {
					continue;
				}
				levels.push(results[i]);
			}
			levels.sort(function (a, b) {
				a = a.toLowerCase();
				b = b.toLowerCase();
				if (a < b)
					return -1;
				if (a > b)
					return 1;
				return 0;
			});
			l = levels.length;
			for(i=0; i < l; i+=1) {
				levellist.add(new Option(levels[i], levels[i]), null);
			}
		});
	};
	makeMainMenu(global.document.getElementById('menubar'), [
		{
			name: 'File',
			items: [
				{name: 'New', action: menuNewLevel, key: 'Alt+N', icon: 'new'},
				{name: 'Open...', action: menuOpenLevel, key: 'Ctrl+O', icon: 'open'},
				,
				{name: 'Save', action: function () {
					writeLevel({save: true});
				}, icon: 'save', disabled: true},
				{name: 'Save As...', action: function () {
					writeLevel({save: true, newfile: true});
				}, key: 'Ctrl+Shift+S', icon: 'saveas'},
				{name: 'Save & Run', action: function () {
					writeLevel({run: true, save: true});
				}, key: 'Ctrl+Shift+R', disabled: true},
				{name: 'Run', action: function () {
					writeLevel({run: true, save: false});
				}, key: 'Ctrl+R', disabled: serverInfo.isCollab}
			]
		},
		{
			name: 'Tools',
			items: [
				{name: 'Undo', action: doUndo, disabled: true, id: 'menuUndo', key: 'Ctrl+Z'},
				{name: 'Redo', action: doRedo, disabled: true, id: 'menuRedo', key: 'Ctrl+Shift+Z'},
				,
				{name: 'Level properties...', action: function () {
					global.document.forms['levelpropertiesform'].reset();
					Popup.open('levelproperties');
					tmpHelpStrings = [];
					for(var i=0; i < 16; i+=1) {
						tmpHelpStrings[i] = J2L.LEVEL_INFO.HelpString[i];
					}
					var lpform = global.document.forms['levelpropertiesform'];
					lpform.leveltitle.value = J2L.LEVEL_INFO.LevelName;
					lpform.nextlevel.value = J2L.LEVEL_INFO.NextLevel;
					lpform.secretlevel.value = J2L.LEVEL_INFO.SecretLevel;
					lpform.bonuslevel.value = J2L.LEVEL_INFO.BonusLevel;
					lpform.musicfile.value = J2L.LEVEL_INFO.MusicFile;
					lpform.minlightslider.value = J2L.LEVEL_INFO.MinimumAmbient/0.64;
					lpform.minlightnumber.value = Math.round(J2L.LEVEL_INFO.MinimumAmbient/0.64);
					lpform.startlightslider.value = J2L.LEVEL_INFO.StartingAmbient/0.64;
					lpform.startlightnumber.value = Math.round(J2L.LEVEL_INFO.StartingAmbient/0.64);
					if(J2L.LEVEL_INFO.SplitScreenDivider > 0)
						lpform.splitscreenradio[1].checked = true;
					if(J2L.LEVEL_INFO.IsItMultiplayer > 0)
						lpform.isMultiplayer.setAttribute('on');
					else
						lpform.isMultiplayer.setAttribute('off');
					if(J2L.HEADER_INFO.HideLevel > 0)
						lpform.hideLevel.setAttribute('on');
					else
						lpform.hideLevel.setAttribute('off');
					helpStringEditor.value = tmpHelpStrings[0].replace(/\@/g, "\n");
					updateHelpStringPreview();
				}},
				{name: 'Level password...', disabled: true},
				,
				{name: 'Settings', action: function () {
					global.document.forms['settingsform'].reset();
					Popup.open('settings');
					var lightBgColorPicker = global.document.querySelector('#lightBgColorPicker');
					var darkBgColorPicker = global.document.querySelector('#darkBgColorPicker');
					lightBgColorPicker.onchange = function (color, cstr) {
						lightBgColor = cstr;
						localStorage['WebJCS_lightBgColor'] = cstr;
						//redraw(0, true);
						requestAnimFrame(function () {redraw(0, true);}, layercanvas);
					};
					lightBgColorPicker.onupdate = function (color, cstr) {
						lightBgColor = cstr;
					};
					lightBgColorPicker.oncancel = function (oldcolor, cstr) {
						lightBgColor = cstr;
					};
					darkBgColorPicker.onchange = function (color, cstr) {
						darkBgColor = cstr;
						localStorage['WebJCS_darkBgColor'] = cstr;
						//redraw(0, true);
						requestAnimFrame(function () {redraw(0, true);}, layercanvas);
					};
					darkBgColorPicker.onupdate = function (color, cstr) {
						darkBgColor = cstr;
					};
					darkBgColorPicker.oncancel = function (oldcolor, cstr) {
						darkBgColor = cstr;
					};
					
					var toggleWordLines = global.document.getElementById('toggleWordLines');
					toggleWordLines.set(localStorage['WebJCS_toggleWordLines'] === '1');
					toggleWordLines.addEventListener('click', function () {
						localStorage['WebJCS_toggleWordLines'] = toggleWordLines.get()? '1' : '0';
					}, false);
					var toggleEventLinks = global.document.getElementById('toggleEventLinks');
					toggleEventLinks.set(localStorage['WebJCS_toggleEventLinks'] !== '0');
					toggleEventLinks.addEventListener('click', function () {
						localStorage['WebJCS_toggleEventLinks'] = toggleEventLinks.get()? '1' : '0';
					}, false);
				}/*, icon: 'HTML5_Performance_16'*/}
			]
		},
		{
			name: 'Help',
			items: [
				{name: 'Howto JCS', href: 'http://ninjadodo.net/htjcs/'},
				{name: 'JcsRef', href: 'http://www.jazz2online.com/jcsref/index.php?&menu=topics'},
				,
				{name: 'About', action: function () {
					Popup.open('about');
				}}
			]
		}
	]);
	var menuUndo = document.getElementById('menuUndo');
	var menuRedo = document.getElementById('menuRedo');
	
	Popup.add('settings', 'settingspopup', function (res) {
		
	});
	Popup.add('openlevel', 'openlevel', function (res) {
		Popup.open('loadinglevel');
		if(res === 1) {
			var openfieldlevel = global.document.querySelector('#openlevel #openfieldlevel');
			if(openfieldlevel.files[0]===undefined) return;
			var handle = openfieldlevel.files[0];
			var fd = new FormData();
			fd.append('level', handle);
			uploadAndParse(fd, function (err, data) {
				var datastr = '';
				Array.prototype.slice.apply(data).forEach(function (v, i, a) {
					datastr += String.fromCharCode(v);
				});
				switch(datastr) {
					case "checksum error":
						alert("Could not load level: Checksum error\nFile is broken");
						Popup.close();
						break;
					
					default:
						if(socket && socket.readyState === 1) {
							/*socket.emit('level', {
								data: datastr,
								filename: handle.name
							});*/
							sendLevel(handle.name, data);
						}
						else {
							loadlevel(data, handle.name);
							clearUndoHistory();
						}
						break;
				}
			});
		}
		else if(res === 2) {
			var levellist = global.document.querySelector('#openlevel #levellist');
			if(levellist.selectedIndex > -1 && levellist.options[levellist.selectedIndex].value !== undefined) {
				var filename = levellist.options[levellist.selectedIndex].value;
				parseFile(filename, function (err, data) {
					var datastr = '';
					Array.prototype.slice.apply(data).forEach(function (v, i, a) {
						datastr += String.fromCharCode(v);
					});
					if(socket && socket.readyState === 1) {
						/*socket.emit('level', {
							data: datastr,
							filename: filename
						});*/
						sendLevel(filename, data);
					}
					else {
						loadlevel(data, filename);
						clearUndoHistory();
					}
				});
			}
		}
	});
	Popup.add('opentileset', 'opentileset', function (res) {
		if(res.files[0]===undefined) return;
		var handle = res.files[0];
		var file;
		var reader;
		for(var i=0; i < res.files.length; i+=1) {
			file = res.files[i];
			if(file.fileName.toLowerCase().substr(-4, 4) === '.j2t') { // Check if it's a .j2t file
				reader = new FileReader();
				reader.onloadend = (function (file) {
					return function (e) { // File content arrived
						if(e.target.readyState !== FileReader.DONE) return;
						var res = this.result;
						if(res.substr(180, 4) === "TILE") { // Is it a tileset?
							var tilesetTitle = trimNull(res.substr(180+4+4, 32)); // Get the title of the tileset
							var v = res.substr(180+4+4+32, 2);
							var buf = new ArrayBuffer(2);
							var uint8 = new Uint8Array(buf);
							var i;
							for(i=0; i < 2; i+=1) {
								uint8[i] = v.charCodeAt(i);
							}
							var ver = new Uint16Array(buf)[0];
							
							fs.root.getFile(file.fileName, {create: true}, function (fileEntry) {
								fileEntry.createWriter(function (fileWriter) {
									fileWriter.write(file);
									var tileset = {'name': file.fileName, 'title': tilesetTitle, 'version': ver};
									for(var i=0; i < tilesets.length; i+=1) {
										if(tilesets[i].name === file.fileName) {
											tilesets[i] = tileset;
											break;
										}
									}
									if(i === tilesets.length) {
										tilesets.push(tileset);
									}
									var si = 0;
									var oldTileset = "" || selectTileset.options[selectTileset.selectedIndex].value;
									alphaSort(tilesets);
									selectTileset.length = 1;
									var opt;
									for(i=0; i < tilesets.length; i+=1) {
										opt = new Option(tilesets[i].title, tilesets[i].name);
										if(tilesets[i].version === 513) {
											opt.className = "TSF";
										}
										selectTileset.add(opt, null);
										if(oldTileset === tilesets[i].name) {
											si = i+1;
										}
									}
									selectTileset.selectedIndex = si;
									selectTileset.disabled = false;
									
									
								}, fileSystemError);
							}, fileSystemError);
						}
					};
				})(file);
				reader.readAsBinaryString(file);
			}
		}
	});
	Popup.add('about', 'about');
	Popup.add('levelproperties', 'levelproperties', function (res) {
		var lpform = levelpropertiesform;
		J2L.LEVEL_INFO.LevelName = J2L.HEADER_INFO.LevelName = lpform.leveltitle.value.substring(0, 32);
		J2L.LEVEL_INFO.NextLevel = lpform.nextlevel.value.substring(0, 32);
		J2L.LEVEL_INFO.SecretLevel = lpform.secretlevel.value.substring(0, 32);
		J2L.LEVEL_INFO.BonusLevel = lpform.bonuslevel.value.substring(0, 32);
		J2L.LEVEL_INFO.MusicFile = lpform.musicfile.value.substring(0, 32);
		J2L.LEVEL_INFO.MinimumAmbient = ~~Math.max((+lpform.minlightslider.value || 100)*0.64, 0);
		J2L.LEVEL_INFO.StartingAmbient = ~~Math.max((+lpform.startlightslider.value || 100)*0.64, 0);
		J2L.LEVEL_INFO.SplitScreenDivider = lpform.splitscreenradio[1].checked? 1 : 0;
		J2L.LEVEL_INFO.IsItMultiplayer = lpform.isMultiplayer.getAttribute('on') !== null;
		J2L.HEADER_INFO.HideLevel = lpform.hideLevel.getAttribute('on') !== null;
		for(var i = 0; i < 16; i+=1) {
			J2L.LEVEL_INFO.HelpString[i] = tmpHelpStrings[i].substring(0, 512);
		}
		global.document.title = "Jazz Creation Station - "+J2L.HEADER_INFO.LevelName+" - "+J2L.fileName;
		
		if(socket && socket.readyState === 1) {
			sendUpdate({
				what: 'levelprop',
				levelName: J2L.LEVEL_INFO.LevelName,
				nextLevel: J2L.LEVEL_INFO.NextLevel,
				secretLevel: J2L.LEVEL_INFO.SecretLevel,
				bonusLevel: J2L.LEVEL_INFO.BonusLevel,
				musicFile: J2L.LEVEL_INFO.MusicFile,
				minLight: J2L.LEVEL_INFO.MinimumAmbient,
				startLight: J2L.LEVEL_INFO.StartingAmbient,
				splitScreen: J2L.LEVEL_INFO.SplitScreenDivider,
				multiPlayer: J2L.LEVEL_INFO.IsItMultiplayer,
				hideLevel: J2L.HEADER_INFO.HideLevel ? 1 : 0,
				helpString: J2L.LEVEL_INFO.HelpString
			});
		}
	});
	Popup.add('loadinglevel', 'loadinglevel', undefined, {closable: false});
	Popup.add('loadingtileset', 'loadingtileset', undefined, {closable: false});
	Popup.add('saving', 'saving', undefined, {closable: false});
	Popup.add('layerproperties', 'layerproperties', function (res) {
		
	});
	Popup.add('animproperties', 'animproperties', function () {
		var animId = Math.round(animpropertiesform.animID.value);
		
		J2L.ANIMS[animId].FPS = Math.round(Math.min(255, animpropertiesform.animSpeedSlider.value));
		J2L.ANIMS[animId].FramesBetweenCycles = Math.round(animpropertiesform.animFrameWait.value);
		J2L.ANIMS[animId].RandomAdder = Math.round(animpropertiesform.animRandomAdder.value);
		J2L.ANIMS[animId].PingPongWait = Math.round(animpropertiesform.animPingPongWait.value);
		J2L.ANIMS[animId].IsItPingPong = animpropertiesform.animPingPong.get()? 1 : 0;
		
		if(socket && socket.readyState === 1) {
			sendUpdate({
				what: 'anims',
				type: 'props',
				anim: animId,
				fps: J2L.ANIMS[animId].FPS,
				frameWait: J2L.ANIMS[animId].FramesBetweenCycles,
				randomAdder: J2L.ANIMS[animId].RandomAdder,
				pingPongWait: J2L.ANIMS[animId].PingPongWait,
				isItPingPong: J2L.ANIMS[animId].IsItPingPong
			});
		}
	});
	
	Popup.add('selectevent', 'selectevent', function () {
		// selectEventPos[x, y, target];
		var x = selectEventPos[0];
		var y = selectEventPos[1];
		updateEvent();
		var evt = createEvent(oldEvent.id, selecteventform.eventType.selectedIndex, selecteventform.illuminate.getAttribute('on') !== null, 0, oldEvent.params);
		var oldEvt = 0;
		if(selectEventPos[2] === layercanvas) {
			oldEvt = J2L.EVENTS[x+J2L.LEVEL_INFO.LayerWidth[3]*y];
			J2L.EVENTS[x+J2L.LEVEL_INFO.LayerWidth[3]*y] = evt;
			updateEventPointers();
		}
		else {
			oldEvt = J2L.TilesetProperties.TileEvent[x+10*y];
			J2L.TilesetProperties.TileEvent[x+10*y] = evt;
		}
		
		if(evt !== oldEvt && selectEventPos[2] === layercanvas) {
			var oldPart = {
				what: 'event',
				event: oldEvt,
				where: 'layer',
				x: x,
				y: y
			};
		
			undoStack.push(oldPart);
			redoStack = [];
		
			menuUndo.className = '';
			menuRedo.className = 'disabled';
		}
		
		if(socket && socket.readyState === 1) {
			sendUpdate({
				what: 'event',
				event: evt,
				where: selectEventPos[2] === layercanvas ? 'layer' : 'tileset',
				x: x,
				y: y
			});
		}
		selectedEvent = evt;
		oldEvent.id = 0;
		oldEvent.params = [];
	});
	
	var selectEventList = global.document.getElementById('eventlist');
	var selectEventFilter = selecteventform.eventfilter;
	var selectEventListType = selecteventform.listtype;
	var selectEventParameters = global.document.getElementById('selecteventparameters');
	
	var createEvent = function (id, difficulty, illumi, unknownbit, parameters) {
		if(selecteventform.generator.getAttribute('on') !== null) {
			id = 216;
		}
		else if(id === 0) {
			return 0;
		}
		
		var paramsamount = Math.min(JCSini.Events[id].length - 5, parameters.length);
		var offset = 0;
		var params = 0;
		var paramArray = [];
		var isSigned = false;
		var bits = 0;
		var pmax = 0, pmin = 0;
		
		for(var i = 0; i < paramsamount; i+=1) {
			bits = JCSini.Events[id][5+i][1];
			isSigned = bits < 0;
			bits = Math.abs(bits);
			if(isSigned) {
				pmax = Math.pow(2, bits-1)-1;
				pmin = -Math.pow(2, bits-1);
			}
			else {
				pmax = Math.pow(2, bits)-1;
				pmin = 0;
			}
			parameters[i] = Math.max(Math.min(parameters[i], pmax), pmin);
			if(isSigned && parameters[i] < 0)
				parameters[i] = + Math.pow(2, bits) + parameters[i];
			params |= parameters[i] << offset;
			offset += bits;
		}
		
		return (id & 255) | ((difficulty & 3) << 8) | ((illumi & 1) << 10) | ((unknownbit & 1) << 11) | ((params) << 12);
	};
	
	var updateEventList = function (oldID) {
		selectEventList.innerHTML = "";
		var container = global.document.createElement('div');
		if(selectEventListType.selectedIndex === 0) {
			var listener = function (id) {
				return function (e) {
					oldEvent.id = id;
					updateEvent();
				};
			};
			var topnode = global.document.createElement('ul');
			var oldEventNode = null;
			topnode.className = "tree";
			var counter = 0;
			var recursive = function (subtree, parent) {
				var listItem;
				subtree.sort(function (a, b) {
					if(typeof a === 'object') {
						var c = a[0];
					}
					else {
						var c = JCSini.Events[a][0];
					}
					if(typeof b === 'object') {
						var d = b[0];
					}
					else {
						var d = JCSini.Events[b][0];
					}
					if (c < d)
						return -1;
					if (c > d)
						return 1;
					return 0;
				});
				for(var i=0, l = subtree.length; i < l; i+=1) {
					listItem = global.document.createElement('li');
					if(typeof subtree[i] === 'object' && subtree[i].length > 0) {
						var label = global.document.createElement('label')
						label.textContent = subtree[i][0];
						var id = 'selectEventTree_'+(counter++);
						label.setAttribute('for', id);
						listItem.appendChild(label);
						var checkbox = global.document.createElement('input');
						checkbox.type = 'checkbox';
						checkbox.id = id;
						listItem.appendChild(checkbox);
						var subnode = global.document.createElement('ul');
						listItem.appendChild(subnode);
						recursive(subtree[i].slice(1, subtree[i].length), subnode);
					}
					else {
						listItem.className = 'item';
						var label = global.document.createElement('label');
						var radio = global.document.createElement('input');
						var id = 'selectEventTree_radio_'+subtree[i];
						radio.type = 'radio';
						radio.name = "selectEventTree_radio";
						radio.id = id;
						radio.addEventListener('change', listener(subtree[i]), false);
						if(subtree[i] === oldID) {
							oldEventNode = radio;
						}
						label.setAttribute('for', id);
						if(subtree[i] === 'MCE') {
						
						}
						else {
							var eventname = JCSini.Events[subtree[i]][0];
							if(eventname.toLowerCase().indexOf(selectEventFilter.value.toLowerCase().trim()) === -1) continue;
							label.innerHTML = eventname + " <span style=\"color: rgba(0, 0, 0, 0.15);\">("+subtree[i]+")</span>";
							listItem.appendChild(radio);
							listItem.appendChild(label);
						}
					}
					parent.appendChild(listItem);
				}
			};
			recursive(eventTree, topnode);
			var spaceAbove = 0;
			if(oldEventNode) {
				oldEventNode.checked = true;
				var stepCategory = oldEventNode;
				while(stepCategory && stepCategory !== topnode) {
					spaceAbove += stepCategory.offsetTop || 0;
					stepCategory = stepCategory.parentNode;
					if(stepCategory && stepCategory.childNodes[1] && stepCategory.childNodes[1].nodeName.toLowerCase() === 'input') {
						stepCategory.childNodes[1].checked = true;
					}
				}
			}
			container.className = 'eventtree';
			container.appendChild(topnode);
		}
		else {
			var isAlpha = selectEventListType.selectedIndex === 1;
			var topnode = global.document.createElement('select');
			topnode.size = 2;
			var eventlist = JCSini.Events.slice(0); // Make a copy
			if(isAlpha) {
				eventlist.sort(function (a, b) {
					if(a[0] === b[0]) return 0;
					else if(a[0] < b[0]) return -1;
					else return 1;
				});
			}
			var si = -1;
			var len = 0;
			var option;
			for(var i=0; i < 256; i+=1) {
				if(eventlist[i][0].toLowerCase().indexOf(selectEventFilter.value.toLowerCase().trim()) === -1) continue;
				option = new Option(eventlist[i][0]+" ("+eventlist[i].id+")", eventlist[i].id);
				topnode.add(option, null);
				if(eventlist[i].id === oldID) {
					si = len;
				}
				len+=1;
			}
			topnode.selectedIndex = si;
			var selectScroll = si > -1
			
			var listchange = function () {
				if(this.selectedIndex > -1) {
					oldEvent.id = this.options[this.selectedIndex].value;
					updateEvent();
				}
			};
			topnode.addEventListener('change', listchange, false);
			topnode.addEventListener('keyup', listchange, false);
			container.className = 'eventselect';
			container.appendChild(topnode);
		}
		selectEventList.appendChild(container);
		if(oldEventNode && oldEventNode.parentNode) {
			oldEventNode.parentNode.scrollIntoView(false);
		}
		if(selectScroll) {
			topnode.scrollTop = (si+1)*(topnode.scrollHeight / topnode.options.length) - topnode.offsetHeight/2;
		}
	};
	selectEventFilter.addEventListener('input', function (e) {
		updateEventList(oldEvent.id);
	}, false);
	(function () {
		var listTypeChange = function (e) {
			localStorage.selectEventListType = this.selectedIndex;
			updateEventList(oldEvent.id);
		};
		selectEventListType.addEventListener('change', listTypeChange, false);
		selectEventListType.addEventListener('keyup', listTypeChange, false);
	})();
	
	var updateEvent = function (firstOpen) {
		
		var isGenerator = false;
		var id = oldEvent.id;
		if(selecteventform.generator.getAttribute('on') !== null) {
			oldEvent.params[0] = id;
			isGenerator = true;
			id = 216;
		}
		
		var paramsamount = JCSini.Events[id].length - 5;
		oldEvent.params.length = paramsamount;
		var params = oldEvent.params;
		var isSigned = false;
		var bitcount = 0;
		var pmax = 0;
		var pmin = 0;
		var paramHTML = [];
		var oldParams = selectEventParameters.querySelectorAll('input');
		
		for(var i=0; i < paramsamount; i+=1) {
			bitcount = Math.abs(JCSini.Events[id][5+i][1]);
			isSigned = JCSini.Events[id][5+i][1] < 0;
			
			if(isSigned) {
				pmax = Math.pow(2, bitcount-1)-1;
				pmin = -Math.pow(2, bitcount-1);
			}
			else {
				pmax = Math.pow(2, bitcount)-1;
				pmin = 0;
			}
			var oldParam = params[i];
			if(!firstOpen) {
				params[i] = Math.max(Math.min(id === 216 && i === 0 ? params[i] : ((oldParams[oldParams.length-1-i] && +oldParams[oldParams.length-1-i].value)), pmax), pmin);
				if(isNaN(params[i])) params[i] = oldParam;
			}
			if(isNaN(params[i])) params[i] = 0;
			paramHTML.push("<div>"+JCSini.Events[id][5+i][0]+"</div><input type=number value='"+params[i]+"' min='"+pmin+"' max='"+pmax+"' step=1>");
		}
		selectEventParameters.innerHTML = paramHTML.reverse().join("");
		var newParams = selectEventParameters.querySelectorAll('input');
		var paramInput = function (i) {
			return function (e) {
				if(i === 0 && selecteventform.generator.getAttribute('on') !== null) {
					oldEvent.id = +this.value;
				}
			};
		};
		var paramBlur = function (i) {
			return function (e) {
				if(i === 0 && selecteventform.generator.getAttribute('on') !== null) {
					updateEventList(+this.value);
				}
			};
		};
		for(var i=0; i < newParams.length; i+=1) {
			newParams[newParams.length-1-i].addEventListener('input', paramInput(i), false);
			newParams[newParams.length-1-i].addEventListener('blur', paramBlur(i), false);
		}
		
	};
	
	var tileReachable = function (offx, offy, target) {
		if(target === layercanvas) {
			var tilex = Math.floor((offx + scrollbars.layers.scroll[0])/(32*zoomlevel));
			var tiley = Math.floor((offy + scrollbars.layers.scroll[1])/(32*zoomlevel));
			var maxw = J2L.LEVEL_INFO.LayerWidth[currentLayer];
			var maxh = J2L.LEVEL_INFO.LayerHeight[currentLayer];
			var outside = mouseOnScrollbars('layers', layercanvas.offsetWidth, layercanvas.offsetHeight, offx, offy, {which: 3});
		}
		else {
			var tilex = Math.floor(offx/32);
			var tiley = Math.floor((offy + scrollbars.tileset.scroll[1])/32);
			var maxw = 10;
			var maxh = currentTileset.height/32;
			var outside = mouseOnScrollbars('tileset', tilesetcanvas.offsetWidth, tilesetcanvas.offsetHeight, offx, offy, {which: 3});
		}
		if(tilex < 0 || tiley < 0 || tilex >= maxw || tiley >= maxh || outside) {
			return false;
		}
		return [tilex, tiley];
	};
	
	var selectEvent = function (offx, offy, target) {
		var tile = tileReachable(offx, offy, target);
		if(!tile) return false;
		
		
		if((target === layercanvas && currentLayer === 3) || target === tilesetcanvas) {
			selectEventPos = [tile[0], tile[1], target];
			var evt = target === layercanvas ? J2L.EVENTS[tile[0] + J2L.LEVEL_INFO.LayerWidth[3]*tile[1]] : J2L.TilesetProperties.TileEvent[tile[0] + 10*tile[1]];
			var id = evt & 255;
			var isGenerator = false;
			var difficulty = (evt & (Math.pow(2, 10)-1)) >> 8; // bits 10-8 (2)
			var illumi = (evt & (Math.pow(2, 11)-1)) >> 10 // bits 10-11 (1)
			var unknownbit = (evt & (Math.pow(2, 12)-1)) >> 11 // bits 10-11 (1)
			var params = (evt & (Math.pow(2, 32)-1)) >> 12; // bits 12-32 (20)
			var paramsamount = JCSini.Events[id].length - 5;
			var paramoffset = 0;
			var param = 0;
			var paramArray = [];
			for(var i=0; i < paramsamount; i+=1) {
				param = (params & (Math.pow(2, paramoffset+Math.abs(JCSini.Events[id][5+i][1]))-1)) >> paramoffset;
				if(JCSini.Events[id][5+i][1] < 0 && param > Math.pow(2, Math.abs(JCSini.Events[id][5+i][1])-1))
					param -= Math.pow(2, Math.abs(JCSini.Events[id][5+i][1]));
				paramArray.push(param);
				paramoffset += Math.abs(JCSini.Events[id][5+i][1]);
			}
			if(id === 216) {
				id = paramArray[0];
				isGenerator = true;
			}
			Popup.open('selectevent');
			selecteventform.reset();
			
			selectEventListType.selectedIndex = +localStorage.selectEventListType || 0;
			
			if(isGenerator)
				selecteventform.generator.setAttribute('on');
			else
				selecteventform.generator.removeAttribute('on');
			if(illumi)
				selecteventform.illuminate.setAttribute('on');
			else
				selecteventform.illuminate.removeAttribute('on');
			
			selecteventform.eventType.selectedIndex = difficulty;
			
			oldEvent.id = id;
			oldEvent.params = paramArray;
			updateEventList(id);
			updateEvent(true);
			
		}
		else return false;
		
		//alert("Select event is not implemented yet.");
	};
	var grabEvent = function (offx, offy, target) {
		var tile = tileReachable(offx, offy, target);
		if(!tile) return false;
		
		if(target === layercanvas && currentLayer === 3) {
			selectedEvent = J2L.EVENTS[tile[0] + J2L.LEVEL_INFO.LayerWidth[3]*tile[1]];
		}
		else if(target === tilesetcanvas) {
			selectedEvent = J2L.TilesetProperties.TileEvent[tile[0] + 10*tile[1]];
		}
		else return false;
	};
	var pasteEvent = function (offx, offy, target) {
		var tile = tileReachable(offx, offy, target);
		if(!tile) return false;
		
		var oldEvt = 0;
		
		if(target === layercanvas && currentLayer === 3) {
			oldEvt = J2L.EVENTS[tile[0] + J2L.LEVEL_INFO.LayerWidth[3]*tile[1]];
			J2L.EVENTS[tile[0] + J2L.LEVEL_INFO.LayerWidth[3]*tile[1]] = selectedEvent;
			updateEventPointers();
		}
		else if(target === tilesetcanvas) {
			oldEvt = J2L.TilesetProperties.TileEvent[tile[0] + 10*tile[1]];
			J2L.TilesetProperties.TileEvent[tile[0] + 10*tile[1]] = selectedEvent;
		}
		else return false;
		
		if(selectedEvent !== oldEvt && target === layercanvas && currentLayer === 3) {
			var oldPart = {
				what: 'event',
				event: oldEvt,
				where: 'layer',
				x: tile[0],
				y: tile[1]
			};
			
			undoStack.push(oldPart);
			redoStack = [];
			
			menuUndo.className = '';
			menuRedo.className = 'disabled';
		}
		
		if(socket && socket.readyState === 1) {
			sendUpdate({
				what: 'event',
				event: selectedEvent,
				where: target === layercanvas ? 'layer' : 'tileset',
				x: tile[0],
				y: tile[1]
			});
		}
	};
	var changeTileType = function (type) {
		return function (offx, offy, target) {
			var tile = tileReachable(offx, offy, target);
			if(!tile) return false;
			var pos = tile[0] + 10*tile[1];
			if(pos === 0) return;
			J2L.TilesetProperties.TileType[pos] = type;
			if(socket && socket.readyState === 1) {
				sendUpdate({
					what: 'tiletype',
					type: type,
					pos: pos
				});
			}
		};
	};
	
	var tilesetmenu = contextmenu.create('tileset', [
		{title: 'Select event', onclick: selectEvent},
		{title: 'Grab event', onclick: grabEvent},
		{title: 'Paste event', onclick: pasteEvent},
		,
		{title: 'Tile type', sub: [
			{title: 'Normal', onclick: changeTileType(0)},
			{title: 'Translucent', onclick: changeTileType(1)},
			{title: 'Caption', onclick: changeTileType(4)}
		]}
	]);
	var layermenu = contextmenu.create('layer', [
		{title: 'Select event', onclick: selectEvent},
		{title: 'Grab event', onclick: grabEvent},
		{title: 'Paste event', onclick: pasteEvent}
	]);
	
	contextmenu.bind(tilesetcanvas, 'tileset', function (offx, offy) {
		var tile = tileReachable(offx, offy, tilesetcanvas);
		if(!tile) {
			return false;
		}
		else {
			layermenu[0].node.className = layermenu[1].node.className = layermenu[2].node.className = currentLayer === 3 ? '' : 'disabled';
		}
	});
	
	contextmenu.bind(layercanvas, 'layer', function (offx, offy) {
		var tile = tileReachable(offx, offy, layercanvas);
		if(!tile) {
			return false;
		}
		else {
			layermenu[0].node.className = layermenu[1].node.className = layermenu[2].node.className = currentLayer === 3 ? '' : 'disabled';
		}
	});
	
	var helpStringSelect = levelpropertiesform.helpStringSelect;
	var helpStringEditor = levelpropertiesform.helpStringEditor;
	var helpStringPreviewCanvas = global.document.getElementById('helpStringPreviewCanvas');
	var hsc = helpStringPreviewCanvas.getContext('2d');
	var helpStringCharCount = global.document.getElementById('helpStringCharCount');
	
	var updateHelpStringPreview = function (e) {
			if(helpStringEditor.value.length > 512)
				helpStringEditor.value = helpStringEditor.value.substring(0, 512);
			helpStringCharCount.textContent = helpStringEditor.value.length;
			var lines = helpStringEditor.value.replace(/\@/g, "\n").trim().split("\n");
			var w = Math.max(jjFont.width(lines.join("@"), 1), 1);
			
			var h = lines.length*16;
			if(helpStringPreviewCanvas.width !== w)
				helpStringPreviewCanvas.width = w;
			if(helpStringPreviewCanvas.height !== h)
				helpStringPreviewCanvas.height = h;
			hsc.clearRect(0, 0, w, h);
			jjFont.draw(hsc, lines.join("@"), 0, 0, 1, 'left', 0);
		};
	
	(function () { // Prepare
		var sliders = global.document.querySelectorAll('#minlightslider, #startlightslider');
		var finetuning = global.document.querySelectorAll('#minlightnumber, #startlightnumber');
		var sliderChange = function (i) {
			return function (e) {
				finetuning[i].value = Math.round(this.value);
			};
		};
		var tuneBlur = function (i) {
			return function (e) {
				var value = Math.min(Math.max(Math.round(finetuning[i].value*0.64)/0.64, 0), 127);
				finetuning[i].value = Math.round(value);
				sliders[i].value = value;
			};
		};
		for(var i=0; i < sliders.length; i+=1) {
			sliders[i].addEventListener('change', sliderChange(i), false);
			finetuning[i].addEventListener('blur', tuneBlur(i), false);
		}
		animpropertiesform.animSpeedSlider.addEventListener('change', function (e) {
			animpropertiesform.animSpeedInput.value = parseInt(this.value, 10);
		}, false);
		animpropertiesform.animSpeedInput.addEventListener('blur', function (e) {
			animpropertiesform.animSpeedSlider.value = this.value = Math.max(0, Math.round(this.value));
		}, false);
		
		for(i=0; i < 8; i+=1) {
			layerpropertiesform.editlayer.add(new Option((i+1)+": "+layernames[i], i), null);
		}
		
		var oldId = 0;
		var changeHelpStringID = function () {
			var id = helpStringSelect.selectedIndex;
			helpStringEditor.value = tmpHelpStrings[id].replace(/\@/g, "\n");
			updateHelpStringPreview();
			oldId = id;
		};
		
		helpStringSelect.addEventListener('change', changeHelpStringID, false);
		helpStringSelect.addEventListener('keyup', changeHelpStringID, false);
		helpStringEditor.addEventListener('input', updateHelpStringPreview, false);
		helpStringEditor.addEventListener('blur', function (e) {
			tmpHelpStrings[helpStringSelect.selectedIndex] = helpStringEditor.value.replace(/\n/g, "@").substring(0, 512);
		}, false);
		
		var keys = ['#', '§', '|'];
		var hsKeys = global.document.getElementById('helpStringKeys');
		var node;
		var hsKeyClick = function (i) {
			var key = keys[i];
			return function (e) {
				var fullText = helpStringEditor.value;
				var insertPos = helpStringEditor.selectionStart;
				helpStringEditor.value = fullText.substring(0, insertPos) + key + fullText.substring(insertPos, fullText.length);
				helpStringEditor.focus();
				helpStringEditor.selectionStart += 1;
				updateHelpStringPreview();
			};
		};
		for(var i=0; i < keys.length; i+=1) {
			node = global.document.createElement('input');
			node.type = 'button';
			node.value = keys[i];
			node.addEventListener('click', hsKeyClick(i), false);
			hsKeys.appendChild(node);
		}
		
	})();
	
	var trimNull = function (str) {
		var str = str.replace(/^\0\0*/, ''),
			 ws = /\0/,
			 i = str.length;
		while (ws.test(str.charAt(--i)));
		return str.slice(0, i + 1);
	};
	
	var unpackStruct = function (formatCodes, arr) {
		var bufStr = '';
		var byteArray = new Uint8Array(arr);
		for(var i=0, l = byteArray.length; i < l; i+=1) {
			bufStr += String.fromCharCode(byteArray[i]);
		}
		var buffer = new DataView(byteArray.buffer);
		var offset = 0;
		var output = {};
		var part;
		for(var i=0; i < formatCodes.length; i+=1) {
			var len = formatCodes[i][2] === undefined ? 1 : Math.max(1, parseInt(formatCodes[i][2], 10));
			var name = formatCodes[i][1];
			var type = [
				formatCodes[i][0].substring(0, 1),
				parseInt(formatCodes[i][0].substring(1), 10)
			];
			var doArray = len > 1;
			var bufFunc = 'get' + (type[0].toLowerCase()==='u'? 'Ui':'I') + 'nt' + type[1];
			if(doArray) {
				output[name] = [];
			}
			for(var j=0; j < len; j+=1) {
				if(type[0].toLowerCase() === 'c') {
					part = bufStr.substring(offset, offset+type[1]);
					if(type[0] === 'C') {
						part = trimNull(part);
					}
					offset += type[1];
				}
				else if(type[0].toLowerCase() === 'u' || type[0].toLowerCase() === 's') {
					part = buffer[bufFunc](offset, true);
					offset += type[1]/8; // number of bytes, not bits
				}
			
				if(doArray) {
					output[name][j] = part;
				}
				else {
					output[name] = part;
				}
			}
		
		}
		return output;
	};
	var packStruct = function (struct, data) {
		'use strict';
		var binaryData = [];
		var dataCursor = 0;
		struct.forEach(function (type, i) {
			var repeats = 1;
			if(typeof type === 'object') {
				repeats = type[1];
				type = type[0];
			}
			type = [
				type.substring(0, 1),
				parseInt(type.substring(1), 10)
			];
			var bufFunc = (type[0].toLowerCase()==='u'? 'Ui':'I') + 'nt' + type[1] + 'Array';
			for(var j=0; j < repeats; j++) {
				if(type[0].toLowerCase() === 'c') {
					var part = data[dataCursor].substring(0, type[1]);
					var pad = type[0] === 'C' ? 0x00 : 0x20;
					for(var k=0; k < type[1]; k++) {
						binaryData.push(part.charCodeAt(k) || pad);
					}
				}
				else if(type[0].toLowerCase() === 'u' || type[0].toLowerCase() === 's') {
					Array.prototype.slice.call(new Uint8Array(new global[bufFunc]([data[dataCursor]]).buffer), 0).forEach(function (x) {
						binaryData.push(x);
					});
				}
				dataCursor++;
			}
		});
		return new Uint8Array(binaryData).buffer;
	};
	
	var getBinary = function (code, buf) {
		var type = [
			code.substring(0, 1),
			parseInt(code.substring(1), 10)
		];
		buf = new Uint8Array(buf);
		var bufFunc = (type[0].toLowerCase()==='u'? 'Ui':'I') + 'nt' + type[1] + 'Array';
		return new global[bufFunc](buf.buffer)[0];
	};
	
	var hasLoadedApp = false;
	var incDecClient = function (doInc) {
		var X = new XMLHttpRequest();
		X.open("POST", '/node/?'+(doInc?'inc':'dec')+'client', false);
		X.send();
	};
	global.addEventListener('load', function () {
		incDecClient(true);
		hasLoadedApp = true;
	}, false);
	global.addEventListener('unload', function () {
		if(!hasLoadedApp) {
			incDecClient(true);
		}
		incDecClient(false);
	}, false);
	global.addEventListener('beforeunload', function () {
		if(!socket) {
			return "Are you sure you want to exit?";
		}
	}, false);
	
	var XHR2 = function (uri, data, callback, progress) {
		var X = new XMLHttpRequest();
		X.open("POST", uri, true);
		var fd = new FormData();
		for (var i in data) {
			if(data.hasOwnProperty(i)) {
				fd.append(i, data[i]);
			}
		}
		if(typeof callback === 'function') {
			X.addEventListener('load', function (e) {
				callback(X);
			}, false);
		}
		if(typeof progress === 'function') {
			X.upload.addEventListener('progress', function (e) {
				progress(e);
			});
		}
		X.send(fd);
		return X;
	};
	
	var readFileHeaderInfo = function (callback) {
		var X = new XMLHttpRequest();
		X.open("GET", '/node/?getheader', true);
		X.addEventListener('load', function (e) {
			if(X.status !== 200) {
				callback(true, []);
			}
			else {
				callback(false, JSON.parse(X.response));
			}
		});
		X.send();
	};
	
	var readFile = function (filename, callback, returnBuffer) {
		var X = new XMLHttpRequest();
		X.open("GET", '/node/?file='+encodeURIComponent(filename), true);
		X.responseType = 'arraybuffer';
		X.addEventListener('load', function (e) {
			if(X.status !== 200) {
				callback(true, returnBuffer? new Uint8Array(0) : '');
			}
			else {
				var data = new Uint8Array(X.response);
				if(returnBuffer) {
					callback(false, data);
				}
				else {
					var file = '';
					for(var i=0, l = data.length; i < l; i+=1) {
						file += String.fromCharCode(data[i]);
					}
					callback(false, file);
				}
			}
		});
		X.send();
	};
	var getFileList = function (callback) {
		var X = new XMLHttpRequest();
		X.open("GET", '/node/?files', true);
		X.addEventListener('load', function (e) {
			if(X.status !== 200) {
				callback(true, []);
			}
			else {
				callback(false, JSON.parse(X.response));
			}
		});
		X.send();
	};
	var parseFile = function (filename, callback, onprogr) {
		var X = new XMLHttpRequest();
		var st = Date.now();
		X.open("GET", '/node/?parse='+encodeURIComponent(filename), true);
		//X.overrideMimeType("text/plain; charset=x-user-defined");
		X.responseType = 'arraybuffer';
		X.addEventListener('load', function (e) {
			if(X.status !== 200) {
				callback(true, new Uint8Array([]));
			}
			else {
				var data = new Uint8Array(X.response);
				/*for(var i=0; i < X.response.length; i+=1) {
					data[i] = X.response.charCodeAt(i) & 0xFF;
				}*/
				console.log('Parsed the file in '+(Date.now() - st)/1000+'s');
				callback(false, data);
			}
		});
		var maxProgr = 0;
		if(typeof onprogr === 'function') {
			X.addEventListener('progress', function (e) {
				maxProgr = Math.max(maxProgr, e.loaded/e.total);
				onprogr(maxProgr);
			});
		}
		X.send();
	};
	var uploadAndParse = function (form, callback) {
		var X = new XMLHttpRequest();
		var st = Date.now();
		X.open("POST", '/node/?parsedata', true);
		X.overrideMimeType("text/plain; charset=x-user-defined");
		X.addEventListener('load', function (e) {
			if(X.status !== 200) {
				callback(true, '');
			}
			else {
				var data = new Uint8Array(X.response.length);
				for(var i=0; i < X.response.length; i+=1) {
					data[i] = X.response.charCodeAt(i) & 0xFF;
				}
				console.log('Uploaded and parsed the file in '+(Date.now() - st)/1000+'s');
				callback(false, data);
			}
		});
		X.send(form);
	};
	var uploadAndSave = function (blob, filename, options, callback) {
		var X = new XMLHttpRequest();
		var st = Date.now();
		X.open("POST", '/node/?savelevel', true);
		X.overrideMimeType("text/plain; charset=x-user-defined");
		var fd = new FormData();
		fd.append('filedata', blob);
		fd.append('filename', filename);
		fd.append('doRun', !!options.run);
		fd.append('doSave', !!options.save);
		X.addEventListener('load', function (e) {
			if(X.status !== 200) {
				callback(true, '');
			}
			else {
				var data = new Uint8Array(X.response.length);
				for(var i=0; i < X.response.length; i+=1) {
					data[i] = X.response.charCodeAt(i) & 0xFF;
				}
				console.log('Uploaded and saved the file in '+(Date.now() - st)/1000+'s');
				callback(false, data);
			}
		});
		X.send(fd);
	};
	
	var defaultJCSini = "";
	var loadJCSini = function (data) {
		data = (data || defaultJCSini).split("\n");
		var i, l = data.length;
		var matches;
		var lastTitle = "";
		var obj = {};
		var tmp;
		for(i=0; i < l; i+=1) {
			data[i] = data[i].trim();
			if(data[i] === "" || data[i][0] === ";") continue;
			matches = data[i].match(/^\[(.*)\]$/);
			if(matches !== null) {
				lastTitle = matches[1];
				obj[lastTitle] = [];
				continue;
			}
			matches = data[i].match(/^(.*)=(.*)$/);
			tmp = matches[2].split("|");
			if(tmp.length === 4 && lastTitle === 'Events') {
				tmp.push("");
			}
			tmp.forEach(function (v, k, a) {
				v = v.trim();
				if(k >= 5 && lastTitle === 'Events') {
					v = v.split(":");
					v[1] = +v[1];
				}
				a[k] = v;
			});
			tmp.id = +matches[1];
			obj[lastTitle][+matches[1]] = tmp;
		}
		JCSini = obj;
	};

	(function () {
		var X = new XMLHttpRequest();
		X.open("GET", 'JCS.ini', true);
		X.addEventListener('load', function (e) {
			if(X.status !== 200) {
				defaultJCSini = oldJCSini;
			}
			else {
				defaultJCSini = X.responseText;
			}
			loadJCSini();
		});
		X.send();
	}());
	
	
	
	var XYid = function (x, y, w) {
		return x+(y*w);
	};
	var idXY = function (tileID, w) {
		var divBy=1;
		if(tileID>=w) {divBy=w;}
		return [(tileID%w), (tileID-(tileID%w))/divBy];
	};
	
	var loadlevel = function (file, filename, auto) {
		Popup.open('loadinglevel');
		var levloadprogr = global.document.querySelector("#levelloadingprogress");
		global.document.querySelector("#loadlevelname").innerText = filename;
		levloadprogr.style.width = "0%";
		level(file, function (data) { // Successful read
			for(var i in data) {
				if(data.hasOwnProperty(i))
					J2L[i] = data[i];
			}
			/*for(i=211; i < J2L.Streams[0].length; i+=512) {
				console.log((i-211)/512, J2L.Streams[0].substr(i, 512).replace(/\|/g, ""));
			}*/
			//console.log(J2L, J2L.Streams[0].substr(J2L.LEVEL_INFO.normalStreamLength+512, 512).split("\0"), J2L.Streams[0].substr(J2L.LEVEL_INFO.normalStreamLength+512, 512).split("\0").length);
			J2L.fileName = filename;
			var pos, i, l = J2L.EVENTS.length, lw = J2L.LEVEL_INFO.LayerWidth[3];
			/*for(i=0; i < l; i+=1) {
				pos = idXY(i, lw);
				J2L.LEVEL[3][pos[0]][pos[1]].event = J2L.EVENTS[i];
			}*/
			//delete J2L.EVENTS;
			changeLayer(J2L.LEVEL_INFO.SecEnvAndLayer & 15);
			scrollbars.layers.scroll = [J2L.LEVEL_INFO.JcsHorizontal, J2L.LEVEL_INFO.JcsVertical];
			global.document.title = "Jazz Creation Station - "+J2L.LEVEL_INFO.LevelName+" - "+J2L.fileName;
			Popup.hide();
			levloadprogr.style.width = "0%";
			var si = 0;
			alphaSort(tilesets);
			var l = tilesets.length;
			for(var i=0; i < l; i+=1) {
				si+=1;
				if(tilesets[i].name.toLowerCase() === data.LEVEL_INFO.Tileset.toLowerCase()) {
					break;
				}
			}
			if(i === l) {
				si = 0;
			}
			if(si === 0 && data.LEVEL_INFO.Tileset !== "") {
				alert("Couldn't find tileset \""+data.LEVEL_INFO.Tileset+"\"");
			}
			else {
				changeTileset(0, auto);
				changeTileset(si, auto);
			}
			animSelection =  false;
			updateEventPointers();
		}, function (x) { // Progress update
			var p = Math.round(x*100)+"%";
			levloadprogr.style.width = p;
		}, function (err) { // Error occured
			Popup.hide();
			levloadprogr.style.width = "0%";
			alert("Error: Couldn't read level!\n"+err);
		});
	};
	
	var loadtileset = function (filename) {
		Popup.open('loadingtileset');
		var si = selectTileset.selectedIndex;
		var tileloadprogr = global.document.querySelector("#tilesetloadingprogress");
		global.document.querySelector("#loadtilesetname").innerText = selectTileset.options[si].textContent;
		tileloadprogr.style.width = "0%";
		parseFile(filename, function (err, file) { // Successful read
			var firstFive = unpackStruct([['c5']], file.subarray(0, 5));
			if(firstFive === 'error') {
				alert('Error parsing J2T file, it\'s corrupted');
				Popup.hide();
				tileloadprogr.style.width = "0%";
			}
			if(err) {
				alert('Error reading '+filename);
				Popup.hide();
				tileloadprogr.style.width = "0%";
			}
			var headerSize = 262;
			var headerStruct = [
				['c180', 'Copyright'],
				['c4',   'Identifier'],
				['u32',  'Signature'],
				['C32',  'TilesetName'],
				['u16',  'Version'],
				['u32',  'FileSize'],
				['s32',  'Checksum'],
				['u32',  'StreamSizes', 8]
			];
			
			var header = unpackStruct(headerStruct, file.subarray(0, headerSize));
			if(header.Identifier !== 'TILE') alert('Not a tileset');
			/*if(header.Checksum !== crc32(file.subarray(headerSize))) {
				console.error('Error: J2T file corrupt; Checksum error');
			}*/
			var isTSF = header.Version === 0x201;
			var maxTiles = isTSF ? 4096 : 1024;
			
			var filestr = '';
			for(var i=0, l = file.length; i < l; i+=1) {
				filestr += String.fromCharCode(file[i]);
			}
			
			var offset = headerSize;
			var streams = [];
			for(var i=0; i < 4; i+=1) {
				streams[i] = filestr.substring(offset, offset+header.StreamSizes[i*2+1]);
				streams[i] = streams[i].split('');
				for(var j=0, l = streams[i].length; j < l; j+=1) {
					streams[i][j] = streams[i][j].charCodeAt(0) & 0xFF;
				}
				streams[i] = new Uint8Array(streams[i]);
				offset += header.StreamSizes[i*2+1];
			}
			var tilesetInfoStruct = [
				['u32', 'Palette', 256],
				['u32', 'TileCount'],
				['u8',  'EmptyTile', maxTiles],
				['u8',  'Unknown1', maxTiles],
				['u32', 'ImageAddress', maxTiles],
				['u32', 'Unknown2', maxTiles],
				['u32', 'TMaskAddress', maxTiles],
				['u32', 'Unknown3', maxTiles],
				['u32', 'MaskAddress', maxTiles],
				['u32', 'FMaskAddress', maxTiles]
			];
			var tilesetInfo = unpackStruct(tilesetInfoStruct, streams[0]);
			J2T = {};
			J2T.Palette = tilesetInfo.Palette;
			var tilesetImage = streams[1];
			var tilesetMask = streams[3];
			J2T.tilesetMask = tilesetMask;
			J2T.maskAddress = tilesetInfo.MaskAddress;
			tileloadprogr.style.width = "66%";
			setTimeout(function () {
				var tilesetname = header.TilesetName;
				
				var tilesetcanvas = global.document.createElement("canvas");
				var tilec = tilesetcanvas.getContext("2d");
				tilesetcanvas.width = 320;
				var tilecount = tilesetInfo.TileCount;
				var tileh = tilesetcanvas.height = 32*Math.ceil(tilecount/10);
				
				var imgdata = tilec.createImageData(32, 32);
				var imgd = imgdata.data;
				var maxTiles = isTSF ? 4096 : 1024;
				var tilecache = [];
				
				var i, j, x, y, tile, index, color, pos, cachepos, masked, mbyte, pixpos;
				
				for (i=0; i < tilecount; i+=1) {
					tile = tilesetInfo.ImageAddress[i];
					if(tile === 0) { continue; }
					pos = idXY(i, 10);
					if(tilecache[tile] !== undefined) {
						cachepos = idXY(tilecache[tile], 10);
						tilec.drawImage(tilesetcanvas, cachepos[0]*32, cachepos[1]*32, 32, 32, pos[0]*32, pos[1]*32, 32, 32);
					}
					else {
						tilecache[tile] = i;
						for(j=0; j < 4096 /* 32x32x4 */; j+=4) {
							index = tilesetImage[tile+j/4];
							if(index > 1) {
								color = tilesetInfo.Palette[index];
								imgd[j + 0] = color & 0xFF;
								imgd[j + 1] = (color >> 8) & 0xFF;
								imgd[j + 2] = (color >> 16) & 0xFF;
								imgd[j + 3] = 255;
							}
							else {
								imgd[j + 3] = 0;
							}
						}
						tilec.putImageData(imgdata, pos[0]*32, pos[1]*32);
					}
				}
				tile_url = tilesetcanvas.toDataURL("image/png");
				tileloadprogr.style.width = "83%";
				setTimeout(function () {
					tilec.clearRect(0, 0, 320, tileh);
					tilecache = [];
					for (i=0; i < tilecount; i+=1) {
						tile = tilesetInfo.MaskAddress[i];
						if(tile === 0) { continue; }
						pos = idXY(i, 10);
						if(tilecache[tile] !== undefined) {
							cachepos = idXY(tilecache[tile], 10);
							tilec.drawImage(tilesetcanvas, cachepos[0]*32, cachepos[1]*32, 32, 32, pos[0]*32, pos[1]*32, 32, 32);
						}
						else {
							tilecache[tile] = i;
							for (x=0; x < 128; x+=1) {
								mbyte = tilesetMask[tile+x];
								for (y=0; y < 8; y+=1) {
									color = 0;
									if(tile > 0) {
										masked = (mbyte & Math.pow(2, y)); //bit value
										if(masked > 0) {
											color = 255;
										}
									}
									pixpos = ((x * 8) + y)*4; //bit index, for position
									imgd[pixpos + 0] = 0;
									imgd[pixpos + 1] = 0;
									imgd[pixpos + 2] = 0;
									imgd[pixpos + 3] = color;
								}
							}
							tilec.putImageData(imgdata, pos[0]*32, pos[1]*32);
						}
					}
					mask_url = tilesetcanvas.toDataURL("image/png");
					tilesetcanvas.width = 1;
					tilesetcanvas.height = 1;
					var totalSize = tile_url.length + mask_url.length;
			
					currentTileset.src = tile_url;
					currentTilesetMask.src = mask_url;
					tileloadprogr.style.width = "100%";
					setTimeout(function () {
						Popup.hide();
						tileloadprogr.style.width = "0%";
					}, 300);
				}, 300);
			}, 300);
			
		}, function (x) { // Progress update
			tileloadprogr.style.width = Math.round(x*50)+"%";
		});
	};
	
	var writeLevel = function (options) {
		Popup.open("saving");
		var saveprogress = global.document.querySelector("#savingprogress");
		var saving = global.document.querySelector("#saving");
		saveprogress.style.width = "0%";
		global.document.querySelector("#savinglevelname").textContent = trimNull(J2L.LEVEL_INFO.LevelName);
		
		var copyright = "                      Jazz Jackrabbit 2 Data File\r\n\r\n"+
	                   "         Retail distribution of this data is prohibited without\r\n"+
	                   "             written permission from Epic MegaGames, Inc.\r\n\r\n\x1A";
		var isTSF = false;
		var version = isTSF?0x203:0x202;
		var i, j, k, w, h;
		var staticTiles = (isTSF?4096:1024) - J2L.ANIMS.length;
		var MAX_TILES = (isTSF?4096:1024);
		var streams = [0, 0, 0, 0];
		var streamSizes = [0, 0, 0, 0];
		
		var map = [];
		var tmp;
		var l;
		var isLayerUsed = function (l) {
			if(l === 3) return 1;
			var i, j;
			var w = J2L.LEVEL_INFO.LayerWidth[l];
			var h = J2L.LEVEL_INFO.LayerHeight[l];
			for(i=0; i < w; i+=1) {
				for(j=0; j < h; j+=1) {
					if(J2L.LEVEL[l][i][j].id > 0 || J2L.LEVEL[l][i][j].animated)
						return 1;
				}
			}
			return 0;
		};
		var viewBytes = function (b) {
			var i, s = "";
			for(i=0; i < b.length; i+=1) {
				s += b[i].toString(16)+" ";
			}
			console.log(s);
		};
		var realWidth;
		var hasAnimAndEvent;
		var animEventComboCount = 0;
		var tilesetNeedsFlipped = {};
		var animNeedsFlip = {};
		var tile;
		
		for(l = 0; l < 8; l+=1) {
			J2L.LEVEL_INFO.IsLayerUsed[l] = isLayerUsed(l);
			map[l] = [];
			J2L.LEVEL_INFO.JJ2LayerWidth[l] = J2L.LEVEL_INFO.LayerWidth[l]*(J2L.LEVEL_INFO.LayerProperties[l] & 1 === 1? 4:1);
			if(J2L.LEVEL_INFO.IsLayerUsed[l] === 0) continue;
			w = J2L.LEVEL_INFO.JJ2LayerWidth[l];
			h = J2L.LEVEL_INFO.LayerHeight[l];
			var tileW = 1;
			realWidth = Math.ceil(w/4)*4;
			for(j = 0; j < h; j+=1) {
				for(i = 0; i < realWidth; i+=4) {
					tmp = [0, 0, 0, 0];
					hasAnimAndEvent = false;
					for(k = 0; k < 4; k+=1) {
						if(i+k < w) {
							tile = J2L.LEVEL[l][(i+k) % (J2L.LEVEL_INFO.LayerWidth[l])][j];
							
							tmp[k] = tile.id + (tile.flipped?MAX_TILES:0) + (tile.animated?staticTiles:0);
							
							if(l === 3 && tile.animated && J2L.EVENTS[i+k+j*w] > 0) {
								hasAnimAndEvent = true;
							}
							if(tile.flipped && !tile.animated) {
								tilesetNeedsFlipped[tile.id] = true;
							}
							else if(tile.flipped) {
								animNeedsFlip[tile.id] = true;
							}
						}
					}
					if(hasAnimAndEvent) {
						tmp.push(animEventComboCount);
						animEventComboCount++;
					}
					map[l].push(tmp.join(','));
				}
			}
		}
		
		var dict = {'0,0,0,0': 0};
		var tileCache = [];
		var lastDictId = 1;
		var dictionary = {};
		var notexists;
		for(i=0; i < 8; i+=1) {
			for(j=0; j < map[i].length; j+=1) {
				notexists=false;
				if(dict[map[i][j]] === undefined) {
					dict[map[i][j]] = lastDictId;
					notexists=true;
					lastDictId+=1;
				}
				tileCache.push(dict[map[i][j]]);
				if(notexists) {
					//lastDictId+=1;
				}
			}
		}
		
		var wordCount = 0;
		for(i in dict) {
			if(dict.hasOwnProperty(i)) {
				dictionary[dict[i]]=i;
				wordCount+=1;
			}
		}
		var words = new Uint16Array(wordCount*4);
		var wordOffset = 0;
		for(i in dictionary) {
			if(dictionary.hasOwnProperty(i)) {
				tmp = dictionary[i].split(",");
				for(k = 0; k < 4; k+=1) {
					words[wordOffset+k] = +tmp[k];
				}
				wordOffset+=4;
			}
		}
		
		
		streamSizes[2] = words.byteLength;
		
		streams[2] = words.buffer;
		streamSizes[2] = streams[2].byteLength;
		
		var dictstream = new Uint16Array(tileCache.length);
		for(i = 0; i < tileCache.length; i+=1) {
			dictstream[i] = tileCache[i];
		}
		
		
		streams[3] = dictstream.buffer;
		streamSizes[3] = streams[3].byteLength;
		
		var animOffset = 8813+MAX_TILES*7;
		var streamLength = animOffset + 128*137;
		var arbuf = new ArrayBuffer(streamLength);
		var buf = new DataView(arbuf);
		buf.setUint16(0, ~~(scrollbars.layers.scroll[0]), true); // JcsHorizontal
		buf.setUint16(4, ~~(scrollbars.layers.scroll[1]), true); // JcsVertical
		buf.setUint8(8, currentLayer, true); // SecEnvAndLayer
		buf.setUint8(9, J2L.LEVEL_INFO.MinimumAmbient);
		buf.setUint8(10, J2L.LEVEL_INFO.StartingAmbient);
		buf.setUint16(11, J2L.ANIMS.length, true);
		buf.setUint8(13, J2L.LEVEL_INFO.SplitScreenDivider);
		buf.setUint8(14, J2L.LEVEL_INFO.IsItMultiplayer);
		buf.setUint32(15, streamLength, true);
		J2L.LEVEL_INFO.Tileset = selectTileset.options[selectTileset.selectedIndex] !== undefined ? selectTileset.options[selectTileset.selectedIndex].value:"";
		if(J2L.LEVEL_INFO.LevelName === "") {
			J2L.LEVEL_INFO.LevelName = "Untitled";
		}
		for(i=0; i < 32; i+=1) {
			buf.setUint8(19+i, J2L.LEVEL_INFO.LevelName.charCodeAt(i) || 0);
			buf.setUint8(19+i+32*1, J2L.LEVEL_INFO.Tileset.charCodeAt(i) || 0);
			buf.setUint8(19+i+32*2, J2L.LEVEL_INFO.BonusLevel.charCodeAt(i) || 0);
			buf.setUint8(19+i+32*3, J2L.LEVEL_INFO.NextLevel.charCodeAt(i) || 0);
			buf.setUint8(19+i+32*4, J2L.LEVEL_INFO.SecretLevel.charCodeAt(i) || 0);
			buf.setUint8(19+i+32*5, J2L.LEVEL_INFO.MusicFile.charCodeAt(i) || 0);
		}
		for(i=0; i < J2L.LEVEL_INFO.HelpString.length; i+=1) {
			for(j=0; j < J2L.LEVEL_INFO.HelpString[i].length; j+=1) {
				buf.setUint8(211+512*i+j, J2L.LEVEL_INFO.HelpString[i].charCodeAt(j) || " ");
			}
		}
		for(i=0; i < 8; i+=1) {
			buf.setUint32(8403+i*4, J2L.LEVEL_INFO.LayerProperties[i], true);
			/* 8 unknowns */
			buf.setUint8 (8403+8*4+8+i, J2L.LEVEL_INFO.IsLayerUsed[i]);
			buf.setUint32(8403+8*4+8+8+i*4, J2L.LEVEL_INFO.LayerWidth[i], true);
			buf.setUint32(8403+8*4+8+8+8*4+i*4, J2L.LEVEL_INFO.JJ2LayerWidth[i], true);
			buf.setUint32(8403+8*4+8+8+8*4+8*4+i*4, J2L.LEVEL_INFO.LayerHeight[i], true);
			buf.setInt32(8403+8*4+8+8+8*4+8*4+8*4+i*4, i*100-300, true);
			/* 18*4 unknowns */
			buf.setInt32(8403+8*4+8+8+8*4+8*4+8*4+8*4+18*4+i*4, J2L.LEVEL_INFO.LayerXSpeed[i]*65536, true);
			buf.setInt32(8403+8*4+8+8+8*4+8*4+8*4+8*4+18*4+8*4+i*4, J2L.LEVEL_INFO.LayerYSpeed[i]*65536, true);
			buf.setInt32(8403+8*4+8+8+8*4+8*4+8*4+8*4+18*4+8*4+8*4+i*4, J2L.LEVEL_INFO.LayerAutoXSpeed[i]*65536, true);
			buf.setInt32(8403+8*4+8+8+8*4+8*4+8*4+8*4+18*4+8*4+8*4+8*4+i*4, J2L.LEVEL_INFO.LayerAutoYSpeed[i]*65536, true);
			/* 8 unknowns */
		}
		for(i=0; i < 3; i+=1) {
			// Ugly...
			buf.setUint8(8787+3*0+i, J2L.LEVEL_INFO.LayerRGB1[i]);
			buf.setUint8(8787+3*1+i, J2L.LEVEL_INFO.LayerRGB2[i]);
			buf.setUint8(8787+3*2+i, J2L.LEVEL_INFO.LayerRGB3[i]);
			buf.setUint8(8787+3*3+i, J2L.LEVEL_INFO.LayerRGB4[i]);
			buf.setUint8(8787+3*4+i, J2L.LEVEL_INFO.LayerRGB5[i]);
			buf.setUint8(8787+3*5+i, J2L.LEVEL_INFO.LayerRGB6[i]);
			buf.setUint8(8787+3*6+i, J2L.LEVEL_INFO.LayerRGB7[i]);
			buf.setUint8(8787+3*7+i, J2L.LEVEL_INFO.LayerRGB8[i]);
		}
		buf.setUint16(8811, staticTiles, true);
		
		var frames = 0;
		for(i=0; i < J2L.ANIMS.length; i+=1) {
			buf.setUint16(animOffset + i*137, J2L.ANIMS[i].FramesBetweenCycles, true);
			buf.setUint16(animOffset + i*137 + 2, J2L.ANIMS[i].RandomAdder, true);
			buf.setUint16(animOffset + i*137 + 4, J2L.ANIMS[i].PingPongWait, true);
			buf.setUint8(animOffset + i*137 + 6, J2L.ANIMS[i].IsItPingPong);
			buf.setUint8(animOffset + i*137 + 7, J2L.ANIMS[i].FPS);
			frames = Math.min(J2L.ANIMS[i].Tiles.length, 64);
			buf.setUint8(animOffset + i*137 + 8, frames);
			for(j=0; j < frames; j+=1) {
				buf.setUint16(animOffset + i*137 + 9 + j*2, J2L.ANIMS[i].Tiles[j].id + (J2L.ANIMS[i].Tiles[j].flipped?MAX_TILES:0) + (J2L.ANIMS[i].Tiles[j].animated?staticTiles:0), true);
				if(animNeedsFlip[i] === true && !J2L.ANIMS[i].Tiles[j].animated) {
					tilesetNeedsFlipped[J2L.ANIMS[i].Tiles[j].id] = true;
				}
				else if(animNeedsFlip[i] === true) {
					animNeedsFlip[J2L.ANIMS[i].Tiles[j].id] = true;
				}
				if(J2L.ANIMS[i].Tiles[j].flipped && !J2L.ANIMS[i].Tiles[j].animated) {
					tilesetNeedsFlipped[J2L.ANIMS[i].Tiles[j].id] = true;
				}
				else if(J2L.ANIMS[i].Tiles[j].flipped) {
					animNeedsFlip[J2L.ANIMS[i].Tiles[j].id] = true;
				}
				//tilesetNeedsFlipped[J2L.ANIMS[i].Tiles[j].id] = true;
			}
		}
		
		
		for(i=1; i < staticTiles; i+=1) {
			buf.setUint32(8813+i*4, J2L.TilesetProperties.TileEvent[i], true);
			buf.setUint8(8813+4*MAX_TILES+i, tilesetNeedsFlipped[i] === true ? 1 : 0); // Flipped tiles in tileset, so JJ2 know what flipped tiles to load from flipped tileset image ;D
			buf.setUint8(8813+MAX_TILES*4+MAX_TILES+i, J2L.TilesetProperties.TileType[i], true);
			/* skip MAX_TILES bytes */
		}
		
		/*var levelinfo = "";
		for(i=0; i < arbuf.byteLength; i+=1) {
			levelinfo += String.fromCharCode(buf.getUint8(i));
		}*/
		streams[0] = arbuf;
		streamSizes[0] = streams[0].byteLength;
		
		w = J2L.LEVEL_INFO.LayerWidth[3];
		h = J2L.LEVEL_INFO.LayerHeight[3];
		
		arbuf = new ArrayBuffer(w*h*4);
		buf = new DataView(arbuf);
		for(i=0; i < w; i+=1) {
			for(j=0; j < h; j+=1) {
				buf.setUint32((i+(j*w))*4, J2L.EVENTS[i+w*j] || 0, true);
			}
		}
		/*var events = "";
		for(i=0; i < arbuf.byteLength; i+=1) {
			events += String.fromCharCode(buf.getUint8(i));
		}*/
		streams[1] = arbuf;
		streamSizes[1] = streams[1].byteLength;
		
		arbuf = new ArrayBuffer(262);
		buf = new DataView(arbuf);
		for(i=0; i < 180; i+=1) {
			buf.setUint8(i, copyright.charCodeAt(i));
		}
		buf.setInt32(180+3, 0xBABE, false); // Password
		var identifier = "LEVL";
		for(i=0; i < 4; i+=1) {
			buf.setUint8(180+i, identifier.charCodeAt(i));
		}
		buf.setUint8(180+4+3, J2L.HEADER_INFO.HideLevel);
		for(i=0; i < J2L.HEADER_INFO.LevelName.length; i+=1) {
			buf.setUint8(180+4+3+1+i, J2L.HEADER_INFO.LevelName.charCodeAt(i) || 0);
		}
		var allBuffers = new Uint8Array(streamSizes[0]+streamSizes[1]+streamSizes[2]+streamSizes[3]);
		var offset = 0;
		for(i=0; i < 4; i+=1) {
			allBuffers.set(new Uint8Array(streams[i]), offset);
			offset+= streamSizes[i];
		}
		buf.setUint16(180+4+3+1+32, version, true);
		//buf.setUint32(180+4+3+1+32+2, 262+allBuffers.length, true);
		//buf.setInt32(180+4+3+1+32+2+4, crc32(allBuffers), true); // CRC32 of level
		for(i=0; i < 4; i+=1) {
			//buf.setUint32(230+i*8, 0, true);
			buf.setUint32(230+i*8+4, streamSizes[i], true);
		}
		
		var bb = new BlobBuilder();
		bb.append(arbuf); // Header
		bb.append(allBuffers.buffer); // Streams
		var blob = bb.getBlob("application/octet-stream");
		uploadAndSave(blob, J2L.fileName, {run: !!options.run, save: !!options.save, newfile: !!options.newfile}, function (err, data) {
			if(!err && data.length > 0) {
				var bb = new BlobBuilder();
				bb.append(data.buffer);
				var blob = bb.getBlob("application/octet-stream");
				//webkitURL.createObjectURL(blob)
				saveAs(blob, J2L.fileName);
			}
			Popup.hide();
		});
		/*fs.root.getFile(J2L.fileName, {create: true}, function (fileEntry) {
			fileEntry.createWriter(function (fileWriter) {
				fileWriter.onwriteend = function(e) {
					Popup.hide();
					if(confirm("Download saved level?")) {
						global.document.location = fileEntry.toURL();
					}
				};
				fileWriter.write(blob);
			}, fileSystemError);
		}, fileSystemError);*/
		
	};
	
	var updateTiles = function (layer, startX, startY, maxw, maxh, selection, includeEmpty) {
		var oldSelection = [];
		var lw = J2L.LEVEL_INFO.LayerWidth[layer];
		var lh = J2L.LEVEL_INFO.LayerHeight[layer];
		var isIdenticalCount = 0;
		var totalCount = 0;
		for(var x = 0; x < maxw; x+=1) {
			oldSelection[x] = [];
			for(var y = 0; y < maxh; y+=1) {
				oldSelection[x][y] = {};
				if(x+startX < lw && y+startY < lh) {
					oldSelection[x][y] = {
						'id': 0,
						'animated': false,
						'flipped': false,
						'event': 0
					};
					oldSelection[x][y] = {
						'id': J2L.LEVEL[layer][x+startX][y+startY].id,
						'animated': J2L.LEVEL[layer][x+startX][y+startY].animated,
						'flipped': J2L.LEVEL[layer][x+startX][y+startY].flipped,
						'event': layer === 3 ? J2L.EVENTS[x+startX + lw * (y+startY)] || 0 : 0
					};
					if(selection[x] && selection[x][y] && (includeEmpty || selection[x][y].id > 0 || selection[x][y].animated || (selection.length===1 && selection[x].length === 1))) {
						J2L.LEVEL[layer][x+startX][y+startY] = {'id': selection[x][y].id, 'animated': selection[x][y].animated, 'flipped': selection[x][y].flipped};
						if(layer === 3) {
							J2L.EVENTS[x+startX + lw * (y+startY)] = selection[x][y].event || 0;
						}
						if(oldSelection[x][y].id === selection[x][y].id &&
						   oldSelection[x][y].animated === selection[x][y].animated &&
						   oldSelection[x][y].flipped === selection[x][y].flipped &&
						   oldSelection[x][y].event === J2L.EVENTS[x+startX + lw * (y+startY)]) {
							isIdenticalCount++;
						}
						totalCount++;
					}
				}
			}
		}
		return isIdenticalCount === totalCount ? false : oldSelection;
	};
	
	/*var freeRef = function (obj) {
		var chi, cou, len, nam;
		chi = obj.childNodes;
		if(chi) {
			len = chi.length;
			for (cou = 0; cou < len; cou++) {
				freeRef(obj.childNodes[cou]);
			}
		}
		chi = obj.attributes;
		if(chi) {
			len = chi.length;
			for(cou = 0; cou < len; cou++) {
				nam = chi[cou].name;
				if(typeof(obj[nam]) === 'function') {
					obj[nam] = null;
				}
			}
		}
	};*/
	
	var mousedowndrag = function (e) {
		if(e.which === 1) {
			var node = this.parentNode.parentNode.parentNode;
			var nodebounding = node.getBoundingClientRect();
			this.offsetY = (e.pageY - nodebounding.top);
			this.isDragging = true;
		}
		chatInput.blur();
		e.preventDefault();
		return false;
	};
	var mousedownlayers = function (e) {
		var layerbounding = layercanvas.getBoundingClientRect();
		var offsetX = e.pageX - layerbounding.left;
		var offsetY = e.pageY - layerbounding.top;
		mousedownscroll = [scrollbars.layers.scroll[0], scrollbars.layers.scroll[1]];
		if(e.which === 1) {
			layercanvas.isDragging = true;
		}
		else if(e.which === 2) {
			layercanvas.isPanning = true;
		}
		
		var w = layerdiv.offsetWidth;
		var h = layerdiv.offsetHeight;
		
		if(mouseOnScrollbars('layers', w, h, offsetX, offsetY, e)) {
			
		}
		else {
			winmove(e);
		}
		chatInput.blur();
		e.preventDefault();
	};
	var mousedownanims = function (e) {
		var animsbounding = animscanvas.getBoundingClientRect();
		var offsetX = e.pageX /*- animsbounding.left*/;
		var offsetY = e.pageY - animsbounding.top;
		animscanvas.isDragging = true;
		var btn = e.which;
		
		var w = animsdiv.offsetWidth;
		var h = animsdiv.offsetHeight;
		if(mouseOnScrollbars('anims', w, h, offsetX, offsetY, e)) {
			
		}
		else if(btn === 1) {
			var offx = e.pageX /*- animscanvas.offsetLeft*/ + scrollbars.anims.scroll[0];
			var offy = e.pageY - animsbounding.top + scrollbars.anims.scroll[1];
			var anx = 0;
			var any = Math.floor(offy/32);
			if(e.pageX > 32+4) anx = Math.floor((offx-4)/32);
			if(!holdingCtrlKey) {
				animSelection =  false;
				if((any <= J2L.ANIMS.length && anx === 0) || (J2L.ANIMS[any] && anx-2 < J2L.ANIMS[any].Frames)) {
					animSelection = [anx, any];
				}
				if(anx === 0 && any < J2L.ANIMS.length) {
					selectedTiles = [[{'id': any, 'animated': true, 'flipped': false, 'event': 0}]];
					selectedSource = 'anims';
				}
			}
			else if(holdingCtrlKey && anx === 0 && any < J2L.ANIMS.length) {
				var id = any;
				var addWhere;
				if(animSelection !== false) {
					if(animSelection[0] === 0 && animSelection[1] === J2L.ANIMS.length) {
						J2L.ANIMS.push({
							'FramesBetweenCycles': 0,
							'RandomAdder': 0,
							'PingPongWait': 0,
							'IsItPingPong': 0,
							'FPS': 10,
							'Frames': 0,
							'Tiles': []
						});
						if(socket && socket.readyState === 1) {
							sendUpdate({
								what: 'anims',
								type: 'new'
							});
						}
					}
					addWhere = J2L.ANIMS[animSelection[1]].Frames;
					if(animSelection[0] > 0) {
						addWhere = animSelection[0]-1;
					}
					J2L.ANIMS[animSelection[1]].Tiles.splice(addWhere, 0, {'id': id, 'animated': true, 'flipped': holdingFlipKey});
					J2L.ANIMS[animSelection[1]].Frames+=1;
					if(socket && socket.readyState === 1) {
						sendUpdate({
							what: 'anims',
							type: 'frame',
							anim: animSelection[1],
							pos: addWhere,
							tile: {'id': id, 'animated': true, 'flipped': holdingFlipKey}
						});
					}
				}
			}
		}
		else if(btn === 3) {
			var offy = e.pageY - animsbounding.top + scrollbars.anims.scroll[1];
			var any = Math.floor(offy/32);
			
			if(e.pageX < 32 && any < J2L.ANIMS.length) {
				animpropertiesform.animID.value = any;
				animpropertiesform.animSpeedSlider.value = animpropertiesform.animSpeedInput.value = J2L.ANIMS[any].FPS;
				animpropertiesform.animFrameWait.value = J2L.ANIMS[any].FramesBetweenCycles;
				animpropertiesform.animRandomAdder.value = J2L.ANIMS[any].RandomAdder;
				animpropertiesform.animPingPongWait.value = J2L.ANIMS[any].PingPongWait;
				animpropertiesform.animPingPong.set(!!J2L.ANIMS[any].IsItPingPong);
				
				
				Popup.open('animproperties');
			}
		}
		chatInput.blur();
		e.preventDefault();
		return false;
	};
	var moveAnim = function (updown) {
		return function (e) {
			if(animSelection !== false && animSelection[0] === 0 && animSelection[1] < J2L.ANIMS.length && animSelection[1]+updown < J2L.ANIMS.length && animSelection[1]+updown > -1) {
				var tmpHolder = J2L.ANIMS[animSelection[1]];
				J2L.ANIMS[animSelection[1]] = J2L.ANIMS[animSelection[1]+updown];
				J2L.ANIMS[animSelection[1]+updown] = tmpHolder;
				if(socket && socket.readyState === 1) {
					sendUpdate({
						what: 'anims',
						type: 'move',
						anim: animSelection[1],
						by: updown
					});
				}
				animSelection[1]+=updown;
			}
		};
	};
	var mousedowntileset = function (e) {
		var tilesetbounding = tilesetcanvas.getBoundingClientRect();
		var offsetX = e.pageX /*- tilesetbounding.left*/;
		var offsetY = e.pageY - tilesetbounding.top;
		tilesetcanvas.isDragging = true;
		
		var w = tilesetdiv.offsetWidth;
		var h = tilesetdiv.offsetHeight;
		
		if(mouseOnScrollbars('tileset', w, h, offsetX, offsetY, e)) {
			
		}
		else {
			mousedownscroll = [scrollbars.tileset.scroll[0], scrollbars.tileset.scroll[1]];
			if(holdingCtrlKey) {
				var startX = Math.floor((e.pageX /*- tilesetcanvas.offsetLeft*/)/32);
				var startY = Math.floor((e.pageY - tilesetbounding.top + mousedownscroll[1])/32);
				if(startY < currentTileset.height/32) {
					var id = XYid(startX, startY, 10);
					var addWhere;
					if(animSelection !== false) {
						if(animSelection[0] === 0 && animSelection[1] === J2L.ANIMS.length) {
							J2L.ANIMS.push({
								'FramesBetweenCycles': 0,
								'RandomAdder': 0,
								'PingPongWait': 0,
								'IsItPingPong': 0,
								'FPS': 10,
								'Frames': 0,
								'Tiles': []
							});
							if(socket && socket.readyState === 1) {
								sendUpdate({
									what: 'anims',
									type: 'new'
								});
							}
						}
						addWhere = J2L.ANIMS[animSelection[1]].Frames;
						if(animSelection[0] > 0) {
							addWhere = animSelection[0]-1;
						}
						J2L.ANIMS[animSelection[1]].Tiles.splice(addWhere, 0, {'id': id, 'animated': false, 'flipped': holdingFlipKey});
						J2L.ANIMS[animSelection[1]].Frames+=1;
						
						if(socket && socket.readyState === 1) {
							sendUpdate({
								what: 'anims',
								type: 'frame',
								anim: animSelection[1],
								pos: addWhere,
								tile: {'id': id, 'animated': false, 'flipped': holdingFlipKey}
							});
						}
					}
				}
				
			}
		}
		chatInput.blur();
		e.preventDefault();
	};
	
	var mousedownparallax = function (e) {
		var bounding = parallaxcanvas.getBoundingClientRect();
		var offsetX = e.pageX - bounding.left;
		var offsetY = e.pageY - bounding.top;
		parallaxcanvas.isDragging = true;
		
		var w = parallaxdiv.offsetWidth;
		var h = parallaxdiv.offsetHeight;
		chatInput.blur();
		e.preventDefault();
	};
	
	var winmousedown = function (e) {
		mousedownpos = [e.pageX, e.pageY];
		mousepos = [e.pageX, e.pageY];
		whichmouse = e.which;
	};
	var winmove = function (e) {
		var X = e.pageX, Y = e.pageY;
		var inW = window.innerWidth;
		var inH = window.innerHeight;
		mousetarget = e.target || null;
		mousepos = [X, Y];
		var tilesetbounding = tilesetcanvas.getBoundingClientRect();
		var animsbounding = animscanvas.getBoundingClientRect();
		var layerbounding = layercanvas.getBoundingClientRect();
		var parallaxbounding = parallaxcanvas.getBoundingClientRect();
		
		if(layercanvas.isPanning && !layercanvas.isDragging) {
			if(mousedownpos !== false && mousedownscroll !== false) {
				var offsetStartX = mousedownpos[0] - layerbounding.left + mousedownscroll[0];
				var offsetStartY = mousedownpos[1] - layerbounding.top + mousedownscroll[1];
				scrollbars.layers.scroll[0] = offsetStartX - (e.pageX - layerbounding.left);
				scrollbars.layers.scroll[1] = offsetStartY - (e.pageY - layerbounding.top);
			}
		}
		
		if(animsdrag.isDragging) {
			var tilesetHeight = Math.max(Math.min(e.pageY - 42 - animsdrag.offsetY, inH-47-20+3), 0);
			if(tilesetcanvas.offsetHeight !== tilesetHeight) {
				tilesetcanvas.height = Math.max(tilesetHeight, 1);
				tilesetcanvas.style.height = tilesetdiv.style.height = tilesetHeight + "px";
			}
			
			var animHeight = (inH - tilesetHeight - 42 - 20 - 2);
			if(animHeight < 0) animHeight = 0;
			else if(animHeight > (inH-42-20)) animHeight = (inH-42-20);
			if(animscanvas.offsetHeight !== animHeight) {
				animscanvas.height = Math.max(animHeight, 1);
				animscanvas.style.height = animsdiv.style.height = animHeight + "px";
			}
			localStorage.animHeight = animHeight;
			//var bounding = tilesetcanvas.getBoundingClientRect();
			redraw(0, true);
			//requestAnimFrame(function () {redraw(0, true);}, layercanvas);
			chatContent.scrollTop = chatContent.scrollHeight;
		}
		else if(parallaxdrag.isDragging) {
			var layerHeight = Math.max(Math.min(e.pageY - 42 - parallaxdrag.offsetY, inH-47-20+3), 0);
			if(layercanvas.offsetHeight !== layerHeight) {
				layercanvas.height = Math.max(layerHeight, 1);
				layercanvas.style.height = layerdiv.style.height = layerHeight + "px";
			}
			
			var parallaxHeight = (inH - layerHeight - 42 - 20 - 2);
			if(parallaxHeight < 0) parallaxHeight = 0;
			else if(parallaxHeight > (inH-42-20)) parallaxHeight = (inH-42-20);
			if(parallaxcanvas.offsetHeight !== parallaxHeight) {
				parallaxcanvas.height = Math.max(parallaxHeight, 1);
				parallaxcanvas.style.height = parallaxdiv.style.height = parallaxHeight + "px";
			}
			localStorage.parallaxHeight = parallaxHeight;
			redraw(0, true);
			//requestAnimFrame(function () {redraw(0, true);}, layercanvas);
			chatContent.scrollTop = chatContent.scrollHeight;
		}
		else if(chatResizer.isDragging) {
			chatPanel.style.width = Math.min(Math.max(chatResizer.offsetWidth, inW - X + chatResizer.offsetWidth/2), inW)+"px";
			resizer();
		}
		else if(scrollingWhat !== "") {
			var offsetX = scrollbars[scrollingWhat].offset[0];
			var offsetY = scrollbars[scrollingWhat].offset[1];
			var w, h;
			var newGripPosition;
			var newScrollRatio;
			var offLeft, offTop;
			if(scrollingWhat === 'layers') {
				w = layerdiv.offsetWidth;
				h = layerdiv.offsetHeight;
				offLeft = layerbounding.left;
				offTop = layerbounding.top;
			}
			else if(scrollingWhat === 'anims') {
				w = animsdiv.offsetWidth;
				h = animsdiv.offsetHeight;
				offLeft = animsbounding.left;
				offTop = animsbounding.top;
			}
			else if(scrollingWhat === 'tileset') {
				w = tilesetdiv.offsetWidth;
				h = tilesetdiv.offsetHeight;
				offLeft = tilesetbounding.left;
				offTop = tilesetbounding.top;
			}
			
			var bar = scrollbars[scrollingWhat].bar;
			var show = showWhatScrollbars(scrollingWhat, w, h);
			var showX = show[0];
			var showY = show[1];
			if(bar === "X") {
				newGripPosition = X-offLeft-21-offsetX;
				
				if(newGripPosition < 0) newGripPosition = 0;
				if(newGripPosition > scrollbars[scrollingWhat].scrollSize[0]) newGripPosition = scrollbars[scrollingWhat].scrollSize[0];
				newScrollRatio = newGripPosition / scrollbars[scrollingWhat].scrollSize[0];
				if(isNaN(newScrollRatio)) newScrollRatio = 0;
				scrollbars[scrollingWhat].scroll[0] = newScrollRatio * (scrollbars[scrollingWhat].contentSize[0]-w+showY*17);
				
			}
			else if(bar === "Y") {
				newGripPosition = Y-offTop-21-offsetY;
				
				if(newGripPosition < 0) newGripPosition = 0;
				if(newGripPosition > scrollbars[scrollingWhat].scrollSize[1]) newGripPosition = scrollbars[scrollingWhat].scrollSize[1];
				newScrollRatio = newGripPosition / scrollbars[scrollingWhat].scrollSize[1];
				if(isNaN(newScrollRatio)) newScrollRatio = 0;
				scrollbars[scrollingWhat].scroll[1] = newScrollRatio * (scrollbars[scrollingWhat].contentSize[1]-h+showX*17);
			}
		}
		else if(mousetarget === layercanvas) {
			var rawOffsetX = X - layerbounding.left + scrollbars.layers.scroll[0];
			var rawOffsetY = Y - layerbounding.top + scrollbars.layers.scroll[1];
			var offsetX = Math.floor(rawOffsetX/(32*zoomlevel))*32*zoomlevel;
			var offsetY = Math.floor(rawOffsetY/(32*zoomlevel))*32*zoomlevel;
			var posX = Math.ceil(offsetX/(32*zoomlevel))+1;
			var posY = Math.ceil(offsetY/(32*zoomlevel))+1;
			if(posX < 1 || posY < 1 || posX > J2L.LEVEL_INFO.LayerWidth[currentLayer] || posY > J2L.LEVEL_INFO.LayerHeight[currentLayer])
				tilePositionDiv.style.opacity = "0";
			else {
				tilePositionDiv.style.opacity = "1";
				tilePositionDiv.textContent = "Pos: "+posX+", "+posY;
			}
			var tileX = Math.floor(offsetX/(32*zoomlevel));
			var tileY = Math.floor(offsetY/(32*zoomlevel));
			var evt, id = 0, params, difficulty, illumi;
			var lw = J2L.LEVEL_INFO.LayerWidth[3];
			var lh = J2L.LEVEL_INFO.LayerHeight[3];
			if(currentLayer === 3 && tileX < lw && tileY < lh) {
				evt = J2L.EVENTS[tileX + lw*tileY];
				id = evt & (Math.pow(2, 8)-1);
				if(id > 0) {
					difficulty = (evt & (Math.pow(2, 10)-1)) >> 8; // bits 8-10 (2)
					illumi = (evt & (Math.pow(2, 11)-1)) >> 10 // bits 10-11 (1)
					params = (evt & (Math.pow(2, 32)-1)) >> 12; // bits 12-32 (20)
					var paramsamount = JCSini.Events[id].length - 5;
					var paramstr = [];
					var paramoffset = 0;
					var param = 0;
					var paramArray = [];
					for(var i=0; i < paramsamount; i+=1) {
						param = (params & (Math.pow(2, paramoffset+Math.abs(JCSini.Events[id][5+i][1]))-1)) >> paramoffset;
						if(JCSini.Events[id][5+i][1] < 0 && param > Math.pow(2, Math.abs(JCSini.Events[id][5+i][1])-1))
							param -= Math.pow(2, Math.abs(JCSini.Events[id][5+i][1]));
						paramstr.push(JCSini.Events[id][5+i][0]+": "+param);
						paramArray.push(param);
						paramoffset += Math.abs(JCSini.Events[id][5+i][1]);
					}
					if(id === 216) id = paramArray[0];
					paramstr = paramstr.join("; ");
					if(paramstr !== "") {
						paramstr = "("+paramstr+")";
					}
					eventInfoSpan.textContent = JCSini.Events[id][0]+" "+paramstr+"";
				}
			}
			if(id === 0) {
				eventInfoSpan.textContent = "";
			}
			
			if(layercanvas.isDragging && !isBSelecting) {
				var lw = J2L.LEVEL_INFO.LayerWidth[currentLayer];
				var lh = J2L.LEVEL_INFO.LayerHeight[currentLayer];
				var scrollX = scrollbars.layers.scroll[0];
				var scrollY = scrollbars.layers.scroll[1];
				var maxw = Math.min(selectedTiles.length, (-offsetX+lw*32*zoomlevel+scrollX)/(32*zoomlevel));
				var maxh = Math.min(selectedTiles[0].length, (-offsetY+lh*32*zoomlevel+scrollY)/(32*zoomlevel));
				
				var oldTiles = updateTiles(currentLayer, tileX, tileY, maxw, maxh, selectedTiles, selectedSource === 'tileset' || holdingShiftKey);
				if(oldTiles) {
					var oldPart = {
						what: 'layer',
						layer: currentLayer,
						startX: tileX,
						startY: tileY, 
						width: maxw,
						height: maxh,
						selection: oldTiles,
						includeEmpty: true
					};
				
					undoStack.push(oldPart);
					redoStack = [];
				
					menuUndo.className = '';
					menuRedo.className = 'disabled';
    			}
				
				if(socket && socket.readyState === 1) {
					sendUpdate({
						what: 'layer',
						layer: currentLayer,
						startX: tileX,
						startY: tileY,
						width: maxw,
						height: maxh,
						selection: selectedTiles,
						includeEmpty: selectedSource === 'tileset' || holdingShiftKey
					});
				}
				if(currentLayer === 3) {
					updateEventPointers();
				}
			}
			if(socket && socket.readyState === 1) {
				socket.send(packStruct([
					'u8',
					'u8',
					'u32',
					'u32'
				], [
					0x09,
					currentLayer,
					rawOffsetX/zoomlevel,
					rawOffsetY/zoomlevel
				]));
			}
		}
		else if(mousetarget === tilesetcanvas) {
			var offsetX = X /*- tilesetcanvas.offsetLeft*/;
			var offsetY = Y - tilesetbounding.top;
			if(Math.ceil(offsetX/32) < 1 || Math.ceil(offsetX/32) > 10)
				tilePositionDiv.style.opacity = "0";
			else {
				tilePositionDiv.style.opacity = "1";
				tilePositionDiv.textContent = "Pos: "+Math.ceil(offsetX/32)+", "+Math.ceil((offsetY+scrollbars.tileset.scroll[1])/32);
			}
		}
		else if(mousetarget === animscanvas) {
			var offsetX = X /*- animsbounding.left*/;
			var offsetY = Y - animsbounding.top;
			var posX = Math.ceil((offsetX-4+scrollbars.anims.scroll[0])/32)-1;
			var posY = Math.ceil((offsetY+scrollbars.anims.scroll[1])/32);
			if(offsetX < 32) posX = 0;
			if(posX < 0 || posY < 1 || posX > 64)
				tilePositionDiv.style.opacity = "0";
			else {
				tilePositionDiv.style.opacity = "1";
				tilePositionDiv.textContent = "Anim: "+posY+(posX>0?" Frame: "+posX:"");
			}
		}
	};
	var scrollwheel = function(e) {
		var deltaX = (e.wheelDeltaX/120)*64;
		var deltaY = (e.wheelDeltaY/120)*64;

		if(mousetarget === layercanvas) {
			scrollbars.layers.scroll[0] -= deltaX;
			scrollbars.layers.scroll[1] -= deltaY;
		}
		else if(mousetarget === animscanvas) {
			scrollbars.anims.scroll[0] -= deltaX;
			scrollbars.anims.scroll[1] -= deltaY;
		}
		else if(mousetarget === tilesetcanvas) {
			scrollbars.tileset.scroll[0] -= deltaX;
			scrollbars.tileset.scroll[1] -= deltaY;
		}
	};
	var winkeydown = function (e) {
		var kc = e.keyCode;
		var deltaX = 0, deltaY = 0;
		var knum = +String.fromCharCode(kc);
		var kchar = String.fromCharCode(kc);
		var tilesetbounding = tilesetcanvas.getBoundingClientRect();
		var animsbounding = animscanvas.getBoundingClientRect();
		var layerbounding = layercanvas.getBoundingClientRect();
		var parallaxbounding = parallaxcanvas.getBoundingClientRect();
		
		if(mousetarget === tilesetcanvas) {
			if((kc === 84 || kc === 67) && !holdingTileTypeKey) {
				var offx = mousepos[0] /*- tilesetbounding.left*/;
				var offy = mousepos[1] - tilesetbounding.top;
				holdingTileTypeKey = true;
				if(offx >= 0 && offx < 320) {
					var tilex = Math.floor(offx/32);
					var tiley = Math.floor((offy+scrollbars.tileset.scroll[1])/32);
					if(tiley < currentTileset.height/32) {
						var tt = J2L.TilesetProperties.TileType[tilex+(tiley*10)];
						var newtt = kc === 84 ? 1 : 4;
						if(tt === newtt) tt = 0;
						else tt = newtt;
						if(tilex+(tiley*10) > 0) {
							J2L.TilesetProperties.TileType[tilex+(tiley*10)] = tt;
							if(socket && socket.readyState === 1) {
								sendUpdate({
									what: 'tiletype',
									type: tt,
									pos: tilex+(tiley*10)
								});
							}
						}
						e.preventDefault();
					}
				}
			}
		}
		if(mousetarget === layercanvas || mousetarget === animscanvas || mousetarget === tilesetcanvas) {
			var what = "";
			if(mousetarget === layercanvas) what = 'layers';
			else if(mousetarget === animscanvas) what = 'anims';
			else what = 'tileset';
			if(kc === 37) deltaX = 1;
			else if(kc === 38) deltaY = 1;
			else if(kc === 39) deltaX = -1;
			else if(kc === 40) deltaY = -1;
			if(deltaX !== 0 || deltaY !== 0) {
				scrollbars[what].scroll[0] -= deltaX*32;
				scrollbars[what].scroll[1] -= deltaY*32;
				e.preventDefault();
			}
			else if(kc === 36) {
				scrollbars[what].scroll[1] = 0;
				e.preventDefault();
			}
			else if(kc === 35) {
				scrollbars[what].scroll[1] = scrollbars[what].contentSize[1];
				e.preventDefault();
			}
		}
		if(kchar === "F" && mousetarget === layercanvas) {
			selectedTiles.reverse();
			for(var x=0, w = selectedTiles.length; x < w; x+=1) {
				for(var y=0, h = selectedTiles[x].length; y < h; y+=1) {
					selectedTiles[x][y].flipped = !selectedTiles[x][y].flipped;
				}
			}
			e.preventDefault();
		}
		if(knum > 0 && knum < 9 && mousetarget === layercanvas) {
			changeLayer(knum-1);
			e.preventDefault();
		}
		if(kc === 8 && mousetarget === layercanvas) {
			selectedTiles = [[{'id': 0, 'animated': false, 'flipped': false, 'event': 0}]];
			selectedSource = 'tileset';
			e.preventDefault();
		}
		else if(kc === 16) {
			holdingShiftKey = true;
		}
		else if(kc === 17) {
			holdingCtrlKey = true;
		}
		else if(kc === 46) {
			if(mousetarget === animscanvas && animSelection !== false && animSelection[1] < J2L.ANIMS.length && animSelection[0]-1 < J2L.ANIMS[animSelection[1]].Frames) {
				if(animSelection[0] > 0) {
					J2L.ANIMS[animSelection[1]].Frames-=1;
					J2L.ANIMS[animSelection[1]].Tiles.splice(animSelection[0]-1, 1);
					if(socket && socket.readyState === 1) {
						sendUpdate({
							what: 'anims',
							type: 'delFrame',
							anim: animSelection[1],
							frame: animSelection[0]-1
						});
					}
				}
				if(animSelection[0] === 0 || J2L.ANIMS[animSelection[1]].Frames === 0) {
					J2L.ANIMS.splice(animSelection[1], 1);
					if(socket && socket.readyState === 1) {
						sendUpdate({
							what: 'anims',
							type: 'delAnim',
							anim: animSelection[1],
						});
					}
					if(animSelection[1] > J2L.ANIMS.length) {
						animSelection[1] = J2L.ANIMS.length;
					}
					/*if(animSelection[1] === J2L.ANIMS.length) {
						var x, y;
						for(x=0; x < selectedTiles.length; x+=1) {
							for(y=0; y < selectedTiles[0].length; y+=1) {
								if(selectedTiles[x][y].animated === true && selectedTiles[x][y].id === animSelection[1]) {
									selectedTiles[x][y] = {'id': 0, 'animated': false, 'flipped': false, 'event': 0};
								}
							}
						}
					}*/
				}
				if(J2L.ANIMS.length === 0) {
					animSelection = [0, 0];
				}
			}
			
			e.preventDefault();
		}
		else if(kc === 66) {
			if(mousetarget === layercanvas && !holdingBKey) {
				var offx = Math.floor((mousepos[0] - layerbounding.left + scrollbars.layers.scroll[0])/32);
				var offy = Math.floor((mousepos[1] - layerbounding.top + scrollbars.layers.scroll[1])/32);
				if(offx < J2L.LEVEL_INFO.LayerWidth[currentLayer] && offy < J2L.LEVEL_INFO.LayerHeight[currentLayer]) {
					isBSelecting = !isBSelecting;
					if(isBSelecting) {
						BSelectStart = [mousepos[0] - layerbounding.left + scrollbars.layers.scroll[0], mousepos[1] - layerbounding.top + scrollbars.layers.scroll[1]];
					}
					else {
						if(BSelection) {
							var x, y, lw = J2L.LEVEL_INFO.LayerWidth[currentLayer];
							selectedTiles = [];
							selectedSource = 'layers';
							for(x=0; x < BSelection[2]; x+=1) {
								selectedTiles[x] = [];
								for(y=0; y < BSelection[3]; y+=1) {
									selectedTiles[x][y] = {
										'id': J2L.LEVEL[currentLayer][BSelection[0]+x][BSelection[1]+y].id,
										'animated': J2L.LEVEL[currentLayer][BSelection[0]+x][BSelection[1]+y].animated,
										'flipped': J2L.LEVEL[currentLayer][BSelection[0]+x][BSelection[1]+y].flipped
									};
									if(currentLayer === 3) {
										selectedTiles[x][y].event = J2L.EVENTS[BSelection[0]+x + lw*(BSelection[1]+y)];
									}
								}
							}
						}
					}
				}
				e.preventDefault();
			}
			holdingBKey = true;
		}
		else if(kc === 67) {
			if(mousetarget === animscanvas && animSelection !== false && animSelection[0] === 0 && animSelection[1] < J2L.ANIMS.length) {
				J2L.ANIMS.push(JSON.parse(JSON.stringify(J2L.ANIMS[animSelection[1]])));
				if(socket && socket.readyState === 1) {
					sendUpdate({
						what: 'anims',
						type: 'clone',
						anim: animSelection[1],
					});
				}
				e.preventDefault();
			}
		}
		else if(kc === 70) {
			holdingFlipKey = true;
			if(holdingCtrlKey) {
				e.preventDefault();
			}
		}
		if(e.altKey && kchar === "N") {
			menuNewLevel();
			e.preventDefault();
		}
		else if(e.ctrlKey && kchar === "O") {
			menuOpenLevel();
			e.preventDefault();
		}
		else if(e.ctrlKey && kchar === "S") {
			if(e.shiftKey) {
				writeLevel({save: true, newfile: true});
			}
			else {
				
			}
			e.preventDefault();
		}
		else if(e.ctrlKey && kchar === "R") {
			if(!serverInfo.isCollab) {
				if(e.shiftKey) {
					//writeLevel({run: true, save: true});
				}
				else {
					writeLevel({run: true, save: false});
				}
			}
			e.preventDefault();
		}
		
		if(((mousetarget === layercanvas && currentLayer === 3) || mousetarget === tilesetcanvas) && kchar === "E") {
			if(mousetarget === layercanvas) {
				var offx = mousepos[0] - layerbounding.left;
				var offy = mousepos[1] - layerbounding.top;
			}
			else {
				var offx = mousepos[0] - tilesetbounding.left;
				var offy = mousepos[1] - tilesetbounding.top;
			}
			if(e.shiftKey) { // Paste
				pasteEvent(offx, offy, mousetarget);
				e.preventDefault();
			}
			else if(e.ctrlKey) { // Grab
				grabEvent(offx, offy, mousetarget);
				e.preventDefault();
			}
			else { // Select
				selectEvent(offx, offy, mousetarget);
				e.preventDefault();
			}
		}
		if(mousetarget === layercanvas && e.ctrlKey && kchar === "Z") {
			if(e.shiftKey) {
				doRedo();
			}
			else {
				doUndo();
			}
			e.preventDefault();
		}
	};
	var winkeyup = function (e) {
		var kc = e.keyCode;
		if(kc === 16) {
			holdingShiftKey = false;
		}
		else if(kc === 17) {
			holdingCtrlKey = false;
		}
		else if(kc === 70) {
			holdingFlipKey = false;
		}
		else if(kc === 66) {
			holdingBKey = false;
		}
		else if(kc === 84 || kc === 67) {
			holdingTileTypeKey = false;
		}
	};
	
	var mouseOnScrollbars = function (what, w, h, offsetX, offsetY, e) {
		var show = showWhatScrollbars(what, w, h);
		var showX = show[0];
		var showY = show[1];
		var addX = showY? 17 : 0;
		var addY = showX? 17 : 0;
		var bar = "";
		var onScrollArea = false;
		if(showX && offsetY > h-17) {
			onScrollArea = true;
			if(e.which === 1) {
				// Drag slider
				if(offsetX > 17+scrollbars[what].gripPosition[0] && offsetX < 17+scrollbars[what].gripPosition[0]+scrollbars[what].gripSize[0] && offsetY > h-17 && offsetY < h) {
					scrollbars[what].offset[0] = offsetX - 21 - scrollbars[what].gripPosition[0];
					bar = "X";
				}
				else if(offsetX > 17 && offsetX < w-17-addX && offsetY > h-17 && offsetY < h) { // Click trackbar
					scrollbars[what].offset[0] = scrollbars[what].gripSize[0]/2;
					bar = "X";
				}
				else if(offsetX > 0 && offsetX < 17 && offsetY > h-17 && offsetY < h) { // Left arrow
					scrollbars[what].scroll[0] -= 32;
				}
				else if(offsetX > w-17-addX && offsetX < w-addX && offsetY > h-17 && offsetY < h) { // Right arrow
					scrollbars[what].scroll[0] += 32;
				}
			}
		}
		else if(showY && offsetX > w-17) {
			onScrollArea = true;
			if(e.which === 1) {
				// Drag slider
				if(offsetY > 17+scrollbars[what].gripPosition[1] && offsetY < 17+scrollbars[what].gripPosition[1]+scrollbars[what].gripSize[1] && offsetX > w-17 && offsetX < w) {
					scrollbars[what].offset[1] = offsetY - 21 - scrollbars[what].gripPosition[1];
					bar = "Y";
				}
				else if(offsetY > 17 && offsetY < h-17-addY && offsetX > w-17 && offsetX < w) { // Click trackbar
					scrollbars[what].offset[1] = scrollbars[what].gripSize[1]/2;
					bar = "Y";
				}
				else if(offsetY > 0 && offsetY < 17 && offsetX > w-17 && offsetX < w) { // Up arrow
					scrollbars[what].scroll[1] -= 32;
				}
				else if(offsetY > h-17-addY && offsetY < h-addY && offsetX > w-17 && offsetX < w) { // Down arrow
					scrollbars[what].scroll[1] += 32;
				}
			}
		}
		if((showX || showY) && offsetX > w-17 && offsetY > h-17) {
			onScrollArea = true;
		}
		if(!onScrollArea)
			return false;
		scrollbars[what].bar = bar;
		scrollingWhat = what;
		winmove(e);
		return true;
	};
	
	var showWhatScrollbars = function (what, w, h) {
		var showX = true;
		var showY = true;
		if(w > scrollbars[what].contentSize[0] && h > scrollbars[what].contentSize[1]) {
			showX = false;
			showY = false;
		}
		else if(w-17 > scrollbars[what].contentSize[0]-1) {
			showX = false;
		}
		else if(h-17 > scrollbars[what].contentSize[1]-1) {
			showY = false;
		}
		return [showX?1:0, showY?1:0];
	};
	
	var drawScrollbars = function (c, what, w, h) {
		c.save();
		
		var show = showWhatScrollbars(what, w, h);
		var showX = show[0];
		var showY = show[1];
			
		var w2 = w-showY*17;
		var h2 = h-showX*17;
		
		var addX = showX===1 && showY===0? 17 : 0;
		var addY = showY===1 && showX===0? 17 : 0;
		
		var gripRatioX = w/(scrollbars[what].contentSize[0] + 17-addX);
		var gripRatioY = h/(scrollbars[what].contentSize[1] + 17-addY);
		
		var trackSizeX = w-52+addX;
		var trackSizeY = h-52+addY;
		var minGripSize = 17;
		var maxGripSizeX = trackSizeX;
		var maxGripSizeY = trackSizeY;
		
		var scrollX = scrollbars[what].scroll[0];
		var scrollY = scrollbars[what].scroll[1];
		
		var trackColor = [48, 48, 48]; //"#204a2e";
		var borderColor = [64, 64, 64]; //"#bee2c9";
		var buttonColor = [100, 100, 100]; //"#6f967c";
		var sliderColor = [180, 180, 180]; //"#bee2c9";
		
		c.lineWidth = 1.5;
		var grad;
		
		if(showX) {
			grad = c.createLinearGradient(0, h-17, 0, h);
			grad.addColorStop(0, "rgb("+Math.round(trackColor[0]*0.8)+", "+Math.round(trackColor[1]*0.8)+", "+Math.round(trackColor[2]*0.8)+")");
			grad.addColorStop(1, "rgb("+Math.round(trackColor[0]*1.2)+", "+Math.round(trackColor[1]*1.2)+", "+Math.round(trackColor[2]*1.2)+")");
			c.fillStyle = grad;
			c.fillRect(0, h-17, w-17+addX, 17); // Background
			
			// Small line, much code
			c.strokeStyle = "rgb("+borderColor.join(", ")+")";
			c.beginPath();
			c.moveTo(0, h-16.5);
			c.lineTo(w-addX, h-16.5);
			c.stroke();
			//c.strokeRect(18-0.5, h-15-0.5, w-18*3+addX+3, 14); // Stroke
			
			grad = c.createLinearGradient(0, h-17, 0, h);
			grad.addColorStop(0, "rgb("+Math.round(buttonColor[0]*1.2)+", "+Math.round(buttonColor[1]*1.2)+", "+Math.round(buttonColor[2]*1.2)+")");
			grad.addColorStop(1, "rgb("+Math.round(buttonColor[0]*0.8)+", "+Math.round(buttonColor[1]*0.8)+", "+Math.round(buttonColor[2]*0.8)+")");
			c.fillStyle = grad;
			
			// Left corner
			c.beginPath();
			c.moveTo(0, h);
			c.lineTo(0, h-17);
			c.arc(17+17/2, h-17/2, 17/2, -Math.PI/2, Math.PI/2, true);
			c.closePath();
			c.fill();
			//c.fillRect(0, h-17, 18, 17); // Left corner
			
			// Right corner
			c.beginPath();
			c.moveTo(w+addX, h);
			c.lineTo(w+addX, h-17);
			c.arc(w+addX-17*2-17/2, h-17/2, 17/2, -Math.PI/2, Math.PI/2, false);
			c.closePath();
			c.fill();
			//c.fillRect(w-15*2-1+addX-0.5, h-15-0.5, 14, 14);
			
			c.save();
			c.translate(4+4.5, h-13+4.5); // Left arrow
			c.rotate(Math.PI);
			c.drawImage(scrollarrow, -4.5, -4.5);
			c.restore();
			
			c.save();
			c.translate(w-15*2+1+4.5+addX, h-13+4.5); // Right arrow (no rotation)
			c.drawImage(scrollarrow, -4.5, -4.5);
			c.restore();
		}
		if(showY) {
			grad = c.createLinearGradient(w-17, 0, w, 0);
			grad.addColorStop(0, "rgb("+Math.round(trackColor[0]*0.8)+", "+Math.round(trackColor[1]*0.8)+", "+Math.round(trackColor[2]*0.8)+")");
			grad.addColorStop(1, "rgb("+Math.round(trackColor[0]*1.2)+", "+Math.round(trackColor[1]*1.2)+", "+Math.round(trackColor[2]*1.2)+")");
			c.fillStyle = grad;
			c.fillRect(w-17, 0, 17, h-17+addY); // Background
			
			// Small line, much code
			c.strokeStyle = "rgb("+borderColor.join(", ")+")";
			c.beginPath();
			c.moveTo(w-16.5, 0);
			c.lineTo(w-16.5, h-addX);
			c.stroke();
			//c.strokeRect(w-15-0.5, 18-0.5, 14, h-18*3+addY+3); // Stroke
			
			grad = c.createLinearGradient(w-17, 0, w, 0);
			grad.addColorStop(0, "rgb("+Math.round(buttonColor[0]*1.2)+", "+Math.round(buttonColor[1]*1.2)+", "+Math.round(buttonColor[2]*1.2)+")");
			grad.addColorStop(1, "rgb("+Math.round(buttonColor[0]*0.8)+", "+Math.round(buttonColor[1]*0.8)+", "+Math.round(buttonColor[2]*0.8)+")");
			c.fillStyle = grad;
			
			// Top corner
			c.beginPath();
			c.moveTo(w, 0);
			c.lineTo(w-17, 0);
			c.arc(w-17/2, 17+17/2, 17/2, Math.PI, 0, false);
			c.closePath();
			c.fill();
			//c.strokeRect(w-15-0.5, 2-0.5, 14, 14);
			
			// Bottom corner
			c.beginPath();
			c.moveTo(w, h+addY);
			c.lineTo(w-17, h+addY);
			c.arc(w-17/2, h+addY-17*2-17/2, 17/2, Math.PI, 0, true);
			c.closePath();
			c.fill();
			//c.strokeRect(w-15-0.5, h-15*2-2+addY-0.5+1, 14, 14);
			
			c.save();
			c.translate(w-13+4.5, 4+4.5); // Up arrow
			c.rotate(Math.PI*1.5);
			c.drawImage(scrollarrow, -4.5, -4.5);
			c.restore();
			
			c.save();
			c.translate(w-13+4.5, h-15*2+4.5+addY+1); // Down arrow
			c.rotate(Math.PI/2);
			c.drawImage(scrollarrow, -4.5, -4.5);
			c.restore();
		}
		if(showX && showY) {
			grad = c.createLinearGradient(w-17, h-17, w, h);
			grad.addColorStop(0, "rgb("+Math.round(buttonColor[0]*0.8)+", "+Math.round(buttonColor[1]*0.8)+", "+Math.round(buttonColor[2]*0.8)+")");
			grad.addColorStop(1, "rgb("+Math.round(buttonColor[0]*1.0)+", "+Math.round(buttonColor[1]*1.0)+", "+Math.round(buttonColor[2]*1.0)+")");
			c.fillStyle = grad;
			c.fillRect(w-16, h-16, 17, 17);
			c.strokeStyle = "rgba("+borderColor.join(", ")+", 0.5)";
			c.strokeRect(w-17, h-17, 17, 17);
		}
		
		
		if(showX)
			scrollbars[what].gripSize[0] = trackSizeX * gripRatioX;
		if(showY)
			scrollbars[what].gripSize[1] = trackSizeY * gripRatioY;
		
		if(showX) {
			if(scrollbars[what].gripSize[0] < minGripSize) {
				scrollbars[what].gripSize[0] = minGripSize;
			}
			else if(scrollbars[what].gripSize[0] > maxGripSizeX) {
				scrollbars[what].gripSize[0] = maxGripSizeX;
			}
		}
		if(showY) {
			if(scrollbars[what].gripSize[1] < minGripSize) {
				scrollbars[what].gripSize[1] = minGripSize;
			}
			else if(scrollbars[what].gripSize[1] > maxGripSizeY) {
				scrollbars[what].gripSize[1] = maxGripSizeY;
			}
		}
		if(showX)
			scrollbars[what].scrollSize[0] = trackSizeX - scrollbars[what].gripSize[0];
		if(showY)
			scrollbars[what].scrollSize[1] = trackSizeY - scrollbars[what].gripSize[1];
		if(showX)
			var scrollRatioX = scrollX / (scrollbars[what].contentSize[0]-w2);
		if(showY)
			var scrollRatioY = scrollY / (scrollbars[what].contentSize[1]-h2);
		if(showX)
			if(isNaN(scrollRatioX)) scrollRatioX = 0;
		if(showY)
			if(isNaN(scrollRatioY)) scrollRatioY = 0;
		if(showX)
			scrollbars[what].gripPosition[0] = scrollbars[what].scrollSize[0] * scrollRatioX;
		if(showY)
			scrollbars[what].gripPosition[1] = scrollbars[what].scrollSize[1] * scrollRatioY;
		
		
		//c.fillText(showX+" "+showY, 20, 50);
		if(showX) {
			grad = c.createLinearGradient(0, h-17, 0, h);
			grad.addColorStop(0, "rgb("+Math.round(sliderColor[0]*1.2)+", "+Math.round(sliderColor[1]*1.2)+", "+Math.round(sliderColor[2]*1.2)+")");
			grad.addColorStop(1, "rgb("+Math.round(sliderColor[0]*0.8)+", "+Math.round(sliderColor[1]*0.8)+", "+Math.round(sliderColor[2]*0.8)+")");
			c.fillStyle = grad;
			c.beginPath();
			c.arc(17.5 + scrollbars[what].gripPosition[0] + scrollbars[what].gripSize[0] - 17/2, h-17+17/2, 17/2, -Math.PI/2, Math.PI/2, false);
			c.arc(17.5 + scrollbars[what].gripPosition[0] + 17/2, h-17+17/2, 17/2, Math.PI/2, -Math.PI/2, false);
			c.closePath();
			c.fill();
			//c.fillRect(19 + Math.round(scrollbars[what].gripPosition[0]), h-16, Math.round(scrollbars[what].gripSize[0]), 16);
		}
		if(showY) {
			grad = c.createLinearGradient(w-17, 0, w, 0);
			grad.addColorStop(0, "rgb("+Math.round(sliderColor[0]*1.2)+", "+Math.round(sliderColor[1]*1.2)+", "+Math.round(sliderColor[2]*1.2)+")");
			grad.addColorStop(1, "rgb("+Math.round(sliderColor[0]*0.8)+", "+Math.round(sliderColor[1]*0.8)+", "+Math.round(sliderColor[2]*0.8)+")");
			c.fillStyle = grad;
			c.beginPath();
			c.arc(w-17+17/2, 17.5 + scrollbars[what].gripPosition[1] + scrollbars[what].gripSize[1] - 17/2, 17/2, 0, Math.PI, false);
			c.arc(w-17+17/2, 17.5 + scrollbars[what].gripPosition[1] + 17/2, 17/2, Math.PI, 0, false);
			c.closePath();
			c.fill();
			//c.fillRect(w-14, 19 + Math.round(scrollbars[what].gripPosition[1]), 11, Math.round(scrollbars[what].gripSize[1]));
		}
		
		c.restore();
	};
	
	var redraw = function (future, forced) {
		if(!forced && (/*Popup.isOpen() || Colorpicker.isOpen() ||*/ (global.document.webkitHidden === undefined ? !windowFocus : global.document.webkitHidden))) {
			requestAnimFrame(redraw, layercanvas);
			return;
		}
		var w = layerdiv.offsetWidth;
		var h = layerdiv.offsetHeight;
		/*if(layercanvas.width !== w) {
			layercanvas.width = w;
			layercanvas.style.width = w+"px";
		}
		if(layercanvas.height !== h) {
			layercanvas.height = h;
			layercanvas.style.height = h+"px";
		}*/
		lc.fillStyle = darkBgColor;
		lc.fillRect(0, 0, w, h);
		scrollbars.layers.contentSize = [1, 1];
		var x, y, id, tile, trans;
		var l, lw, lh, i, tile, drawn, scrollX, scrollY, pos;
		var evt, difficulty, params, illumi, movetext = 0;
		drawn = 0;
		
		l = currentLayer;
		lw = J2L.LEVEL_INFO.LayerWidth[l];
		lh = J2L.LEVEL_INFO.LayerHeight[l];
		scrollbars.layers.contentSize[0] = lw*32*zoomlevel;
		scrollbars.layers.contentSize[1] = lh*32*zoomlevel;
		
		var scrollX = scrollbars.layers.scroll[0];
		var scrollY = scrollbars.layers.scroll[1];
		var show = showWhatScrollbars('layers', w, h);
		if(scrollX > scrollbars.layers.contentSize[0]-w+show[1]*17) {scrollX = scrollbars.layers.contentSize[0]-w+show[1]*17;}
		if(scrollY > scrollbars.layers.contentSize[1]-h+show[0]*17) {scrollY = scrollbars.layers.contentSize[1]-h+show[0]*17;}
		if(scrollX < 0) scrollX = 0;
		if(scrollY < 0) scrollY = 0;
		scrollbars.layers.scroll[0] = scrollX;
		scrollbars.layers.scroll[1] = scrollY;	
		
		var frametick = (new Date().getTime() - starttime)/1000;
		var offx = Math.floor(scrollX/(32*zoomlevel));
		var offy = Math.floor(scrollY/(32*zoomlevel));
		var offw = Math.ceil(w/(32*zoomlevel));
		var offh = Math.ceil(h/(32*zoomlevel));
		lc.fillStyle = lightBgColor;
		lc.fillRect(0, 0, Math.min(lw*32*zoomlevel-scrollX, w), Math.min(lh*32*zoomlevel-scrollY, h));
		for(x = offx; x <= offx+offw; x+=1) {
			for(y = offy; y <= offy+offh; y+=1) {
				if(x >= lw || y >= lh) continue;
				tile = getTile(frametick, J2L.LEVEL[l][x][y]);
				drawTile(lc, Math.floor(x*32*zoomlevel-scrollX), Math.floor(y*32*zoomlevel-scrollY), lw, tile, showLayerMask, zoomlevel);
				
				if(showLayerEvents && l === 3) {
					drawEvent(lc, Math.floor(x*32*zoomlevel-scrollX), Math.floor(y*32*zoomlevel-scrollY), J2L.EVENTS[x+y*lw], zoomlevel);
				}
			}
			if(x % 4 === 3 && x-3 < lw && localStorage['WebJCS_toggleWordLines'] === '1') {
				lc.fillStyle = 'rgba(0, 0, 0, 0.3)';
				lc.lineWidth = 1;
				lc.fillRect(Math.floor((x-3)*32*zoomlevel-scrollX), 0, 1, Math.min(lh*32*zoomlevel-scrollY, h));
			}
		}
		
		if(showLayerEvents && l === 3 && localStorage['WebJCS_toggleEventLinks'] !== '0') {
			lc.lineWidth = 1;
			lc.globalAlpha = 0.5;
			for(var i in eventPointerCache) {
				var startPos = idXY(parseInt(i, 10), lw);
				startPos[0] = Math.floor((startPos[0]*32+16)*zoomlevel-scrollX)+0.5;
				startPos[1] = Math.floor((startPos[1]*32+16)*zoomlevel-scrollY)+0.5;
				var targets = eventPointerCache[i];
				for(var j=0; j < targets.length; j+=1) {
					var endPos = idXY(targets[j], lw);
					endPos[0] = Math.floor((endPos[0]*32+16)*zoomlevel-scrollX)+0.5;
					endPos[1] = Math.floor((endPos[1]*32+16)*zoomlevel-scrollY)+0.5;
					var midPos = [(startPos[0]+endPos[0])/2, (startPos[1]+endPos[1])/2];
					var grad = lc.createLinearGradient(startPos[0], startPos[1], endPos[0], endPos[1]);
					grad.addColorStop(0, '#0F6');
					grad.addColorStop(1, '#F66');
					lc.strokeStyle = grad;
					lc.beginPath();
					lc.moveTo(startPos[0], startPos[1]);
					lc.lineTo(endPos[0], endPos[1]);
					lc.stroke();
				}
			}
			lc.globalAlpha = 1;
		}
		
		var layerbounding = layercanvas.getBoundingClientRect();
		if(isBSelecting) {
			
			var endX, endY, selX, selY, selW, selH;
			endX = mousepos[0] - layerbounding.left + scrollX;
			endY = mousepos[1] - layerbounding.top + scrollY;
			selX = Math.floor(Math.min(BSelectStart[0], endX)/(32*zoomlevel));
			selY = Math.floor(Math.min(BSelectStart[1], endY)/(32*zoomlevel));
			if(selX < 0) selX = 0;
			if(selY < 0) selY = 0;
			selW = Math.ceil((Math.max(BSelectStart[0], endX))/(32*zoomlevel)) - selX;
			selH = Math.ceil((Math.max(BSelectStart[1], endY))/(32*zoomlevel)) - selY;
			if(selX+selW > J2L.LEVEL_INFO.LayerWidth[currentLayer]) selW = J2L.LEVEL_INFO.LayerWidth[currentLayer]-selX;
			if(selY+selH > J2L.LEVEL_INFO.LayerHeight[currentLayer]) selH = J2L.LEVEL_INFO.LayerHeight[currentLayer]-selY;
			selW = Math.max(selW, 1);
			selH = Math.max(selH, 1);
			BSelection = [selX, selY, selW, selH];
			lc.save();
			lc.globalCompositeOperation = "lighter";
			lc.fillStyle = "rgb(40, 40, 40)";
			lc.strokeStyle = "rgb(70, 70, 70)";
			lc.lineWidth = 3;
			lc.fillRect(Math.floor(selX*32*zoomlevel-scrollX), Math.floor(selY*32*zoomlevel-scrollY), selW*32*zoomlevel, selH*32*zoomlevel);
			lc.strokeRect(Math.floor(selX*32*zoomlevel-scrollX)-1.5, Math.floor(selY*32*zoomlevel-scrollY)-1.5, selW*32*zoomlevel+3, selH*32*zoomlevel+3);
			lc.restore();
		}
		else if(mousepos && mousetarget === layercanvas) {
			//offx = Math.max(Math.floor((mousepos[0] - layercanvas.offsetLeft)/(32*zoomlevel))*32*zoomlevel, 0);
			//offy = Math.max(Math.floor((mousepos[1] - layercanvas.offsetTop)/(32*zoomlevel))*32*zoomlevel, 0);
			offx = Math.floor((mousepos[0] - layerbounding.left + scrollX)/(32*zoomlevel))*(32*zoomlevel);
			offy = Math.floor((mousepos[1] - layerbounding.top + scrollY)/(32*zoomlevel))*(32*zoomlevel);
			lc.save();
			var maxw = Math.min(selectedTiles.length, (-offx+lw*32*zoomlevel+scrollX)/(32*zoomlevel));
			var maxh = Math.min(selectedTiles[0].length, (-offy+lh*32*zoomlevel+scrollY)/(32*zoomlevel));
			//lc.fillText(maxw, 20, 70);
			lc.translate(Math.floor(offx - scrollX), Math.floor(offy - scrollY));
			//lc.fillStyle = "rgb(68, 42, 147)";
			lc.fillStyle = "rgb(255, 255, 255)";
			if (offx < lw*32*zoomlevel && offy < lh*32*zoomlevel) {
				lc.strokeStyle = "rgba(255, 255, 255, 0.25)";
				lc.lineWidth = 3;
				lc.strokeRect(-1.5, -1.5, maxw*32*zoomlevel+3, maxh*32*zoomlevel+3);
				lc.lineWidth = 1;
			}
			//lc.fillRect(0, 0, maxw*32*zoomlevel, maxh*32*zoomlevel);
			for(x = 0; x < maxw; x+=1) {
				for(y = 0; y < maxh; y+=1) {
					if(selectedTiles[x][y].id > 0 || selectedTiles[x][y].animated) {
						lc.globalAlpha = 0.5;
						drawTile(lc, x*32*zoomlevel, y*32*zoomlevel, lw, getTile(frametick, selectedTiles[x][y]), showLayerMask, zoomlevel);
					}
					if(holdingShiftKey || selectedTiles[x][y].id > 0 || selectedTiles[x][y].animated || (selectedTiles.length===1 && selectedTiles[x].length === 1) || selectedSource === 'tileset') {
						if(selectedTiles[x][y].event > 0) {
							/*lc.save();
							lc.globalAlpha = 0.25;
							lc.fillStyle = 'black';
							lc.fillRect(x*32*zoomlevel, y*32*zoomlevel, 32*zoomlevel, 32*zoomlevel);
							lc.restore();*/
							drawEvent(lc, Math.floor(x*32*zoomlevel), Math.floor(y*32*zoomlevel), selectedTiles[x][y].event, zoomlevel);
						}
						else {
							lc.globalAlpha = 0.15;
							lc.fillRect(x*32*zoomlevel, y*32*zoomlevel, 32*zoomlevel, 32*zoomlevel);
						}
					}
				}
			}
			lc.restore();
		}
		lc.save();
		lc.font = ""+Math.round(13*zoomlevel)+"px Tahoma, sans-serif";
		lc.fillStyle = 'white';
		lc.strokeStyle = 'rgba(0, 0, 0, 0.5)';
		lc.lineWidth = 1;
		lc.textBaseline = 'middle';
		for(var i=0; i < cursorList.length; i+=1) {
			if(!cursorList[i]) {
				continue;
			}
			if(currentLayer === cursorList[i].layer && userlist[i]) {
				lc.fillRect(Math.floor(cursorList[i].x*zoomlevel - scrollX-1), Math.floor(cursorList[i].y*zoomlevel - scrollY-1), 2, 2);
				lc.strokeText(userlist[i].username, Math.floor(cursorList[i].x*zoomlevel - scrollX + 4), Math.floor(cursorList[i].y*zoomlevel - scrollY -1));
				lc.fillText(userlist[i].username, Math.floor(cursorList[i].x*zoomlevel - scrollX + 4), Math.floor(cursorList[i].y*zoomlevel - scrollY -1));
			}
		}
		lc.restore();
		
		drawScrollbars(lc, 'layers', w, h);
		
		//lc.fillStyle = "white";
		//redrawParallax();
		/*var fps = 1000/(new Date().getTime()-future);*/
		//lc.fillText("Fps: "+Math.round(fps)+" ("+Math.round(1000/fps)+" ms)", 20, 20);
		//lc.fillText("Zoom level: "+zoomlevel*100+"%", 20, 40);
		//setTimeout(redraw, 1000/30);
		//requestAnimFrame(redraw, layercanvas);
		
		var w = parallaxdiv.offsetWidth;
		var h = parallaxdiv.offsetHeight;
		/*if(parallaxcanvas.width !== w) {
			parallaxcanvas.width = w;
		}
		if(parallaxcanvas.height !== h) {
			parallaxcanvas.height = h;
		}*/
		
		var layerw = layercanvas.width;
		var layerh = layercanvas.height;
		var frametick = (new Date().getTime() - starttime)/1000;
		var l, lw, lh, x, y, drawn, trans, tile, id, offx, offy, offw, offh, speedX, speedY, tileW, tileH, rx, ry;
		var evt, id;
		var limitvisibleregion;
		var autoSpeedX, autoSpeedY;
		var layeroffx, layeroffy;
		
		var isTextured = (J2L.LEVEL_INFO.LayerProperties[7] & 8) >> 3 === 1;
		var showTexture = isTextured && texturedBackground;
		
		pxc.fillStyle = showTexture? 'black' : lightBgColor;
		pxc.fillRect(0, 0, w, h);
		
		l = 8;
		drawn = 0;
		var pos;
		var scrollX = Math.max(Math.min((scrollbars.layers.scroll[0]/zoomlevel+(layercanvas.width/zoomlevel)/2-w/2)/J2L.LEVEL_INFO.LayerXSpeed[currentLayer], J2L.LEVEL_INFO.LayerWidth[3]*32-w), 0) || 0;
		var scrollY = Math.max(Math.min((scrollbars.layers.scroll[1]/zoomlevel+(layercanvas.height/zoomlevel)/2-h/2)/J2L.LEVEL_INFO.LayerYSpeed[currentLayer], J2L.LEVEL_INFO.LayerHeight[3]*32-h), 0) || 0;
		if(mousedownpos && mousepos && parallaxcanvas.isDragging) {
			scrollX -= mousepos[0] - mousedownpos[0];
			scrollY -= mousepos[1] - mousedownpos[1];
		}
		
		offw = Math.ceil(w/32)+1;
		offh = Math.ceil(h/32)+1;
		var lightpoints = [];
		var drawLaterEvents = [];
		
		if(showParallaxEvents) {
			for(var i=0; i < J2L.EVENTS.length; i++) {
				evt = J2L.EVENTS[i];
				id = evt & 255;
				pos = idXY(i, J2L.LEVEL_INFO.LayerWidth[3]);
				x = pos[0];
				y = pos[1];
				switch(id) {
					case 148:
					case 149:
					case 150:
						lightpoints.push([Math.floor(x*32-scrollX), Math.floor(y*32-scrollY), evt]);
						break;
				}
				if(id > 32 && ANIMS) {
					drawLaterEvents.push([Math.floor(x*32-scrollX), Math.floor(y*32-scrollY), evt, x, y]);
				}
			}
		}
		
		while(l--) {
			tileW = J2L.LEVEL_INFO.LayerProperties[l] & 1 === 1;
			tileH = (J2L.LEVEL_INFO.LayerProperties[l] & 2) >> 1 === 1;
			limitvisibleregion = (J2L.LEVEL_INFO.LayerProperties[l] & 4) >> 2 === 1 && !tileH ? (h-200)/2 : 0;
			lw = J2L.LEVEL_INFO.LayerWidth[l];
			lh = J2L.LEVEL_INFO.LayerHeight[l];
			speedX = J2L.LEVEL_INFO.LayerXSpeed[l];
			speedY = J2L.LEVEL_INFO.LayerYSpeed[l];
			autoSpeedX = J2L.LEVEL_INFO.LayerAutoXSpeed[l];
			autoSpeedY = J2L.LEVEL_INFO.LayerAutoYSpeed[l];
			if(l === 7) {
				speedX = J2L.LEVEL_INFO.LayerXSpeed[4]; // Layer 5...
				speedY = J2L.LEVEL_INFO.LayerYSpeed[4];
				layeroffx = isTextured? (scrollX+w/4)*speedX-w/4+(frametick*autoSpeedX)*32 : 0;
				layeroffy = isTextured? (scrollY+h/4)*speedY-h/4+(frametick*autoSpeedY)*32 : 0;
				if(showTexture) {
					texturedBackground.texc.clearRect(0, 0, 256, 256);	
				}
			}
			else {
				speedX = J2L.LEVEL_INFO.LayerXSpeed[l];
				speedY = J2L.LEVEL_INFO.LayerYSpeed[l];
				layeroffx = (scrollX+w/4)*speedX-w/4+(frametick*autoSpeedX)*32;
				layeroffy = (scrollY+h/4)*speedY-h/4-limitvisibleregion+(frametick*autoSpeedY)*32;
			}
			offx = Math.ceil(layeroffx/32-1);
			offy = Math.ceil(layeroffy/32-1);
			for(x = offx; x < offx+offw; x+=1) {
				if(tileW) {
					rx = x % lw;
					if(rx < 0) rx = lw+rx;
				}
				else rx = x;
				if(rx < 0 || rx >= lw) {
					continue;
				}
				for(y = offy; y < offy+offh; y+=1) {
					if(tileH) {
						ry = y % lh;
						if(ry < 0) ry = lh+ry;
					}
					else ry = y;
					if(ry < 0 || ry >= lh) {
						continue;
					}
					
					drawTile(showTexture && l===7? texturedBackground.texc : pxc, Math.floor(x*32-layeroffx), Math.floor(y*32-layeroffy), lw, getTile(frametick, J2L.LEVEL[l][rx][ry]), false);
					
				}
			}
			
			if(showParallaxEvents && l === 3) {
				for(var i=0; i < drawLaterEvents.length; i+=1) {
					var evt = drawLaterEvents[i][2];
					var id = evt & 0xFF;
					var drawX = drawLaterEvents[i][0];
					var drawY = drawLaterEvents[i][1];
					drawSprite(evt, drawX, drawY, frametick, drawLaterEvents[i][3], drawLaterEvents[i][4]);
				}
			}
			if(l===7 && showTexture && texturedBackground) {
				//texturedBackground.texc.drawImage(parallaxcanvas, 0, 0, 256, 256, 0, 0, 256, 256);
				texturedBackground.changeColor(J2L.LEVEL_INFO.LayerRGB8);
				pxc.clearRect(0, 0, w, h);
				texturedBackground.render();
				//pxc.drawImage(texturedBackground.canvas, 0, 0, w, h);
			}
			
		}
		
		if(showParallaxEvents && pxLightLevel !== 100) {
			lightcanvas.width = w;
			lightcanvas.height = h;
			lightc.clearRect(0, 0, w, h);
			lightc.save();
			lightc.fillStyle = "black";
			lightc.fillRect(0, 0, w, h);
			lightc.globalCompositeOperation = "destination-out";
			lightc.beginPath();
			var r;
			var drawn = 0;
			for(var i=0; i < lightpoints.length; i+=1) {
				evt = lightpoints[i][2];
				id = evt & 255;
				if(id !== 150) continue;
				var params = getEvent(evt).parameters;
				r = 96;
				if(lightpoints[i][0]+16+r >= 0 && lightpoints[i][0]+16-r < w && lightpoints[i][1]+16+r >= 0 && lightpoints[i][1]+16-r < h) {
					lightc.arc(lightpoints[i][0]+16, lightpoints[i][1]+16, r, Math.PI*2, 0, false);
					drawn++;
				}
			}
			lightc.closePath();
			lightc.globalAlpha = 0.5;
			lightc.fill();
			lightc.globalAlpha = 1;
			lightc.beginPath();
			for(var i=0; i < lightpoints.length; i+=1) {
				evt = lightpoints[i][2];
				id = evt & 255;
				if(id === 150) continue;
				var params = getEvent(evt).parameters;
				r = 96;
				if(id === 149) {
					r = Math.max(Math.min(Math.sin((params[0] || 16)*(frametick/2.35)+params[1]/4)*50+50, 96), 0);
				}
				if(lightpoints[i][0]+16+r >= 0 && lightpoints[i][0]+16-r < w && lightpoints[i][1]+16+r >= 0 && lightpoints[i][1]+16-r < h) {
					lightc.arc(lightpoints[i][0]+16, lightpoints[i][1]+16, r, Math.PI*2, 0, false);
					drawn++;
				}
			}
			lightc.closePath();
			lightc.fill();
			lightc.restore();
			pxc.save();
			pxc.globalAlpha = 1-pxLightLevel/100;
			pxc.drawImage(lightcanvas, 0, 0, w, h);
			pxc.restore();
		}
		
		
		pxc.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		pxc.strokeRect(Math.floor(w/2-320)+0.5, Math.floor(h/2-240)+0.5, 640, 480);
		//pxc.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		//pxc.strokeRect(Math.round(w/2-160)+0.5, Math.round(h/2-120)+0.5, 320, 240);
		
		/*var fps = 1000/(new Date().getTime()-future);*/
		//pxc.fillStyle = "white";
		//pxc.fillText("Fps: "+Math.round(fps)+" ("+Math.round(1000/fps)+" ms)", 20, 20);
		
		//requestAnimFrame(redrawParallax, parallaxcanvas);
		
		var w = animsdiv.offsetWidth;
		var h = animsdiv.offsetHeight;
		/*if(animscanvas.width !== w) {
			animscanvas.width = w;
		}
		if(animscanvas.height !== h) {
			animscanvas.height = h;
		}*/
		anc.fillStyle = darkBgColor;
		anc.fillRect(0, 0, w, h);
		var scrollX = scrollbars.anims.scroll[0];
		var scrollY = scrollbars.anims.scroll[1];
		
		var l = J2L.ANIMS.length;
		var offx, x;
		var offy, i;
		var tile, id, pos;
		var frames;
		var curFrame;
		var spacing = 4;
		var drewSelection = false;
		var show = showWhatScrollbars('anims', w, h);
		scrollbars.anims.contentSize[0] = (64+2)*32+spacing;
		scrollbars.anims.contentSize[1] = (l+1)*32;
		if(scrollX > scrollbars.anims.contentSize[0]-w+show[1]*17) {scrollX = scrollbars.anims.contentSize[0]-w+show[1]*17;}
		if(scrollY > scrollbars.anims.contentSize[1]-h+show[0]*17) {scrollY = scrollbars.anims.contentSize[1]-h+show[0]*17;}
		if(scrollX < 0 || isNaN(scrollX)) scrollX = 0;
		if(scrollY < 0 || isNaN(scrollY)) scrollY = 0;
		scrollbars.anims.scroll[0] = scrollX;
		scrollbars.anims.scroll[1] = scrollY;
		var frametick = (new Date().getTime() - starttime)/1000;
		offy = 0;
		for (i=0; i < l; i+=1) {
			offy = Math.floor(i*32-scrollY);
			if(offy < -32 || offy > h) continue;
			frames = J2L.ANIMS[i].Frames;
			anc.fillStyle = lightBgColor;
			anc.fillRect(32-scrollX+spacing, offy, (frames)*32, 32);
			for(x = 0; x < frames; x+=1) {
				offx = Math.floor((x+1)*32-scrollX)+spacing;
				if(offx < -32 || offx > w) continue;
				tile = getTile(frametick, J2L.ANIMS[i].Tiles[x]);
				drawTile(anc, offx, offy, scrollbars.anims.contentSize[0], tile, showAnimMask);
				/*if(currentTileset.width === 320 && currentTileset.height > pos[1]*32) {
					anc.drawImage(currentTileset, pos[0]*32, pos[1]*32, 32, 32, offx, offy, 32, 32);
				}
				else {
					if(id > 0) {
						anc.fillRect(offx, offy, 32, 32);
					}
				}*/
				
			}
			/*anc.globalCompositeOperation = "destination-over";
			anc.globalCompositeOperation = "source-over";*/
			anc.fillStyle = "rgba(255, 255, 255, 0.2)";
			anc.fillRect(Math.floor((getAnimFrame(i, frametick, false).curFrame+1)*32-scrollX)+spacing, offy, 32, 32);
			//anc.fillStyle = "rgb(24, 24, 48)";
			anc.fillStyle = "rgba(0, 0, 0, 0.5)";
			anc.fillRect(offx+32, offy, 32, 32);
			
		}
		if(animSelection !== false && !drewSelection && animSelection[0] > 0) {// && animSelection[1] === i && (animSelection[0]-2) < frames) {
			anc.save();
			anc.globalCompositeOperation = "lighter";
			anc.fillStyle = "rgb(40, 40, 40)";
			anc.strokeStyle = "rgb(70, 70, 70)";
			anc.lineWidth = 3;
			offx = Math.floor((animSelection[0])*32-scrollX)+spacing;
			offy = Math.floor((animSelection[1])*32-scrollY);
			anc.fillRect(offx, offy, 32, 32);
			anc.strokeRect(offx-1.5, offy-1.5, 35, 35);
			anc.restore();
			drewSelection = true;
		}
		anc.fillStyle = darkBgColor;
		anc.fillRect(0, 0, 32+spacing, h);
		for (i=0; i < l; i+=1) {
			offy = Math.floor(i*32-scrollY);
			if(offy < -32 || offy > h) continue;
			frames = J2L.ANIMS[i].Frames;
			anc.fillStyle = darkBgColor;
			anc.fillRect(32, offy, spacing, 32);	
			anc.fillStyle = lightBgColor;
			anc.fillRect(0, offy, 32, 32);
			drawTile(anc, 0, offy, scrollbars.anims.contentSize[0], getTile(frametick, getAnimFrame(i, frametick, false)), showAnimMask);
		}
		if(animSelection !== false && !drewSelection && animSelection[0] === 0) {
			anc.save();
			anc.globalCompositeOperation = "lighter";
			anc.fillStyle = "rgb(40, 40, 40)";
			anc.strokeStyle = "rgb(70, 70, 70)";
			anc.lineWidth = 3;
			offy = Math.floor(animSelection[1]*32-scrollY);
			anc.fillRect(0, offy, 32, 32);
			anc.strokeRect(-1.5, offy-1.5, 35, 35);
			anc.restore();
			drewSelection = true;
		}
		//anc.fillStyle = "rgb(24, 24, 48)";
		offx = Math.floor(-scrollX);
		offy = Math.floor(J2L.ANIMS.length*32-scrollY);
		anc.fillStyle = "rgba(0, 0, 0, 0.5)";
		anc.fillRect(0, offy, 32, 32);
		if(animSelection !== false && !drewSelection && animSelection[0] === 0 && animSelection[1] === J2L.ANIMS.length) {
			anc.save();
			anc.globalCompositeOperation = "lighter";
			anc.fillStyle = "rgb(40, 40, 40)";
			anc.strokeStyle = "rgb(70, 70, 70)";
			anc.lineWidth = 3;
			anc.fillRect(0, offy, 32, 32);
			anc.strokeRect(-1.5, offy-1.5, 35, 35);
			anc.restore();
			drewSelection = true;
		}
		if(!drewSelection) {
			animSelection = false;
		}
		
		drawScrollbars(anc, 'anims', w, h);
		
		//anc.fillStyle = "white";
		//var fps = 1000/(new Date().getTime()-future);
		//anc.fillText("Fps: "+Math.round(fps)+" ("+Math.round(1000/fps)+" ms)", 20, 20);
		
		//requestAnimFrame(redrawAnims, animscanvas);
		
		var w = tilesetdiv.offsetWidth;
		var h = tilesetdiv.offsetHeight;
		tilec.fillStyle = darkBgColor;
		tilec.fillRect(0, 0, w, h);
		var scrollX = scrollbars.tileset.scroll[0];
		var scrollY = scrollbars.tileset.scroll[1];
		var x, y, offy, offh, i, id, type, evt, params, difficulty, illumi, movetext, shortnames;
		var startX, startY, endX, endY, selX, selY, selW, selH;
		var drawHeight = currentTileset.height > h? h : currentTileset.height;
		scrollbars.tileset.contentSize[0] = 320;
		scrollbars.tileset.contentSize[1] = currentTileset.height > h? currentTileset.height : h;
		if(scrollY > scrollbars.tileset.contentSize[1]-h) {scrollY = scrollbars.tileset.contentSize[1]-h;}
		if(scrollY < 0 || isNaN(scrollY)) scrollY = 0;
		scrollbars.tileset.scroll[0] = 0;
		scrollbars.tileset.scroll[1] = scrollY;
		if(currentTileset.width === 320 && currentTilesetMask.width === 320 && currentTileset.height > 0 && currentTilesetMask.height > 0 && drawHeight > 0) {
			tilec.fillStyle = lightBgColor;
			tilec.font = "11px Tahoma, sans-serif";
			tilec.fillRect(0, 0, 320, drawHeight);
			tilec.drawImage(tilesetTypeSelected!==1?currentTileset:currentTilesetMask, 0, Math.floor(scrollY), 320, drawHeight, 0, 0, 320, drawHeight);
			if(tilesetTypeSelected === 2 || tilesetTypeSelected === 3) {
				offy = Math.floor(scrollY/32);
				offh = Math.floor(drawHeight/32)+2;
				
				shortnames = [(JCSini.Tiles[1][1] || "Translucent"), (JCSini.Tiles[4][1] || "Caption")];
				
				for(i=0; i < 2; i+=1) {
					while(tilec.measureText(shortnames[i]).width > 32 && shortnames[i].length > 0) {
						shortnames[i] = shortnames[i].substr(0, shortnames[i].length-1);
					}
				}
				
				for(x=0; x < 10; x+=1) {
					for(y = offy; y < offy+offh; y+=1) {
						i = XYid(x, y, 10);
						if(tilesetTypeSelected === 2 && J2L.TilesetProperties.TileType[i] > 0) {
							tilec.fillStyle = "rgba(0, 0, 0, 0.5)";
							tilec.fillRect(x*32, Math.ceil(y*32-scrollY), 32, 32);
							tilec.fillStyle = "rgb(255, 255, 255)";
							type = J2L.TilesetProperties.TileType[i];
							if(type === 1) {
								tilec.fillText(shortnames[0], Math.floor(x*32+16-tilec.measureText(shortnames[0]).width/2), Math.ceil(y*32-scrollY)+21);
							}
							else {
								tilec.fillText(shortnames[1], Math.floor(x*32+16-tilec.measureText(shortnames[1]).width/2), Math.ceil(y*32-scrollY)+21);
							}
						}
						else if(tilesetTypeSelected === 3) {
							drawEvent(tilec, Math.floor(x*32), Math.floor(y*32 - scrollY), J2L.TilesetProperties.TileEvent[i], 1);
							/*id = evt & (Math.pow(2, 8)-1);
							if(id > 0) {
								difficulty = (evt & (Math.pow(2, 10)-1)) >> 8; // bits 10-8 (2)
								illumi = (evt & (Math.pow(2, 11)-1)) >> 10 // bits 10-11 (1)
								params = evt & ((Math.pow(2, 32)-1)) >> 12; // bits 32-12 (20)
								tilec.fillStyle = "rgba(0, 0, 0, 0.5)";
								tilec.fillRect(x*32, Math.floor(y*32-scrollY), 32, 32);
								tilec.fillStyle = diffColors[difficulty];
								movetext = 0;
								if(JCSini.Events[id][4] === "") movetext = 8;
								tilec.fillText(JCSini.Events[id][3], Math.floor(x*32+(16-tilec.measureText(JCSini.Events[id][3]).width/2)), Math.floor(y*32-scrollY+(11+movetext+2)));
								if(JCSini.Events[id][4] !== "") {
									tilec.fillText(JCSini.Events[id][4], Math.floor(x*32+(16-tilec.measureText(JCSini.Events[id][4]).width/2)), Math.floor(y*32-scrollY+(11+16)));
								}
							}*/
						}
					}
				}
			}
			var tilesetbounding = tilesetcanvas.getBoundingClientRect();
			if(holdingCtrlKey && mousepos[1] - tilesetbounding.top + scrollY < currentTileset.height && mousepos[0]/32 < 10) {
				tilec.save();
				tilec.globalCompositeOperation = "lighter";
				tilec.strokeStyle = "rgb(100, 100, 100)";
				tilec.lineWidth = 3;
				tilec.strokeRect(Math.floor((mousepos[0]/* - tilesetcanvas.offsetLeft*/)/32)*32-1.5, Math.floor((mousepos[1] - tilesetbounding.top + scrollY)/32)*32 - scrollY - 1.5, 35, 35);
				tilec.restore();
			}
			if(!holdingCtrlKey && whichmouse === 1 && tilesetcanvas.isDragging && mousepos !== false && mousedownpos !== false && mousedownscroll !== false) {
				startX = mousedownpos[0]/* - tilesetcanvas.offsetLeft*/;
				startY = mousedownpos[1] - tilesetbounding.top + mousedownscroll[1];
				if(startY < currentTileset.height) {
					endX = mousepos[0]/* - tilesetcanvas.offsetLeft*/;
					endY = mousepos[1] - tilesetbounding.top + scrollY;
					selX = Math.floor(Math.min(startX, endX)/32);
					selY = Math.floor(Math.min(startY, endY)/32);
					if(selX < 0) selX = 0;
					selW = Math.ceil((Math.max(startX, endX))/32) - selX;
					selH = Math.ceil((Math.max(startY, endY))/32) - selY;
					if(selX+selW > 10) selW = 10-selX;
					if(selY > currentTileset.height/32-1) selY = currentTileset.height/32-1;
					if(selY+selH > currentTileset.height/32) selH = currentTileset.height/32-selY;
					selW = Math.max(selW, 1);
					selH = Math.max(selH, 1);
					tileSelection = [selX, selY, selW, selH];
					tilec.save();
					tilec.globalCompositeOperation = "lighter";
					tilec.fillStyle = "rgb(40, 40, 40)";
					tilec.strokeStyle = "rgb(70, 70, 70)";
					tilec.lineWidth = 3;
					tilec.fillRect(selX*32-1.5, Math.floor(selY*32-scrollY)-1.5, selW*32+3, selH*32+3);
					tilec.strokeRect(selX*32-1.5, Math.floor(selY*32-scrollY)-1.5, selW*32+3, selH*32+3);
					tilec.restore();
				}
			}
		}
		else {
			//tilec.fillRect(0, 0, w, h); // Have it your way!
		}
		
		drawScrollbars(tilec, 'tileset', w, h);
		
		//tilec.fillStyle = "white";
		//var fps = 1000/(new Date().getTime()-future);
		//tilec.fillText("Fps: "+Math.round(fps)+" ("+Math.round(1000/fps)+" ms)", 20, 20);
		
		//requestAnimFrame(redrawTileset, tilesetcanvas);
		frameOffset+=1;
		if(!forced)
			requestAnimFrame(redraw, layercanvas);
	};
	
	var changeTileset = function (si, auto) {
		selectTileset.selectedIndex = si;
		if(si > 0) {
			selectTileset.blur();
			if(socket && socket.readyState === 1 && auto !== true) {
				var filename = selectTileset.options[si].value;
				
				sendUpdate({
					what: 'tilesetchange',
					tileset: selectTileset.options[si].value
				});
			}
			loadtileset(selectTileset.options[si].value);
		}
		else if(si === 0) {
			currentTileset.src = "";
			currentTilesetMask.src = "";
			tile_url = "";
			mask_url = "";
			J2T = undefined;
		}
	};
	
	var getAnimFrame = function (i, frametick, flip) {
		if(i >= J2L.ANIMS.length) {
			return {'id': -1, 'animated': false, 'flipped': flip, 'curFrame': curFrame};
		}
		var frames = J2L.ANIMS[i].Frames;
		var ticks = (frametick*J2L.ANIMS[i].FPS);
		var curFrame = 0;
		if(J2L.ANIMS[i].IsItPingPong) {
			curFrame = Math.floor(ticks % (frames*2+J2L.ANIMS[i].PingPongWait+J2L.ANIMS[i].FramesBetweenCycles));
			if(curFrame >= frames && curFrame <= frames+J2L.ANIMS[i].PingPongWait) curFrame = frames-1;
			else if(curFrame > frames && curFrame < frames*2+J2L.ANIMS[i].PingPongWait) curFrame = (frames*2+J2L.ANIMS[i].PingPongWait-1) - curFrame;
			else if(curFrame >= frames*2+J2L.ANIMS[i].PingPongWait) curFrame = 0;
		}
		else {
			curFrame = Math.floor(ticks % (frames+J2L.ANIMS[i].FramesBetweenCycles));
			if(curFrame >= frames) curFrame = frames-1;
		}
		var tile = J2L.ANIMS[i].Tiles[curFrame];
		var newflip = ( (tile.flipped || false) && !flip ) || ( !(tile.flipped || false) && flip ); // XOR flip
		return {'id': tile.id, 'animated': tile.animated, 'flipped': newflip, 'curFrame': curFrame};
	};
	var getTile = function (frametick, tile, firstTile) {
		var flip = tile.flipped;
		if(tile.animated) {
			if(firstTile === undefined) firstTile = tile;
			else if(firstTile.id === tile.id && firstTile.animated === tile.animated)
				return {'id': 0, 'animated': false, 'flipped': false, 'event': 0};
			tile = getTile(frametick, getAnimFrame(tile.id, frametick, flip), firstTile);
		}
		return tile;
	};
	var drawTile = function (c, x, y, w, tile, masked, zoom) {
		if(zoom === undefined) zoom = 1;
		var id = tile.id;
		var animated = tile.animated;
		var pos = 0;
		var trans = J2L.TilesetProperties.TileType[id] === 1;
		if(trans && !masked) {
			c.globalAlpha = 0.6;
		}
		if(id > 0) {
			pos = idXY(id, 10);
			if(currentTileset.width === 320 && currentTileset.height > pos[1]*32) {
				if(tile.flipped) {
					c.save();
					c.translate(w*32*zoom, 0);
					c.scale(-1, 1);
					c.drawImage(masked?currentTilesetMask:currentTileset, pos[0]*32, pos[1]*32, 32, 32, Math.floor((w-1)*32*zoom-x), Math.floor(y), 32*zoom, 32*zoom);
					c.restore();
				}
				else {
					c.drawImage(masked?currentTilesetMask:currentTileset, pos[0]*32, pos[1]*32, 32, 32, Math.floor(x), Math.floor(y), 32*zoom, 32*zoom);
				}
			}
			else {
				c.fillStyle = "black";
				c.fillRect(Math.round(x), Math.round(y), 32*zoom, 32*zoom);
			}
		}
		else if (id < 0) { // Unknown animation
			if(tile.flipped) {
				c.save();
				c.translate(w*32*zoom, 0);
				c.scale(-1, 1);
				c.drawImage(unknownTile, 0, 0, 32, 32, Math.floor((w-1)*32*zoom-x), Math.floor(y), 32*zoom, 32*zoom);
				c.restore();
			}
			else {
				c.drawImage(unknownTile, 0, 0, 32, 32, Math.floor(x), Math.floor(y), 32*zoom, 32*zoom);
			}
		}
		if(trans && !masked) {
			c.globalAlpha = 1.0;
		}
	};
	var drawEvent = function (c, x, y, evt, zoom) {
		var id = evt & 255;
		var isGenerator = false;
		if(id > 0) {
			if(id === 216) isGenerator = true;
			var difficulty = (evt & (Math.pow(2, 10)-1)) >> 8; // bits 10-8 (2)
			var illumi = (evt & (Math.pow(2, 11)-1)) >> 10 // bits 10-11 (1)
			var unknownbit = (evt & (Math.pow(2, 12)-1)) >> 11 // bits 10-11 (1)
			var params = (evt & (Math.pow(2, 32)-1)) >> 12; // bits 12-32 (20)
			c.save();
			c.fillStyle = "rgba(0, 0, 0, 0.5)";
			c.fillRect(Math.floor(x), Math.floor(y), 32*zoom, 32*zoom);
			if(isGenerator) {
				c.fillStyle = "rgba(255, 255, 255, 0.5)";
				c.strokeStyle = "black";
				c.beginPath();
				c.moveTo(Math.floor(x)+0.5, Math.floor(y)+0.5);
				c.lineTo(Math.floor(x)+8*zoom, Math.floor(y)+0.5);
				c.lineTo(Math.floor(x)+0.5, Math.floor(y)+8*zoom);
				c.closePath();
				c.fill();
				c.stroke();
				/*var paramsamount = JCSini.Events[id].length - 5;
				var paramoffset = 0;
				var param = 0;
				var paramArray = [];
				for(var i=0; i < paramsamount; i+=1) {
					param = (params & (Math.pow(2, paramoffset+Math.abs(JCSini.Events[id][5+i][1]))-1)) >> paramoffset;
					if(JCSini.Events[id][5+i][1] < 0 && param > Math.pow(2, Math.abs(JCSini.Events[id][5+i][1])-1))
						param -= Math.pow(2, Math.abs(JCSini.Events[id][5+i][1]));
					paramArray.push(param);
					paramoffset += Math.abs(JCSini.Events[id][5+i][1]);
				}*/
				id = params & 255;
			}
			c.fillStyle = diffColors[difficulty];
			c.font = ""+Math.round(11*zoom)+"px Tahoma, sans-serif";
			var movetext = 0;
			c.beginPath();
			
			if(JCSini.Events[id][4] === "") movetext = 8;
			c.fillText(JCSini.Events[id][3], Math.floor(x+(16-(lc.measureText(JCSini.Events[id][3]).width/zoom)/2)*zoom), Math.floor(y+(11+movetext+2)*zoom));
			if(JCSini.Events[id][4] !== "") {
				c.fillText(JCSini.Events[id][4], Math.floor(x+(16-(lc.measureText(JCSini.Events[id][4]).width/zoom)/2)*zoom), Math.floor(y+(11+16)*zoom));
			}
			c.restore();
		}
	};
	var drawSprite = function (evt, drawX, drawY, frametick, tileX, tileY) {
		var id = evt & 0xFF;
		if(ANIMS && id > 32) {
			pxc.fillStyle = 'black';
			if(id === 216) {
				id = (evt >> 12) & 0xFF;
			}
			if(id === 59) id = 243; // Airboard fix
			
			if((id < 185 || id > 189) && ANIMS[objset[id]] && ANIMS[objset[id]][objanim[id]]) {
				var firstAnim = false;
				if([46, 47, 48, 52, 60, 62, 70, 83, 85, 86, 87, 91, 92, 93, 137, 138, 139, 140].indexOf(id) > -1) firstAnim = true;
				
				var set = objset[id];
				
				var anim = objanim[id];
				if(id === 42) anim = 1; // Swinging Vine fix
				
				var curFrame = Math.floor((frametick*ANIMS[set][anim].fps) % ANIMS[set][anim].data.length);
				if(firstAnim) curFrame = 0;
				
				if(id === 235) { // Bolly Boss
					var cannonFrame = Math.floor((frametick*ANIMS[82][6].fps) % (ANIMS[82][6].data.length*2));
					if(cannonFrame >= ANIMS[82][6].data.length && cannonFrame <= ANIMS[82][6].data.length) cannonFrame = ANIMS[82][6].data.length-1;
					else if(cannonFrame > ANIMS[82][6].data.length && cannonFrame < ANIMS[82][6].data.length*2) cannonFrame = (ANIMS[82][6].data.length*2-1) - cannonFrame;
					else if(cannonFrame >= ANIMS[82][6].data.length*2) cannonFrame = 0;
					
					drawSpriteAnim(pxc, drawX+16, drawY+16, 82, 2, Math.floor((frametick*ANIMS[82][2].fps) % ANIMS[82][2].data.length), 0);
					drawSpriteAnim(pxc, drawX+8, drawY+24, 82, 6, cannonFrame, 0);
					drawSpriteAnim(pxc, drawX+16, drawY+16, set, anim, curFrame, 0);
				}
				else if(id === 183) { // Floating Lizard
					drawSpriteAnim(pxc, drawX+16, drawY+20, objset[226], objanim[226], Math.floor((frametick*ANIMS[objset[226]][objanim[226]].fps) % ANIMS[objset[226]][objanim[226]].data.length), 0);
					drawSpriteAnim(pxc, drawX+16, drawY+16, set, anim, curFrame, 0);
				}
				else if(id === 244) { // CTF Base + Eva
					var params = getEvent(evt).parameters;
					var team = params[0];
					var flip = params[1] === 1;
					
					var flipmul = flip? -1 : 1;
					
					drawSpriteAnim(pxc, drawX+16-flipmul*5, drawY+32, 43, 1, team, 0, !flip); // Base
					drawSpriteAnim(pxc, drawX+16-flipmul*23, drawY-21, 43, 2, getFrame(frametick, ANIMS[43][2].fps, ANIMS[43][2].data.length), 0, !flip); // Red/Green lights
					drawSpriteAnim(pxc, drawX+16+flipmul*32*2, drawY+11, 43, 5, getFrame(frametick, ANIMS[43][5].fps, ANIMS[43][5].data.length), 0, flip); // Eva
					drawSpriteAnim(pxc, drawX+15, drawY+36, 43, (team? 7:3), curFrame, 0); // Flag
					
				}
				else if(id === 128) { // Moth
					var params = getEvent(evt).parameters;
					var type = params[0] % 4;
					if(type === 0) type = 3;
					else if(type === 2) type = 0;
					else if(type === 3) type = 2;
					var f = getFrame(frametick, 10, ANIMS[64][type].data.length);
					var fallOffset = getFallOffset(64, type, tileX, tileY, frametick);
					drawSpriteAnim(pxc, drawX+15, drawY+15+fallOffset, 64, type, f, 0);
				}
				else if(id === 193 || id === 203 || id === 204 || id === 205 || id === 229) { // Poles
					var params = getEvent(evt).parameters;
					var adjustY = params[0];
					var adjustX = params[1];
					if(adjustY === 0) adjustY = 24;
					drawSpriteAnim(pxc, drawX+30+adjustX, drawY+14+adjustY, set, anim, curFrame, 0);
				}
				else if(id === 60 || id === 85 || id === 86 || id === 87) { // Vertical springs
					var params = getEvent(evt).parameters;
					var ceiling = params[0] > 0;
					var color = id === 85 ? 2 : (id === 87 ? 0 : 1);
					var frozen = id === 60;
					var fallOffset = -3;
					if(!ceiling)
						fallOffset = getFallOffset(set, anim, tileX, tileY, frametick);
					drawSpriteAnim(pxc, drawX+16, drawY+15+fallOffset, set, ceiling?2+color:anim, frozen? 1 : 0, evt, false, false);
				}
				else if(J2T && (id === 91 || id === 92 || id === 93)) { // Horizontal springs
					var tileLeft = false, tileRight = false;
					if(tileX-1 >= 0) {
						tileLeft = getTile(frametick, J2L.LEVEL[3][tileX-1][tileY]);
						tileLeft.addr = J2T.maskAddress[tileLeft.id] || 0;
						tileLeft = (tileLeft.flipped ? J2T.tilesetMask[tileLeft.addr+62] & Math.pow(2, 0) : J2T.tilesetMask[tileLeft.addr+62] & Math.pow(2, 7)) > 0;
					}
					if(tileX+1 < J2L.LEVEL_INFO.LayerWidth[3]) {
						tileRight = getTile(frametick, J2L.LEVEL[3][tileX+1][tileY]);
						tileRight.addr = J2T.maskAddress[tileRight.id] || 0;
						tileRight = (tileRight.flipped ? J2T.tilesetMask[tileRight.addr+61] & Math.pow(2, 7) : J2T.tilesetMask[tileRight.addr+61] & Math.pow(2, 0)) > 0;
					}
					
					var flip = !tileLeft && tileRight;
					drawSpriteAnim(pxc, drawX+16, drawY+16, set, anim, curFrame, 0, flip);
					
				}
				else if(id === 25 || (id > 32 && id < 41) || id === 44 || id === 45 || id === 59 || id === 61 || (id > 62 && id < 67) ||
						id === 72 || id === 73 || id === 79 || id === 80 || (id > 87 && id < 91) || (id > 95 && id < 100) ||
						(id > 140 && id < 148) || id === 152 || (id > 153 && id < 183) || id === 228 || id === 243) { // Pickups, stuff that hover/bounce
							drawSpriteAnim(pxc, drawX+16, drawY+16+Math.sin(frametick*6.872234+tileX*2+tileY)*4, set, anim, curFrame, evt, (tileX % 2 ^ tileY % 2) === 1 && id !== 80 && id !== 37, false);
				}
				else {
					var flipped = (id===110/*Caterpillar, FIXME: position*/);
					var fallOffset = 0;
					if (id === 41 || (id > 45 && id < 58) || id === 62 || (id > 67 && id < 72) || (id > 73 && id < 77) || id === 81 ||
						id === 83 || id === 84 || id === 94 || id === 95 || (id > 99 && id < 105) || id === 109 || (id > 112 && id < 119) ||
						id === 120 || (id > 123 && id < 127) || id === 128 || id === 129 || (id > 130 && id < 137) || id === 151 ||
						id === 184 || id === 196 || id === 199 || id === 200 || id === 217 || id === 220 || id === 221 ||
						id === 231 || id === 232) {
							fallOffset = getFallOffset(set, anim, tileX, tileY, frametick);
					}
					drawSpriteAnim(pxc, drawX+16, drawY+16+fallOffset, set, anim, curFrame, evt, flipped);
				}
				
				
			}
			else if(id === 230) {
				var params = getEvent(evt).parameters;
				var showAnim = params[3] > 0;
				if(showAnim) {
					var coins = params[1];
					var set = -1;
					switch(coins) {
						case 10: set = 103; break;
						case 20: set = 105; break;
						case 50: set = 106; break;
						case 100: set = 104; break;
					}
					if(set !== -1) {
						var curAnim = ANIMS[set][0];
						var curFrame = getFrame(frametick, curAnim.fps, curAnim.data.length);
						var fallOffset = getFallOffset(set, 0, tileX, tileY, frametick);
						drawSpriteAnim(pxc, drawX, drawY+16+fallOffset, set, 0, curFrame, evt, false);
					}
				}
			}
		}
	};
	
	var checkPixelMask = function (l, x, y, frametick) {
		if(!J2T) return true;
		var lx = Math.floor(x/32);
		var ly = Math.floor(y/32);
		var tx = x % 32;
		var ty = y % 32;
		var tile = getTile(frametick, J2L.LEVEL[l][lx][ly]);
		var addr = J2T.maskAddress[tile.id] || 0;
		if(tile.flipped) tx = 31-tx;
		return J2T.tilesetMask[addr+ty*4+Math.floor(tx / 8)] & Math.pow(2, tx % 8) > 0;
	};
	
	var getFallOffset = function (set, anim, tileX, tileY, frametick) {
		var curAnim = ANIMS[set][anim];
		var foffx = curAnim.x[0];
		var foffy = curAnim.y[0];
		var fw = curAnim.w[0];
		var fh = curAnim.h[0];
		
		var maxh = J2L.LEVEL_INFO.LayerHeight[3];
		
		var checkx = 16;// + fw/2 + foffx;
		var checky = Math.floor(15 + fh/1.1 + foffy);
		
		var hit = false;
		
		
		do {
			hit = checkPixelMask(3, tileX*32+checkx, tileY*32+checky, frametick);
			if (!hit) {
				checky+=4;
				if (tileY*32+checky >= maxh*32)
					break;
			}
		} while(!hit);
		return checky - (15 + fh + foffy);
	};
	
	var getFrame = function (time, fps, frameCount) {
		return Math.floor((time*fps) % frameCount)
	};
	
	var drawSpriteAnim = function (c, drawX, drawY, set, anim, frame, evt, hflip, vflip) {
		var id = evt & 0xFF;
		if(id === 216) {
			id = (evt >> 12) & 0xFF;
		}
		var isGem = false;
		if(id >= 63 && id <= 67 || id >= 97 && id <= 99 || id === 25 || id === 192) isGem = true;
		var curAnim = ANIMS[set][anim];
		var foffx = curAnim.x[frame];
		var foffy = curAnim.y[frame];
		var fx = 0;
		var fy = 0;
		var fw = curAnim.w[frame];
		var fh = curAnim.h[frame];
		var offset = 0;
		if((hflip?-fw-foffx:foffx)+drawX+fh < -1 || (vflip?-fh-foffy:foffy)+drawY+fh < -1 || (hflip?-fw-foffx:foffx)+drawX >= parallaxdiv.offsetWidth || (vflip?-fh-foffy:foffy)+drawY >= parallaxdiv.offsetHeight) return;
		var imgd = c.getImageData((hflip?-fw-foffx:foffx)+drawX, (vflip?-fh-foffy:foffy)+drawY, fw, fh);
		var imdata = imgd.data;
		var drawnIndexes = {};
		while(fy < fh) {
			var codebyte = curAnim.data[frame][offset++];
			if(codebyte < 0x80) {
				fx += codebyte;
			}
			else if(codebyte === 0x80) {
				fx = 0;
				fy++;
			}
			else {
				var len = codebyte - 0x80;
				for(var m=0; m < len; m++) {
					var index = curAnim.data[frame][offset++];
					if(index > 0) {
						if(id === 42 && index === 128) continue; // Swinging Vine fix
						drawnIndexes[index] = 1;
						if(J2T) {
							if(isGem) {
								index -= 128;
								index *= 2.5;
								index -= 192;
								var color = J2T.Palette[48]
								if(id === 64 || id === 98) { color = J2T.Palette[82]; }
								else if(id === 65 || id === 99) { color = J2T.Palette[34]; }
								else if(id === 66) { color = J2T.Palette[88]; }
								
								imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 0] = ~~Math.max(Math.min(index + (color & 0xFF), 255), 0);
								imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 1] = ~~Math.max(Math.min(index + ((color >> 8) & 0xFF), 255), 0);
								imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 2] = ~~Math.max(Math.min(index + ((color >> 16) & 0xFF), 255), 0);
							}
							else {
								var color = J2T.Palette[index];
								imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 0] = color & 0xFF;
								imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 1] = (color >> 8) & 0xFF;
								imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 2] = (color >> 16) & 0xFF;
							}
						}
						else {
							imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 0] = index;
							imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 1] = index;
							imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 2] = index;
						}
						imdata[((hflip?fw-fx-1:fx) + (vflip?fh-fy-1:fy)*fw)*4 + 3] = 255;
					}
					fx++;
				}
			}
		}
		c.putImageData(imgd, (hflip?-fw-foffx:foffx)+drawX, (vflip?-fh-foffy:foffy)+drawY);
	};
	
	var getEvent = function (evt) {
		var id = evt & (Math.pow(2, 8)-1);
		var difficulty = (evt & (Math.pow(2, 10)-1)) >> 8; // bits 8-10 (2)
		var illumi = (evt & (Math.pow(2, 11)-1)) >> 10 // bits 10-11 (1)
		var params = (evt & (Math.pow(2, 32)-1)) >> 12; // bits 12-32 (20)
		var paramArray = [];
		if(id > 0) {
			var paramsamount = JCSini.Events[id].length - 5;
			var paramoffset = 0;
			var param = 0;
			
			for(var j=0; j < paramsamount; j+=1) {
				var param = (params & (Math.pow(2, paramoffset+Math.abs(JCSini.Events[id][5+j][1]))-1)) >> paramoffset;
				if(JCSini.Events[id][5+j][1] < 0 && param > Math.pow(2, Math.abs(JCSini.Events[id][5+j][1])-1))
					param -= Math.pow(2, Math.abs(JCSini.Events[id][5+j][1]));
				paramArray.push(param);
				paramoffset += Math.abs(JCSini.Events[id][5+j][1]);
			}
		}
		return {
			'id': id,
			'difficulty': difficulty,
			'illuminate': illumi,
			'parameters': paramArray
		};
	};
	
	var updateEventPointers = function () {
		// eventPointers
		// eventPointerCache
		var i, j, evt;
		
		var pointers = [];
		
		for(i in eventPointers) {
			pointers[parseInt(i, 10)] = 0;
			pointers[eventPointers[i]] = 1;
		}
		
		var cacheFrom = [];
		var cacheTo = [];
		
		for(i=0; i < J2L.EVENTS.length; i+=1) {
			evt = getEvent(J2L.EVENTS[i]);
			if(evt.id > 0 && pointers[evt.id] !== undefined) {
				(pointers[evt.id] === 0 ? cacheFrom : cacheTo).push([evt, i]); // Collect interesting events
			}
		}
		
		eventPointerCache = {};
		var index;
		for(i=0; i < cacheFrom.length; i+=1) {
			eventPointerCache[cacheFrom[i][1]] = [];
			for(j=0; j < cacheTo.length; j+=1) {
				if(cacheFrom[i][0].parameters[0] === cacheTo[j][0].parameters[0]) {
					eventPointerCache[cacheFrom[i][1]].push(cacheTo[j][1]);
				}
			}
		}
	};
	
	var updateLayerProperties = function (l) {
		var isTextured = (J2L.LEVEL_INFO.LayerProperties[l] & 8) >> 3 === 1;
		layerpropertiesform.reset();
		layerpropertiesform.editlayer.selectedIndex = l;
		layerpropertiesform.xspeed.value = J2L.LEVEL_INFO.LayerXSpeed[l];
		layerpropertiesform.yspeed.value = J2L.LEVEL_INFO.LayerYSpeed[l];
		layerpropertiesform.autoxspeed.value = J2L.LEVEL_INFO.LayerAutoXSpeed[l];
		layerpropertiesform.autoyspeed.value = J2L.LEVEL_INFO.LayerAutoYSpeed[l];
		layerpropertiesform.xspeed.disabled = l === 3;
		layerpropertiesform.yspeed.disabled = l === 3;
		layerpropertiesform.autoxspeed.disabled = l === 3;
		layerpropertiesform.autoyspeed.disabled = l === 3;
		layerpropertiesform.layerwidth.value = J2L.LEVEL_INFO.LayerWidth[l];
		layerpropertiesform.layerheight.value = J2L.LEVEL_INFO.LayerHeight[l];
		
		if(J2L.LEVEL_INFO.LayerProperties[l] & 1 === 1 && l !== 3)
			layerpropertiesform.repeatx.setAttribute('on');
		else
			layerpropertiesform.repeatx.removeAttribute('on');
		
		if((J2L.LEVEL_INFO.LayerProperties[l] & 2) >> 1 === 1 && l !== 3)
			layerpropertiesform.repeaty.setAttribute('on');
		else
			layerpropertiesform.repeaty.removeAttribute('on');
		
		if((J2L.LEVEL_INFO.LayerProperties[l] & 4) >> 2 === 1 && l !== 3/* && !tileH*/)
			layerpropertiesform.limitvr.setAttribute('on');
		else
			layerpropertiesform.limitvr.removeAttribute('on');
		
		if(isTextured)
			layerpropertiesform.texturedenabled.setAttribute('on');
		else
			layerpropertiesform.texturedenabled.removeAttribute('on');
		
		if((J2L.LEVEL_INFO.LayerProperties[l] & 16) >> 4 === 1)
			layerpropertiesform.stars.setAttribute('on');
		else
			layerpropertiesform.stars.removeAttribute('on');
		
		layerpropertiesform.layerwidth.disabled = isTextured;
		layerpropertiesform.layerheight.disabled = isTextured;
		layerpropertiesform.repeatx.disabled = isTextured || l === 3;
		layerpropertiesform.repeaty.disabled = isTextured || l === 3;
		layerpropertiesform.limitvr.disabled = isTextured || l === 3;
		
		layerpropertiesform.querySelector('#texturedcolor').update(J2L.LEVEL_INFO['LayerRGB'+(l+1)]);
		
	};
	var saveLayerProperties = function (l) {
		var xspeed = +layerpropertiesform.xspeed.value;
		var yspeed = +layerpropertiesform.yspeed.value;
		var autoxspeed = +layerpropertiesform.autoxspeed.value;
		var autoyspeed = +layerpropertiesform.autoyspeed.value;
		var lw = +layerpropertiesform.layerwidth.value;
		var lh = +layerpropertiesform.layerheight.value;
		var repeatx = layerpropertiesform.repeatx.getAttribute('on') !== null;
		var repeaty = layerpropertiesform.repeaty.getAttribute('on') !== null;
		var limitvr = layerpropertiesform.limitvr.getAttribute('on') !== null;
		var isTextured = layerpropertiesform.texturedenabled.getAttribute('on') !== null;
		var layerRGB = layerpropertiesform.querySelector('#texturedcolor').getColor();
		var stars = layerpropertiesform.stars.getAttribute('on') !== null;
		if(isTextured) {
			lw = 8;
			lh = 8;
			repeatx = l !== 3;
			repeaty = l !== 3;
			limitvr = false;
		}
		if(lw !== ~~lw || lh !== ~~lh || lw < 1 || lh < 1 || lw > 1023 || lh > 1024) {
			alert('Layer sizes must be between 1x1 and 1023x1023');
			layerpropertiesform.layerwidth.focus();
			layerpropertiesform.layerwidth.select();
			return false;
		}
		
		var oldlw = J2L.LEVEL_INFO.LayerWidth[l];
		var oldlh = J2L.LEVEL_INFO.LayerHeight[l];
		if(lw < oldlw || lh < oldlh) {
			if(!confirm('Warning!\nYou are shrinking the layer, you may lose tiles.\n\nDo you want to continue?')) {
				return false;
			} 
		}
		
		J2L.LEVEL_INFO.LayerXSpeed[l] = xspeed;
		J2L.LEVEL_INFO.LayerYSpeed[l] = yspeed;
		J2L.LEVEL_INFO.LayerAutoXSpeed[l] = autoxspeed;
		J2L.LEVEL_INFO.LayerAutoYSpeed[l] = autoyspeed;
		
		J2L.LEVEL_INFO.LayerProperties[l] = repeatx*1 | repeaty*2 | limitvr*4 | isTextured*8 | stars*16;
		
		for(var i=0; i < 3; i+=1) {
			J2L.LEVEL_INFO['LayerRGB'+(l+1)][i] = layerRGB[i];
		}
		
		if(lw !== oldlw || lh !== oldlh) {
			J2L.LEVEL_INFO.LayerWidth[l] = lw;
			J2L.LEVEL_INFO.LayerHeight[l] = lh;
			var newLEVEL = [];
			var isWithin = false;
			if(l === 3)
				var newEVENTS = new Uint32Array(lw*lh);
			for(var x=0; x < lw; x+=1) {
				newLEVEL[x] = [];
				for(var y=0; y < lh; y+=1) {
					isWithin = x < oldlw && y < oldlh;
					newLEVEL[x][y] = {
						'id': isWithin? J2L.LEVEL[l][x][y].id : 0,
						'animated': isWithin? J2L.LEVEL[l][x][y].animated : false,
						'flipped': isWithin? J2L.LEVEL[l][x][y].flipped : false
					};
					if(l === 3)
						newEVENTS[x + lw*y] = isWithin? J2L.EVENTS[x + oldlw*y] : 0;
				}
			}
			
			J2L.LEVEL[l] = newLEVEL;
			if(l === 3) {
				J2L.EVENTS = newEVENTS;
				updateEventPointers();
			}
		}
		
		if(socket && socket.readyState === 1) {
			sendUpdate({
				what: 'layerinfo',
				layer: l,
				w: lw,
				h: lh,
				xspeed: xspeed,
				yspeed: yspeed,
				autoxspeed: autoxspeed,
				autoyspeed: autoyspeed,
				properties: J2L.LEVEL_INFO.LayerProperties[l],
				color: layerRGB
			});
		}
		
		return true;
	};
	(function () {
		var time = Date.now();
		readFileHeaderInfo(function (err, files) {
			tilesets = [];
			var n = files.length;
			for(var i = 0; i < files.length; i+=1) {
				tilesets.push({'name': files[i][0], 'title': files[i][1], 'version': files[i][2]});
			}
			selectTileset.length = 1;
			alphaSort(tilesets);
			var opt;
			
			for(i=0; i < tilesets.length; i+=1) {
				opt = new Option(tilesets[i].title, tilesets[i].name);
				if(tilesets[i].version === 513) {
					opt.className = "TSF";
				}
				selectTileset.add(opt, null);
			}
			selectTileset.selectedIndex = 0;
			selectTileset.disabled = false;
			console.log("Loaded tileset headers in "+((Date.now()-time)/1000)+"s");
		});
	}());
	
	
	
	var mouseOver = function (e) {
		if(this === layercanvas) {
			
		}
		if(this === layercanvas || this === tilesetcanvas) {
			eventInfoSpan.style.opacity = 1;
		}
		tilePositionDiv.style.opacity = 1;
	};
	var mouseOut = function (e) {
		if(this === layercanvas) {
			isBSelecting = false;
		}
		eventInfoSpan.style.opacity = 0;
		tilePositionDiv.style.opacity = 0;
	};
	var changeEditLayer = function (e) {
		if(saveLayerProperties(this.currentLayer)) {
			this.currentLayer = this.selectedIndex;
			updateLayerProperties(this.selectedIndex);
		}
		else {
			this.selectedIndex = this.currentLayer;
		}
	};
	var resizer = function () {
		var inW = window.innerWidth;
		var inH = window.innerHeight;
		
		chatPanel.style.width = Math.max(Math.min(inW, chatPanel.offsetWidth), chatResizer.offsetWidth)+"px";
		contentSection.style.right = Math.min(chatPanel.offsetWidth, inW-338-600)+"px";
		
		var contentWidth = contentSection.offsetWidth; //Math.max(inW - 338 - chatPanel.offsetWidth, 280);
		var animHeight = Math.max(Math.min(animscanvas.offsetHeight, inH-42-20), 0);
		animscanvas.height = Math.max(animHeight, 1);
		animscanvas.style.height = animsdiv.style.height = animHeight + "px";
		localStorage.animHeight = animHeight;
		
		var tilesetHeight = Math.max(Math.min(inH-42-20-animHeight-2, inH-47-20+3), 0);
		tilesetcanvas.height = Math.max(tilesetHeight, 1);
		tilesetcanvas.style.height = tilesetdiv.style.height = tilesetHeight + "px";
		
		var parallaxHeight = Math.max(Math.min(parallaxcanvas.offsetHeight, inH-42-20), 0);
		parallaxcanvas.height = Math.max(parallaxHeight, 1);
		parallaxcanvas.style.height = parallaxdiv.style.height = parallaxHeight + "px";
		localStorage.parallaxHeight = parallaxHeight;
		parallaxcanvas.width = Math.max(contentWidth, 1);
		parallaxcanvas.style.width = contentWidth + "px";
		
		var layerHeight = Math.max(Math.min(inH-42-20-parallaxHeight-2, inH-47-20+3), 0);
		layercanvas.height = Math.max(layerHeight, 1);
		layercanvas.style.height = layerdiv.style.height = layerHeight + "px";
		layercanvas.width = Math.max(contentWidth, 1);
		layercanvas.style.width = contentWidth + "px";
		
		redraw(0, true);
		//requestAnimFrame(function () {redraw(0, true);}, layercanvas);
		chatContent.scrollTop = chatContent.scrollHeight;
	};
	
	(function () {
		var onoffbuttons = global.document.querySelectorAll('.onoff');
		var onoffclick = function (i) {
			return function (e) {
				var isOn = this.getAttribute('on') !== null;
				if(isOn)
					this.removeAttribute('on');
				else
					this.setAttribute('on', '');
			};
		};
		var setOnOff = function (setTo) {
			var isOn = this.getAttribute('on') !== null;
			if(!setTo)
				this.removeAttribute('on');
			else
				this.setAttribute('on', '');
		};
		var getOnOff = function () {
			return this.getAttribute('on') !== null;
		};
		for(var i=0, l = onoffbuttons.length; i < l; i+=1) {
			onoffbuttons[i].addEventListener('click', onoffclick(i), false);
			onoffbuttons[i].set = setOnOff;
			onoffbuttons[i].get = getOnOff;
		}
	})();
	selecteventform.generator.addEventListener('click', function (e) {
		if(selecteventform.generator.getAttribute('on') !== null)
			oldEvent.params = [oldEvent.id];
		updateEvent();
	}, false);
	
	global.addEventListener("mousedown", winmousedown, false);
	animsdrag.addEventListener("mousedown", mousedowndrag, false);
	parallaxdrag.addEventListener("mousedown", mousedowndrag, false);
	layercanvas.addEventListener("mousedown", mousedownlayers, false);
	parallaxcanvas.addEventListener("mousedown", mousedownparallax, false);
	animscanvas.addEventListener("mousedown", mousedownanims, false);
	tilesetcanvas.addEventListener("mousedown", mousedowntileset, false);
	layercanvas.addEventListener("mouseover", mouseOver, false);
	layercanvas.addEventListener("mouseout", mouseOut, false);
	tilesetcanvas.addEventListener("mouseover", mouseOver, false);
	tilesetcanvas.addEventListener("mouseout", mouseOut, false);
	animscanvas.addEventListener("mouseover", mouseOver, false);
	animscanvas.addEventListener("mouseout", mouseOut, false);
	
	global.addEventListener("mousemove", winmove, false);
	global.addEventListener("mouseup", function (e) {
		var x, y, id;
		
		parallaxcanvas.isDragging = false;
		
		if(layercanvas.isPanning && e.which === 2) {
			layercanvas.isPanning = false;
		}
		if(chatResizer.isDragging) {
			chatResizer.isDragging = false;
		}
		
		if(animsdrag.isDragging) {
			localStorage.animHeight = animsdiv.offsetHeight;
			animsdrag.isDragging = false;
		}
		else if(parallaxdrag.isDragging) {
			localStorage.parallaxHeight = parallaxdiv.offsetHeight;
			parallaxdrag.isDragging = false;
		}
		else if(layercanvas.isDragging) {
			layercanvas.isDragging = false;
		}
		else if(animscanvas.isDragging) {
			animscanvas.isDragging = false;
		}
		else if(tilesetcanvas.isDragging && !holdingCtrlKey) {
			if(tileSelection) {
				selectedTiles = [];
				selectedSource = 'tileset';
				for(x=0; x < tileSelection[2]; x+=1) {
					selectedTiles[x] = [];
					for(y=0; y < tileSelection[3]; y+=1) {
						id = XYid(tileSelection[0]+x, tileSelection[1]+y, 10);
						selectedTiles[x][y] = {'flipped': false, 'animated': false, 'id': id, 'event': J2L.TilesetProperties.TileEvent[tileSelection[0]+x + 10*(tileSelection[1]+y)]};
					}
				}
			}
			tilesetcanvas.isDragging = false;
		}
		scrollingWhat = "";
		mousedownpos = false;
		mousedownscroll = false;
		tileSelection = false;
		whichmouse = 0;
	}, false);
	layerdiv.addEventListener("scroll", function () {
		
	}, false);
	global.addEventListener("focus", function (e) {
		windowFocus = true;
	}, false);
	global.addEventListener("blur", function (e) {
		holdingShiftKey = false;
		holdingCtrlKey = false;
		holdingFlipKey = false;
		holdingBKey = false;
		holdingTileTypeKey = false;
		windowFocus = false;
		layercanvas.isPanning = false;
		chatResizer.isDragging = false;
		parallaxcanvas.isDragging = false;
	}, false);
	global.addEventListener("resize", resizer, false);
	
	layerpropertiesbutton.addEventListener('click', function (e) {
		Popup.open('layerproperties');
		updateLayerProperties(currentLayer);
		layerpropertiesform.editlayer.currentLayer = currentLayer;
	}, false);
	layerpropertiesform.editlayer.addEventListener('change', changeEditLayer, false);
	layerpropertiesform.editlayer.addEventListener('keyup', changeEditLayer, false);
	layerpropertiesform.texturedenabled.addEventListener('click', function (e) {
		var isOn = this.getAttribute('on') !== null;
		var l = layerpropertiesform.editlayer.selectedIndex;
		if(isOn) {
			layerpropertiesform.layerwidth.value = 8;
			layerpropertiesform.layerheight.value = 8;
			layerpropertiesform.layerwidth.disabled = true;
			layerpropertiesform.layerheight.disabled = true;
			layerpropertiesform.repeatx.disabled = true;
			layerpropertiesform.repeaty.disabled = true;
			layerpropertiesform.limitvr.disabled = true;
			
			if(l !== 3) {
				layerpropertiesform.repeatx.setAttribute('on');
				layerpropertiesform.repeaty.setAttribute('on');
				layerpropertiesform.limitvr.removeAttribute('on');
			}
		}
		else {
			layerpropertiesform.layerwidth.disabled = false;
			layerpropertiesform.layerheight.disabled = false;
			layerpropertiesform.repeatx.disabled = l === 3;
			layerpropertiesform.repeaty.disabled = l === 3;
			layerpropertiesform.limitvr.disabled = l === 3;
			layerpropertiesform.layerwidth.value = J2L.LEVEL_INFO.LayerWidth[l];
			layerpropertiesform.layerheight.value = J2L.LEVEL_INFO.LayerHeight[l];
			
			if(J2L.LEVEL_INFO.LayerProperties[l] & 1 === 1 && l !== 3)
				layerpropertiesform.repeatx.setAttribute('on');
			else
				layerpropertiesform.repeatx.removeAttribute('on');
			
			if((J2L.LEVEL_INFO.LayerProperties[l] & 2) >> 1 === 1 && l !== 3)
				layerpropertiesform.repeaty.setAttribute('on');
			else
				layerpropertiesform.repeaty.removeAttribute('on');
		
			if((J2L.LEVEL_INFO.LayerProperties[l] & 4) >> 2 === 1 && l !== 3/* && !tileH*/)
				layerpropertiesform.limitvr.setAttribute('on');
			else
				layerpropertiesform.limitvr.removeAttribute('on');
		}
	}, false);
	layerpropertiesform.submitButton.addEventListener('click', function (e) {
		if(saveLayerProperties(layerpropertiesform.editlayer.selectedIndex)) {
			Popup.hide();
		}
	}, false);
	
	layerbuttons.addEventListener("click", function (e) {
		var t = e.target;
		if(t.value !== undefined) {
			changeLayer((+t.value)-1);
		}
	}, false);
	clearLayerButton.addEventListener('click', function (e) {
		if(confirm('Are you sure you want to erase this layer\'s content?')) {
			var l = currentLayer;
			var lw = J2L.LEVEL_INFO.LayerWidth[l];
			var lh = J2L.LEVEL_INFO.LayerHeight[l];
			if(l === 3) {
				J2L.EVENTS = new Uint32Array(lw*lh);
				updateEventPointers();
			}
			for(var x=0; x < lw; x+=1) {
				for(var y=0; y < lh; y+=1) {
					J2L.LEVEL[l][x][y] = {'id': 0, 'animated': false, 'flipped': false};
				}
			}
			if(socket && socket.readyState === 1) {
				sendUpdate({
					what: 'clear',
					layer: l
				});
			}
		}
	}, false);
	global.addEventListener("mousewheel", scrollwheel, false);
	global.addEventListener("keydown", winkeydown, false);
	global.addEventListener("keyup", winkeyup, false);
	
	global.addEventListener('keydown', function (e) { // Prevent backspace navigation
		if(e.keyIdentifier === 'U+0008'|| e.keyIdentifier === 'Backspace') {
			if(e.target === global.document.body) {
				e.preventDefault();
			}
		}
	}, true);
	
	selectTileset.addEventListener("change", function () {
		var si = selectTileset.selectedIndex;
		changeTileset(si);
	}, false);
	tilesetTypePicker.addEventListener("change", function () {
		var si = tilesetTypePicker.selectedIndex;
		tilesetTypeSelected = si;
	}, false);
	zoomin.addEventListener("click", function () {
		zoomlevel *= 2;
		if(zoomlevel > 2) zoomlevel = 2;
		else {
			scrollbars.layers.scroll[0]=scrollbars.layers.scroll[0]*2+layercanvas.width/2;
			scrollbars.layers.scroll[1]=scrollbars.layers.scroll[1]*2+layercanvas.height/2;
		}
		zoomlevelSpan.textContent = (zoomlevel*100) + "%";
	}, false);
	zoomout.addEventListener("click", function () {
		zoomlevel /= 2;
		if(zoomlevel < 1/8) zoomlevel = 1/8;
		else {
			scrollbars.layers.scroll[0]=scrollbars.layers.scroll[0]/2-layercanvas.width/4;
			scrollbars.layers.scroll[1]=scrollbars.layers.scroll[1]/2-layercanvas.height/4;
		}
		zoomlevelSpan.textContent = (zoomlevel*100) + "%";
	}, false);
	toggleMask.addEventListener("click", function (e) {
		var isOn = this.className === 'selected';
		if(isOn) this.className = '';
		else this.className = 'selected';
		showLayerMask = !isOn;
	}, false);
	toggleEvents.addEventListener("click", function (e) {
		var isOn = this.className === 'selected';
		if(isOn) this.className = '';
		else this.className = 'selected';
		showLayerEvents = !isOn;
	}, false);
	toggleParallaxEvents.addEventListener("click", function (e) {
		var isOn = this.className === 'selected';
		if(isOn) this.className = '';
		else this.className = 'selected';
		showParallaxEvents = !isOn
	}, false);
	toggleAnimMask.addEventListener("click", function (e) {
		var isOn = this.className === 'selected';
		if(isOn) this.className = '';
		else this.className = 'selected';
		showAnimMask =!isOn
	}, false);
	parallaxLight.addEventListener('input', function () {
		pxLightOutput.textContent = this.value;
		pxLightLevel = +this.value;
	}, false);
	moveAnimUp.addEventListener("click", moveAnim(-1), false);
	moveAnimDown.addEventListener("click", moveAnim(1), false);
	layercanvas.addEventListener("contextmenu", function(e) {e.preventDefault();return false;}, false);
	parallaxcanvas.addEventListener("contextmenu", function(e) {e.preventDefault();return false;}, false);
	animscanvas.addEventListener("contextmenu", function(e) {e.preventDefault();return false;}, false);
	tilesetcanvas.addEventListener("contextmenu", function(e) {e.preventDefault();return false;}, false);
	
	var socket;
	var cursorList = [];
	var userlist = [];
	var myUniqueId = -1;
	var serverPassword = '';
	
	var sendUpdate = function (obj) {
		switch(obj.what) {
			case 'layer':
				var sel = JSON.stringify(obj.selection);
				socket.send(packStruct([
					'u8',
					'u8',
					
					'u8',
					['u16', 4],
					'u8',
					'u32',
					'C'+sel.length
				], [
					0x08,
					0x01,
					
					obj.layer,
					obj.startX,
					obj.startY,
					obj.width,
					obj.height,
					obj.includeEmpty ? 1 : 0,
					sel.length,
					sel
				]));
				break;
			
			case 'event':
				socket.send(packStruct([
					'u8',
					'u8',
					
					'u8',
					['u16', 2],
					'u32'
				], [
					0x08, // Update
					0x02, // Event
					
					obj.where === 'tileset' ? 1 : 0,
					obj.x,
					obj.y,
					obj.event
				]));
				break;
			
			case 'tilesetchange':
				socket.send(packStruct([
					'u8',
					'u8',
					
					'u8',
					'C'+obj.tileset.length
				], [
					0x08, // Update
					0x03, // Tileset change
					
					obj.tileset.length,
					obj.tileset
				]));
				break;
			
			case 'levelprop':
				socket.send(packStruct([
					'u8',
					'u8',
					
					['C32', 5],
					['u8', 2],
					'u8',
					['C512', 16]
					
				], [
					0x08, // Update
					0x04, // Level properties
					
					obj.levelName,
					obj.nextLevel,
					obj.secretLevel,
					obj.bonusLevel,
					obj.musicFile,
					
					obj.minLight,
					obj.startLight,
					
					((obj.splitScreen?1:0) << 0) | ((obj.multiPlayer?1:0) << 1) | ((obj.hideLevel?1:0) << 2)
				].concat(obj.helpString)));
				break;
			
			case 'anims':
				switch(obj.type) {
					case 'new':
						socket.send(packStruct([
							['u8', 3]
						], [
							0x08, // Update
							0x05, // Anims
							0x01 // New anim
						]));
						break;
					
					case 'frame':
						socket.send(packStruct([
							['u8', 3],
							
							'u16',
							'u8',
							'u16',
							'u8'
						], [
							0x08, // Update
							0x05, // Anims
							0x02, // Add a frame
							
							obj.anim,
							obj.pos,
							obj.tile.id,
							((obj.tile.animated?1:0) << 0) | ((obj.tile.flipped?1:0) << 1)
						]));
						break;
					
					case 'move':
						socket.send(packStruct([
							['u8', 3],
							
							'u16',
							's8'
						], [
							0x08, // Update
							0x05, // Anims
							0x03, // Move anim
							
							obj.anim,
							obj.by
						]));
						break;
					
					case 'delFrame':
						socket.send(packStruct([
							['u8', 3],
							
							'u16',
							'u8'
						], [
							0x08, // Update
							0x05, // Anims
							0x04, // Delete a frame
							
							obj.anim,
							obj.frame
						]));
						break;
					
					case 'delAnim':
						socket.send(packStruct([
							['u8', 3],
							
							'u16'
						], [
							0x08, // Update
							0x05, // Anims
							0x05, // Delete an animation
							
							obj.anim
						]));
						break;
					
					case 'clone':
						socket.send(packStruct([
							['u8', 3],
							
							'u16'
						], [
							0x08, // Update
							0x05, // Anims
							0x06, // Clone an animation
							
							obj.anim
						]));
						break;
					
					case 'props':
						socket.send(packStruct([
							['u8', 3],
							
							'u16',
							'u8',
							'u16',
							'u16',
							'u16',
							'u8'
						], [
							0x08, // Update
							0x05, // Anims
							0x07, // Animation Properties
							
							obj.anim,
							obj.fps,
							obj.frameWait,
							obj.randomAdder,
							obj.pingPongWait,
							obj.isItPingPong?1:0
						]));
						break;
				}
				break;
			
			case 'tiletype':
				socket.send(packStruct([
					'u8',
					'u8',
					
					'u8',
					'u16'
				], [
					0x08, // Update
					0x06, // Tiletype
					
					obj.type,
					obj.pos
				]));
				break;
			
			case 'layerinfo':
				socket.send(packStruct([
					'u8',
					'u8',
					
					'u8',
					['u16', 2],
					['s32', 4],
					'u8',
					['u8', 3]
					
				], [
					0x08, // Update
					0x07, // Layer info
					
					obj.layer,
					obj.w, obj.h,
					obj.xspeed*65536, obj.yspeed*65536,
					obj.autoxspeed*65536, obj.autoyspeed*65536,
					obj.properties,
					obj.color[0], obj.color[1], obj.color[2]
				]));
				break;
			
			case 'clear':
				socket.send(packStruct([
					'u8',
					'u8',
					
					'u8'
				], [
					0x08, // Update
					0x08, // Clear layer
					
					obj.layer
				]));
				break;
			
			case 'new':
				socket.send(packStruct([
					'u8',
					'u8'
				], [
					0x08, // Update
					0x09 // New level
				]));
				break;
		}
	};
	
	var sendLevel = function (filename, data) {
		if(myUniqueId > -1) {
			socket.send(packStruct([
				'u8',
				'u8',
				'C'+filename.length
			], [
				0x07,
				filename.length,
				filename
			])); // Tell others that level is about to change soon
			
			
			var fd = new FormData();
			var bb = new BlobBuilder();
			bb.append(data.buffer);
			fd.append('level', bb.getBlob());
			fd.append('filename', filename);
			fd.append('uid', myUniqueId);
			var X = new XMLHttpRequest();
			X.open('post', '/node/collab?level', true);
			X.addEventListener('load', function () {
				if(X.status === 200) {
					getCurrentLevel();
				}
			}, false);
			X.send(fd);
		}
	};
	var getCurrentLevel = function () {
		var X = new XMLHttpRequest();
		X.open('get', '/node/collab?getlevel&pswd='+encodeURIComponent(serverPassword), true);
		X.responseType = 'arraybuffer';
		Popup.open('loadinglevel');
		var levloadprogr = global.document.querySelector("#levelloadingprogress");
		global.document.querySelector("#loadlevelname").innerText = "";
		levloadprogr.style.width = "0%";
		var st = Date.now();
		X.addEventListener('load', function () {
			if(X.status === 200) {
				loadlevel(new Uint8Array(X.response), 'collaborative.j2l', true);
				clearUndoHistory();
				Popup.hide();
			}
			else {
				Popup.hide();
				alert('Wrong password');
			}
		}, false);
		var maxProgr = 0;
		X.addEventListener('progress', function (e) {
			maxProgr = Math.max(maxProgr, e.loaded/e.total);
			levloadprogr.style.width = maxProgr+"%";
		}, false);
		X.send();
	};
	
	global.addEventListener('load', function () {
		if(localStorage.animHeight !== undefined) {
			animscanvas.height = localStorage.animHeight;
		}
		else {
			animscanvas.height = 100;
			localStorage.animHeight = 100;
		}
		if(localStorage.parallaxHeight !== undefined) {
			parallaxcanvas.height = localStorage.parallaxHeight;
		}
		else {
			parallaxcanvas.height = 100;
			localStorage.parallaxHeight = 100;
		}
		resizer();
		
		starttime = new Date().getTime();
		var oldTime = new Date().getTime();
		setInterval(function () {
			var now = new Date().getTime();
			var ms = (now - oldTime)/1000;
			oldTime = now;
			fps = frameOffset/ms;
			fpsSpan.textContent = Math.round(fps);
			frameOffset = 0;
		}, 500);
		changeLayer(currentLayer);
		redraw();
		//requestAnimFrame(function () {redraw();}, layercanvas);
		
		if(serverInfo.isCollab) {
			chatPanel.style.display = 'block';
			chatPanel.style.width = '230px';
			global.document.querySelector('#content').style.right = '8px';
			resizer();
			chatResizer.addEventListener('mousedown', function (e) {
				chatResizer.isDragging = true;
				e.preventDefault();
				return false;
			}, false);
			global.document.chatform.onsubmit = function (e) {
				if(socket && socket.readyState === 1 && chatInput.value.length > 0) {
					var msg = chatInput.value.trim().substring(0, 255);
					chatInput.value = '';
					socket.send(packStruct([
						'u8',
						'u8',
						'C'+msg.length
					], [
						0x02,
						msg.length,
						msg
					]));
				}
				return false;
			};
			var addChat = function (i, msg) {
				var chatNode = global.document.createElement('div');
				chatNode.innerHTML = '<strong>'+(i !== -1 ? userlist[i].username.replace(/\</g, '&lt;').replace(/\>/g, '&gt;')+':':'')+'</strong> '+ msg;
				chatContent.appendChild(chatNode);
				chatContent.scrollTop = chatContent.scrollHeight;
			};
			var addUser = function (i) {
				userlist[i].listnode = global.document.createElement('span');
				userlist[i].listnode.innerHTML = userlist[i].username.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
				userlist[i].listnode.className = 'user';
				chatUserlist.appendChild(userlist[i].listnode);
			};
			
			var isConnected = false;
			//socket = io.connect(null/*, {'max reconnection attempts': 0}*/);
			
			var username = prompt("Set your name", readCookie('WebJCS_username')) || "";
			if(username) {
				createCookie('WebJCS_username', username, 60 /*Days*/);
			}
			var pswd = "";
			if(serverInfo.passworded) {
				pswd = prompt("Server requests a password", "");
				if(!pswd) {
					pswd = "";
				}
			}
			serverPassword = pswd;
			if(!global.WebSocket) global.WebSocket = global.MozWebSocket;
			socket = new WebSocket("ws://"+global.document.location.host+"/?username="+encodeURIComponent(username)+"&pswd="+encodeURIComponent(pswd), 'webjcs');
			socket.binaryType = 'arraybuffer';
			
			socket.addEventListener('open', function (e) {
				console.log('OPEN');
				isConnected = true;
				addChat(-1, '<em>Connected to server</em>');
				console.log('Loading level from server...');
				chatUserlist.innerHTML = '';
				userlist = [];
				cursorList = [];
				myUniqueId = -1;
				pingDiv.style.width = "0%";
				pingDiv.style.display = 'block';
				pingVal.innerHTML = "";
				getCurrentLevel();
			}, false);
			
			socket.addEventListener('message', function (msgevt) {
				var packet = new Uint8Array(msgevt.data);
				var packetID = packet[0];
				switch(packetID) {
					case 0x00: // You was disconnected/kicked/banned etc..
						var msgLen = packet[1];
						var message = "";
						var cursor = 2;
						while(message.length < msgLen) {
							message += String.fromCharCode(packet[cursor++]);
						}
						Popup.hide();
						
						alert("You got disconnected!\n\r"+message);
						break;
					case 0x02: // Chat message
						var data = unpackStruct([['s32', 'index'], ['u8', 'msgLen']], packet.subarray(1, 6));
						var index = data.index;
						var msgLen = data.msgLen;
						var cursor = 6;
						var message = "";
						while(message.length < msgLen) {
							message += String.fromCharCode(packet[cursor++]);
						}
						if(index > -1)
							message = message.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');
						addChat(index, message);
						break;
					
					case 0x03: // Someone disconnected
						var packetInfo = unpackStruct([['u32', 'index'], ['u16', 'code'], ['u8', 'reasonLen']], packet.subarray(1, 8));
						var i = packetInfo.index;
						var cursor = 8;
						var code = packetInfo.code;
						var reason = "";
						while(reason.length < packetInfo.reasonLen) {
							reason += String.fromCharCode(packet[cursor++]);
						}
						
						if(userlist[i] === undefined) return;
						chatUserlist.removeChild(userlist[i].listnode);
						addChat(-1, '<em>'+userlist[i].username.replace(/\</g, '&lt;').replace(/\>/g, '&gt;')+' <a href="javascript:" title="'+reason+'">left</a></em>');
						userlist.splice(i, 1);
						cursorList.splice(i, 1);
						break;
					
					case 0x04: // Join notification
						var i = userlist.length;
						var cursor = 1;
						var namelen = packet[cursor++];
						var name = "";
						while(name.length < namelen) {
							name += String.fromCharCode(packet[cursor++]);
						}
						userlist[i] = {};
						userlist[i].username = name;
						cursorList[i] = null;
						addChat(-1, '<em>'+name.replace(/\</g, '&lt;').replace(/\>/g, '&gt;')+' joined</em>');
						addUser(i);
						break;
					
					case 0x05: // Userlist
						var cursor = 9;
						userlist = [];
						cursorList = [];
						myUniqueId = unpackStruct([['u32', 'n']], packet.subarray(1, 5)).n;
						var userCount = unpackStruct([['u32', 'n']], packet.subarray(5, 9)).n;
						for(var i=0; i < userCount; i++) {
							var namelen = packet[cursor++];
							var name = "";
							while(name.length < namelen) {
								name += String.fromCharCode(packet[cursor++]);
							}
							userlist[i] = {
								username: name
							};
							cursorList[i] = null;
							addUser(i);
						}
						break;
					
					case 0x06: // Level
						getCurrentLevel();
						/*var dataLen = unpackStruct([['u32', 'n']], packet.subarray(1, 5)).n;
						var data = new Uint8Array(packet.subarray(5, dataLen+5));
						console.log('Parsing level...');
						loadlevel(data, 'collaborative.j2l', true);
						clearUndoHistory();*/
						break;
					
					case 0x08: // Update
						switch(packet[1]) {
							case 0x01: // Layer update
								var l = packet[2];
								var sx = getBinary('u16', packet.subarray(3, 5));
								var sy = getBinary('u16', packet.subarray(5, 7));
								var sw = getBinary('u16', packet.subarray(7, 9));
								var sh = getBinary('u16', packet.subarray(9, 11));
								var includeEmpty = packet[11] > 0;
								var dataLen = getBinary('u32', packet.subarray(12, 16));
								
								var cursor = 16;
								var selection = "";
								while(selection.length < dataLen) selection += String.fromCharCode(packet[cursor++]);
								selection = JSON.parse(selection);
								
								updateTiles(l, sx, sy, sw, sh, selection, includeEmpty);
								updateEventPointers();
								break;
							
							case 0x02: // Event
								var obj = unpackStruct([
									['u8', 'where'],
									['u16', 'x'],
									['u16', 'y'],
									['u32', 'event']
								], packet.subarray(2, 11));
								if(obj.where !== 1) {
									J2L.EVENTS[obj.x+J2L.LEVEL_INFO.LayerWidth[3]*obj.y] = obj.event;
								}
								else {
									J2L.TilesetProperties.TileEvent[obj.x+10*obj.y] = obj.event;
								}
								break;
							
							case 0x03: // Tileset change
								var filenameLen = packet[2];
								var cursor = 3;
								var filename = "";
								while(filename.length < filenameLen) filename += String.fromCharCode(packet[cursor++]);
								
								var si = 0;
								alphaSort(tilesets);
								var l = tilesets.length;
								for(var i=0; i < l; i+=1) {
									si+=1;
									if(tilesets[i].name.toLowerCase() === filename.toLowerCase()) {
										break;
									}
								}
								if(i === l) {
									si = 0;
								}
								if(si === 0 && packet.tileset !== "") {
									alert("Couldn't find tileset \""+filename+"\"");
								}
								else {
									changeTileset(0, true);
									changeTileset(si, true);
								}
								break;
							
							case 0x04: // Level properties
								var obj = unpackStruct([
									['C32', 'levelName'],
									['C32', 'nextLevel'],
									['C32', 'secretLevel'],
									['C32', 'bonusLevel'],
									['C32', 'musicFile'],
									
									['u8', 'minLight'],
									['u8', 'startLight'],
									
									['u8', 'bitfield'],
									
									['C512', 'helpString', 16]
								], packet.subarray(2));
								var splitScreen = (obj.bitfield >> 0) & 1 > 0;
								var isMP = (obj.bitfield >> 1) & 1 > 0;
								var hideLevel = (obj.bitfield >> 2) & 1 > 0;
								
								J2L.LEVEL_INFO.LevelName = obj.levelName;
								J2L.LEVEL_INFO.NextLevel = obj.nextLevel;
								J2L.LEVEL_INFO.SecretLevel = obj.secretLevel;
								J2L.LEVEL_INFO.BonusLevel = obj.bonusLevel
								J2L.LEVEL_INFO.MusicFile = obj.musicFile
								J2L.LEVEL_INFO.MinimumAmbient = obj.minLight;
								J2L.LEVEL_INFO.StartingAmbient = obj.startLight;
								J2L.LEVEL_INFO.SplitScreenDivider = splitScreen;
								J2L.LEVEL_INFO.IsItMultiplayer = isMP;
								J2L.HEADER_INFO.HideLevel = hideLevel;
								for(var i = 0; i < 16; i+=1) {
									J2L.LEVEL_INFO.HelpString[i] = obj.helpString[i];
								}
								break;
							
							case 0x05: // Anims
								switch(packet[2]) {
									case 0x01: // New animation
										J2L.ANIMS.push({
											'FramesBetweenCycles': 0,
											'RandomAdder': 0,
											'PingPongWait': 0,
											'IsItPingPong': 0,
											'FPS': 10,
											'Frames': 0,
											'Tiles': []
										});
										break;
									
									case 0x02: // Add frame
										var obj = unpackStruct([
											['u16', 'anim'],
											['u8', 'pos'],
											['u16', 'id'],
											['u8', 'flags']
										], packet.subarray(3));
										var animated = (obj.flags >> 0) & 1 > 0;
										var flipped = (obj.flags >> 1) & 1 > 0;
										J2L.ANIMS[obj.anim].Tiles.splice(obj.pos, 0, {'id': obj.id, 'animated': animated, 'flipped': flipped});
										J2L.ANIMS[obj.anim].Frames = J2L.ANIMS[obj.anim].Tiles.length;
										break;
									
									case 0x03: // Move anim up/down
										var obj = unpackStruct([
											['u16', 'anim'],
											['s8', 'by']
										], packet.subarray(3));
										var tmpHolder = J2L.ANIMS[obj.anim];
										J2L.ANIMS[obj.anim] = J2L.ANIMS[obj.anim+obj.by];
										J2L.ANIMS[obj.anim+obj.by] = tmpHolder;
										break;
									
									case 0x04: // Delete a frame
										var obj = unpackStruct([
											['u16', 'anim'],
											['u8', 'frame']
										], packet.subarray(3));
										J2L.ANIMS[obj.anim].Tiles.splice(obj.frame, 1);
										J2L.ANIMS[obj.anim].Frames = J2L.ANIMS[obj.anim].Tiles.length;
										break;
									
									case 0x05: // Delete an animation
										var anim = getBinary('u16', packet.subarray(3, 5));
										J2L.ANIMS.splice(anim, 1);
										if(animSelection && animSelection[1] > anim) {
											animSelection[1]-=1;
										}
										break;
									
									case 0x06: // Clone an animation
										var anim = getBinary('u16', packet.subarray(3, 5));
										J2L.ANIMS.push(JSON.parse(JSON.stringify(J2L.ANIMS[anim])));
										if(animSelection && animSelection[1] >= J2L.ANIMS.length-1) {
											animSelection[1]+=1;
										}
										break;
									
									case 0x07: // Animation Properties
										var obj = unpackStruct([
											['u16', 'anim'],
											['u8', 'fps'],
											['u16', 'frameWait'],
											['u16', 'randomAdder'],
											['u16', 'pingPongWait'],
											['u8', 'isItPingPong']
										], packet.subarray(3));
										J2L.ANIMS[obj.anim].FPS = obj.fps;
										J2L.ANIMS[obj.anim].FramesBetweenCycles = obj.frameWait;
										J2L.ANIMS[obj.anim].RandomAdder = obj.randomAdder;
										J2L.ANIMS[obj.anim].PingPongWait = obj.pingPongWait;
										J2L.ANIMS[obj.anim].IsItPingPong = obj.isItPingPong > 0;
										break;
								}
								break;
							case 0x06: // Tile type change
								J2L.TilesetProperties.TileType[getBinary('u16', packet.subarray(3, 5))] = packet[2];
								break;
							
							case 0x07: // Layer info update
								var obj = unpackStruct([
									['u8', 'layer'],
									['u16', 'w'],
									['u16', 'h'],
									['s32', 'xspeed'],
									['s32', 'yspeed'],
									['s32', 'autoxspeed'],
									['s32', 'autoyspeed'],
									['u8', 'properties'],
									['u8', 'color', 3]
								], packet.subarray(2));
								obj.xspeed /= 65536;
								obj.yspeed /= 65536;
								obj.autoxspeed /= 65536;
								obj.autoyspeed /= 65536;
								
								var l = obj.layer;
								J2L.LEVEL_INFO.LayerProperties[l] = obj.properties;
								J2L.LEVEL_INFO.LayerXSpeed[l] = obj.xspeed;
								J2L.LEVEL_INFO.LayerYSpeed[l] = obj.yspeed;
								J2L.LEVEL_INFO.LayerAutoXSpeed[l] = obj.autoxspeed;
								J2L.LEVEL_INFO.LayerAutoYSpeed[l] = obj.autoyspeed;
								for(var i=0; i < 3; i+=1) {
									J2L.LEVEL_INFO['LayerRGB'+(l+1)][i] = obj.color[i];
								}
								var oldlw = J2L.LEVEL_INFO.LayerWidth[l];
								var oldlh = J2L.LEVEL_INFO.LayerHeight[l];
								var lw = obj.w;
								var lh = obj.h;
								if(lw !== oldlw || lh !== oldlh) {
									J2L.LEVEL_INFO.LayerWidth[l] = lw;
									J2L.LEVEL_INFO.LayerHeight[l] = lh;
									var newLEVEL = [];
									var isWithin = false;
									if(l === 3)
										var newEVENTS = new Uint32Array(lw*lh);
									for(var x = 0; x < lw; x+=1) {
										newLEVEL[x] = [];
										for(var y = 0; y < lh; y+=1) {
											isWithin = x < oldlw && y < oldlh;
											newLEVEL[x][y] = {
												'id': isWithin? J2L.LEVEL[l][x][y].id : 0,
												'animated': isWithin? J2L.LEVEL[l][x][y].animated : false,
												'flipped': isWithin? J2L.LEVEL[l][x][y].flipped : false
											};
											if(l === 3)
												newEVENTS[x + lw*y] = isWithin? J2L.EVENTS[x + oldlw*y] : 0;
										}
									}
									
									J2L.LEVEL[l] = newLEVEL;
									if(l === 3) {
										J2L.EVENTS = newEVENTS;
										updateEventPointers();
									}
								}
								break;
							
							case 0x08: // Clear a layer
								var l = packet[2];
								var lw = J2L.LEVEL_INFO.LayerWidth[l];
								var lh = J2L.LEVEL_INFO.LayerHeight[l];
								if(l === 3) {
									J2L.EVENTS = new Uint32Array(lw*lh);
									updateEventPointers();
								}
								for(var x=0; x < lw; x+=1) {
									for(var y=0; y < lh; y+=1) {
										J2L.LEVEL[l][x][y] = {'id': 0, 'animated': false, 'flipped': false};
									}
								}
								break;
							
							case 0x09: // Create a blank level
								scrollbars.layers.scroll = [0, 0];
								changeLayer(3);
								getCurrentLevel();
								break;
						}
						break;
					
					case 0x09:
						var obj = unpackStruct([
							['u8', 'layer'],
							['u32', 'index'],
							['u32', 'x'],
							['u32', 'y']
						], packet.subarray(1));
						cursorList[obj.index] = {x: obj.x, y: obj.y, layer: obj.layer};
						break;
					case 0x10:
						socket.send(packStruct(['u8'], [0x10]));
						var ping = getBinary('s32', packet.subarray(1));
						if(ping > -1) {
							setTimeout(function () {
								pingVal.innerHTML = ping+"&nbsp;ms";
								pingDiv.style.width = Math.min(Math.floor((ping/1100)*100), 100)+"%";
							}, 0);
						}
						break;
					
					default:
						console.log('Unknown packet:', packet);
						break;
				}
			}, false);
			socket.addEventListener('close', function (e) {
				console.log('CLOSE', e);
				addChat(-1, '<em>Disconnected</em>');
				pingDiv.style.width = "0%";
				pingDiv.style.display = 'none';
				pingVal.innerHTML = "";
				myUniqueId = -1;
				chatUserlist.innerHTML = '';
				userlist = [];
				cursorList = [];
			}, false);
		}
		(function () {
			var X = new XMLHttpRequest();
			X.open("GET", 'Anims.json', true);
			X.addEventListener('load', function (e) {
				if(X.status === 200) {
					var st = Date.now();
					document.getElementById('animProgress').innerHTML = "";
					ANIMS = JSON.parse(X.response);
					for(var i=0; i < ANIMS.length; i++) {
						for(var j=0; j < ANIMS[i].length; j++) {
							for(var k=0; k < ANIMS[i][j].data.length; k++) {
								ANIMS[i][j].data[k] = global.atob(ANIMS[i][j].data[k]).split("");
								ANIMS[i][j].data[k].forEach(function (v, i, a) {
									a[i] = v.charCodeAt(0);
								});
								ANIMS[i][j].data[k] = new Uint8Array(ANIMS[i][j].data[k]);
							}
						}
					}
					console.log('Parsed Anims in '+(Date.now()-st)/1000+'s');
				}
			});
			X.addEventListener('progress', function (e) {
				document.getElementById('animProgress').innerHTML = Math.round((e.loaded/e.total)*100)+"%";
			});
			X.send();
		}());
	}, false);
	
}(window));
