var level = function (filedata, callback, onprogr, handleerror) {
	if(filedata.length === 0) {
		handleerror('Trying to open an empty file');
		return;
	}
	var binary2array = function (str) {
		var l = str.length;
		var a = new Uint8Array(l);
		for(var i=0; i < l; i+=1) {
			a[i] = str.charCodeAt(i) & 0xFF;
		}
		return a;
	};
	var HEADER_SIZE = 262;
	var HEADER_STRUCT =
		"A180Copyright/"+
		"A4Identifier/"+
		"A3PasswordHash/"+
		"CHideLevel/"+
		"a32LevelName/"+
		"vVersion/"+
		"VFileSize/"+
		"VCRC32/"+
		"VCSize1/"+
		"VUSize1/"+
		"VCSize2/"+
		"VUSize2/"+
		"VCSize3/"+
		"VUSize3/"+
		"VCSize4/"+
		"VUSize4";
	var LEVEL_INFO_STRUCT = // By Stijn, modified by djazz
		'vJcsHorizontal/'+
		'vSecurityEnvelope1/'+
		'vJcsVertical/'+
		'vSecurityEnvelope2/'+
		'CSecEnvAndLayer/'+
		'CMinimumAmbient/'+
		'CStartingAmbient/'+
		'vAnimsUsed/'+
		'CSplitScreenDivider/'+
		'CIsItMultiplayer/'+
		'VStreamSize/'+
		'a32LevelName/'+
		'a32Tileset/'+
		'a32BonusLevel/'+
		'a32NextLevel/'+
		'a32SecretLevel/'+
		'a32MusicFile/'+
		'A8192HelpStrings/'+
		'V8LayerProperties/'+
		'C8LayerUnknown1/'+
		'C8IsLayerUsed/'+
		'V8LayerWidth/'+
		'V8JJ2LayerWidth/'+
		'V8LayerHeight/'+
		'l8LayerUnknown2/'+
		'V18LayerUnknown3/'+
		'l8LayerXSpeed/'+
		'l8LayerYSpeed/'+
		'l8LayerAutoXSpeed/'+
		'l8LayerAutoYSpeed/'+
		'C8LayerUnknown4/'+
		'C3LayerRGB1/'+
		'C3LayerRGB2/'+
		'C3LayerRGB3/'+
		'C3LayerRGB4/'+
		'C3LayerRGB5/'+
		'C3LayerRGB6/'+
		'C3LayerRGB7/'+
		'C3LayerRGB8/'+
		'vStaticTiles'
	var ANIM_STRUCT = 
		"vFramesBetweenCycles/"+
		"vRandomAdder/"+
		"vPingPongWait/"+
		"CIsItPingPong/"+
		"CFPS/"+
		"CFrames";
	
	var zfs = function (v) {v=v+'';if(v.length == 1) return "0"+v; return v;};
	var trimNull = function (str) {
		var str = str.replace(/^\0\0*/, ''),
			 ws = /\0/,
			 i = str.length;
		while (ws.test(str.charAt(--i)));
		return str.slice(0, i + 1);
	}
	var unpack = function (formatCode, data) {
		formatCode = formatCode.replace(/\ /g,"").replace(/\n/g,"").replace(/\r/g,"").replace(/\t/g,"");
		var readOffset = 0;
		var adder = false;
		var struct = {};
		var bytelength = 0;
		var tmpbytes = "";
		var tmpvalue = "";
		var pusher = 1;
		formatCode = formatCode.split("/");
		var matches;
		for(var i=0; i < formatCode.length; i+=1) {
			if(formatCode==="") {
				continue;
			}
			matches = formatCode[i].match(/(^[a-zA-Z])(\*|\d+)(\w+$)/);
			if(matches===null) {
				matches = formatCode[i].match(/(^[a-zA-Z])(\*|\d+)(\w?$)/);
			}
			if(matches===null) {
				matches = formatCode[i].match(/(^[a-zA-Z])(\*|\d?)(\w+$)/);
			}
			if(matches===null) {
				matches = formatCode[i].match(/(^[a-zA-Z])(\*|\d?)(\w?$)/);
			}
			if(matches===null) {
				throw new SyntaxError("'"+formatCode[i]+"' is an invalid formatcode");
				return false;
			}
			adder = false;
			if(matches[2]==='*') {
				adder = true;
				matches[2] = data.length - readOffset;
				formatCode = formatCode.splice(i, formatCode.length - i);
			}
			else if(matches[2]!=='') {
				adder = true;
			}
			else {
				matches[2] = "1";
			}

			switch(matches[1]) {
				case "a":
				case "A":
					if(readOffset > data.length) {
						return struct;
					}
					tmpvalue = data.substr(readOffset, +matches[2]);
					if(matches[1]==="a") {
						tmpvalue = trimNull(tmpvalue);
					}
					if(matches[3].length > 0) {
						struct[matches[3]] = tmpvalue
					}
					else {
						struct[pusher+++''] = tmpvalue;
					}
					readOffset+=+matches[2];
					break;
				case "c":
				case "C":
				case "v":
				case "V":
				case "l":
				case "x":
					bytelength = 2;
					if(matches[1]==='V' || matches[1]==='l') {
						bytelength = 4;
					}
					else if(matches[1].toUpperCase()==="C" || matches[1]==='x') {
						bytelength = 1;
					}
					if(adder) {
						struct[matches[3]] = [];
					}
					for(var j=0; j < matches[2]; j+=1) {
						if(readOffset+bytelength > data.length) {
							return struct;
						}
						tmpbytes = data.substr(readOffset, bytelength);
						tmpvalue = '';
						for(var b=bytelength-1; b >=0 ; b-=1) {
							tmpvalue += zfs(tmpbytes.charCodeAt(b).toString(16));
						}
						if(matches[1]!=='x') {
							tmpvalue = parseInt(tmpvalue, 16);
							if(matches[1]==='l' || matches[1]==='c') {
								tmpvalue &= 0xFFFFFFFF;
							}
							if(matches[3].length > 0) {
								if(adder) {
									struct[matches[3]][j] = tmpvalue;
								}
								else {
									struct[matches[3]] = tmpvalue;
								}
							}
							else {
								struct[pusher+++''] = tmpvalue;
							}
						}
			
						readOffset+=bytelength;
					}
		
					break;
	
			}
		}
		return struct;
	}
	var str_pad = function (input, pad_length, pad_string, pad_type) {
		 // http://kevin.vanzonneveld.net
		 // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		 // + namespaced by: Michael White (http://getsprink.com)
		 // +      input by: Marco van Oort
		 // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
		 // *     example 1: str_pad('Kevin van Zonneveld', 30, '-=', 'STR_PAD_LEFT');
		 // *     returns 1: '-=-=-=-=-=-Kevin van Zonneveld'
		 // *     example 2: str_pad('Kevin van Zonneveld', 30, '-', 'STR_PAD_BOTH');
		 // *     returns 2: '------Kevin van Zonneveld-----'

		 var half = '', pad_to_go;

		 var str_pad_repeater = function (s, len) {
			 var collect = '', i;

			 while (collect.length < len) {collect += s;}
			 collect = collect.substr(0,len);

			 return collect;
		 };

		 input += '';
		 pad_string = pad_string !== undefined ? pad_string : ' ';
		 
		 if (pad_type != 'STR_PAD_LEFT' && pad_type != 'STR_PAD_RIGHT' && pad_type != 'STR_PAD_BOTH') { pad_type = 'STR_PAD_RIGHT'; }
		 if ((pad_to_go = pad_length - input.length) > 0) {
			 if (pad_type == 'STR_PAD_LEFT') { input = str_pad_repeater(pad_string, pad_to_go) + input; }
			 else if (pad_type == 'STR_PAD_RIGHT') { input = input + str_pad_repeater(pad_string, pad_to_go); }
			 else if (pad_type == 'STR_PAD_BOTH') {
			     half = str_pad_repeater(pad_string, Math.ceil(pad_to_go/2));
			     input = half + input + half;
			     input = input.substr(0, pad_length);
			 }
		 }

		 return input;
	};
	
	var output = {};
	var i, j, x, y, w, h, l;
	var progress = 0;
	var pos;
	
	var timeStart = new Date();
	var file = filedata;
	var filedata = '';
	Array.prototype.slice.apply(file).forEach(function (v, i, a) {
		filedata += String.fromCharCode(v);
	});
	// Get header
	var HEADER_INFO = unpack(HEADER_STRUCT, filedata.substr(0, HEADER_SIZE));
	progress+=0.05;
	//console.log(crc32(filedata.substr(262)), HEADER_INFO.CRC32);
	//self.postMessage({'progress': progress});
	if(HEADER_INFO.Identifier !== 'LEVL') {
		//self.postMessage({'error': 'wrong identifier'});
		//self.close();
		handleerror('Wrong identifier:' +HEADER_INFO.Identifier+"\nIs the file a J2L level?");
		return;
	}
	
	// Some good-to-have variables
	var isTSF = (HEADER_INFO.Version === 0x203);
	var MAX_TILES = isTSF ? 4096 : 1024;
	// Get the streams
	var offset = HEADER_SIZE;
	var Streams = [];
	for(i=0; i < 4; i+=1) {
		Streams[i] = filedata.substr(offset, HEADER_INFO["USize"+(i+1)]);
		offset += HEADER_INFO["USize"+(i+1)];
		progress+=0.1/4;
		//self.postMessage({'progress': progress});
	}
	
	// Get level info & fix some values
	var LEVEL_INFO = unpack(LEVEL_INFO_STRUCT, Streams[0]);
	if(LEVEL_INFO.LayerXSpeed === undefined) {
		//self.postMessage({'error': JSON.stringify(LEVEL_INFO)});
		//self.close();
		handleerror("file corrupt");
		return;
	}
	
	for(i=0; i < 8; i+=1) {
		LEVEL_INFO['LayerXSpeed'][i] /= 65536;
		LEVEL_INFO['LayerYSpeed'][i] /= 65536;
		LEVEL_INFO['LayerAutoXSpeed'][i] /= 65536;
		LEVEL_INFO['LayerAutoYSpeed'][i] /= 65536;
		progress+=0.05/8;
		//self.postMessage({'progress': progress});
	}
	LEVEL_INFO.HelpString = [];
	for(i=0;i<16;i++) {
		LEVEL_INFO.HelpString[i] = trimNull(LEVEL_INFO['HelpStrings'].substr(i*512, 512));
		progress+=0.05/16;
		//self.postMessage({'progress': progress});
	}
	
	// Tileset Properties
	var tilesetPropertiesOffset = 8813;
	var TilesetPropertiesStruct = 
		"V"+MAX_TILES+"TileEvent/"+
		"C"+MAX_TILES+"IsEachTileFlipped/"+
		"C"+MAX_TILES+"TileType/"+
		"C"+MAX_TILES+"TileUnknown2";
	var TilesetProperties = unpack(TilesetPropertiesStruct, Streams[0].substr(tilesetPropertiesOffset));
	
	// Animations
	var animOffset = tilesetPropertiesOffset + MAX_TILES*7;
	var ANIMS = [];
	for(i=0; i < LEVEL_INFO.AnimsUsed; i+=1) {
		ANIMS[i] = unpack(ANIM_STRUCT, Streams[0].substr(animOffset + i*137, 137)); // 137 = 9 + 64*2
		ANIMS[i].Tiles = [];
		for(j=0; j < ANIMS[i].Frames; j+=1) {
			id = unpack("v", Streams[0].substr(animOffset + i*137 + 9 + j*2, 2))[1];
			ANIMS[i].Tiles[j] = {};
			ANIMS[i].Tiles[j]['flipped'] = false;
			ANIMS[i].Tiles[j]['animated'] = false;
			if(id > MAX_TILES) {
				id -= MAX_TILES;
				ANIMS[i].Tiles[j]['flipped'] = true;
			}
			if(id >= LEVEL_INFO['StaticTiles']) {
				id -= LEVEL_INFO['StaticTiles'];
				ANIMS[i].Tiles[j]['animated'] = true;
			}
			ANIMS[i].Tiles[j]['id'] = id;
		}
		progress+=0.05/LEVEL_INFO.AnimsUsed;
		//self.postMessage({'progress': progress});
	}
	var normalStreamLength = animOffset + LEVEL_INFO.AnimsUsed*137;
	LEVEL_INFO.normalStreamLength = normalStreamLength;
	
	// Events
	//var raw_events = unpack("V"+Streams[1].length/4+"Events", Streams[1]).Events;
	var raw_events = new Uint32Array(binary2array(Streams[1]).buffer);
	/*var EVENTS = [];
	var len = Streams[1].length/4;
	for(i=0; i < len; i+=1) {
		event = raw_events[i];
		EVENTS[i] = 0;
		progress+=0.1/len;
		if(i % 500 === 0) {
			//self.postMessage({'progress': progress});
		}
		if(event===0) continue;
		EVENTS[i] = event;
		//EVENTS[i]['Bitfield'] = str_pad(event.toString(2), 32, "0", 'STR_PAD_LEFT');
		//EVENTS[i]['Id'] = parseInt(EVENTS[i]['Bitfield'].substr(-8,8), 2);
		//EVENTS[i]['Stuff'] = substr($EVENTS[$key]['Bitfield'],-8-4,4);
	}*/
	
	// Dictionary
	var DICT = [];
	//var dictList = unpack("v"+Streams[2].length/2+"Dict", Streams[2]).Dict;
	var dictList = new Uint16Array(binary2array(Streams[2]).buffer);
	var id = 0;
	len = Streams[2].length/8;
	for(i=0; i < len; i+=1) {
		DICT[i] = [];
		for(j=0; j < 4; j+=1) {
			DICT[i][j] = {};
			id = dictList[i*4+j];
			var oldid = id;
			DICT[i][j]['flipped'] = false;
			DICT[i][j]['animated'] = false;
			if(id > MAX_TILES) {
				id -= MAX_TILES;
				DICT[i][j]['flipped'] = true;
			}
			if(id >= LEVEL_INFO['StaticTiles']) {
				id -= LEVEL_INFO['StaticTiles'];
				DICT[i][j]['animated'] = true;
			}
			DICT[i][j]['id'] = id;
		}
		progress+=0.1/len;
		if(i % 100 === 0) {
			//self.postMessage({'progress': progress});
		}
	}
	
	progress = 0.5;
	//self.postMessage({'progress': progress});
	var steps = 0;
	
	// Create the level
	var LEVEL = [];
	for(l=0; l < 8; l+=1) {
		LEVEL[l] = [];
		w = LEVEL_INFO.LayerWidth[l];
		h = LEVEL_INFO.LayerHeight[l];
		for(x=0; x < w; x+=1) {
			LEVEL[l][x] = [];
			for(y=0; y < h; y+=1) {
				LEVEL[l][x][y] = {'flipped': false, 'animated': false, 'id': 0};
				steps += 1;
			}
		}
	}
	
	progress = 0.6;
	//self.postMessage({'progress': progress});
	
	var wordOffset = 0;
	var wordID = 0;
	var realWidth = 0;
	//var wordList = unpack("v"+Streams[3].length/2+"Words", Streams[3]).Words;
	var wordList = new Uint16Array(binary2array(Streams[3]).buffer);
	
	progress+=0.1;
	//self.postMessage({'progress': progress});
	
	for(l=0; l < 8; l+=1) {
		progress+=0.28/8;
		//self.postMessage({'progress': progress});
		if(LEVEL_INFO['IsLayerUsed'][l]===0) continue;
		w = LEVEL_INFO.LayerWidth[l];
		h = LEVEL_INFO.LayerHeight[l];
		realWidth = Math.ceil(w/4)*4;
		if(LEVEL_INFO.LayerProperties[l] & 1 === 1) {
			realWidth = Math.ceil(LEVEL_INFO.JJ2LayerWidth[l]/4)*4;
		}
		for(y=0; y < h; y+=1) {
			for(x=0; x < realWidth; x+=4) {
					wordID = wordList[wordOffset];
					for(t=0; t < 4; t+=1) {
						if(x+t >= w) break;
						LEVEL[l][x+t][y] = DICT[wordID][t];
					}
					wordOffset+=1;
			}
		}
	}
	
	progress=1;
	//self.postMessage({'progress': progress});
	var timeEnd = new Date();
	
	
	LEVEL_INFO.ExtraData = Streams[0].substr(normalStreamLength);
	
	output.HEADER_INFO = HEADER_INFO;
	output.isTSF = isTSF;
	output.MAX_TILES = MAX_TILES;
	output.LEVEL_INFO = LEVEL_INFO;
	output.TilesetProperties = TilesetProperties;
	output.ANIMS = ANIMS;
	output.EVENTS = raw_events;
	output.LEVEL = LEVEL;
	output.duration = (timeEnd-timeStart)/1000;
	console.log("Level loaded in "+output.duration+" seconds");
	callback(output);
	
	
	/*var i, j, x, y, w, h, event, offset;
	var work = new Worker('level.worker.js');
	work.addEventListener("message", function (e) {
		var data = e.data;
		if(data.progress !== undefined && typeof onprogr === 'function') {
			onprogr(data.progress);
			//console.log(data.progress);
			
		}
		else if(data.error !== undefined) {
			handleerror(data.error);
		}
		else {
			onprogr(1);
			setTimeout(function () {
				callback(data);
			}, 100);
		}
		
	}, false);
	work.addEventListener("error", function (e) {
		handleerror(JSON.stringify(e));
	}, false);
	work.postMessage({'filedata': filedata});*/
};
