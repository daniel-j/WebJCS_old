'use strict';
var iniparse = require('./node_modules/iniparse');
var mime = require('./node_modules/mime');
var http = require('http');
var fs = require('fs');
var path = require('path');
var urlmod = require('url');
var zlib = require('zlib');
var formidable = require('./node_modules/formidable');
var child_process = require('child_process');
var WebSocketServer = require('./node_modules/websocket-node').server; // https://github.com/Worlize/WebSocket-Node

process.title = 'WebJCS Web Server';
var defaultSettings = {};
var clientCount = 0;

/*var createSettingsFile = function () {
	console.log('Creating settings file...');
	var iniStr = '';
	for(var i in defaultSettings) {
		if(defaultSettings.hasOwnProperty(i)) {
			iniStr += '['+i+']\r\n';
			for(var j in defaultSettings[i]) {
				if(defaultSettings[i].hasOwnProperty(j)) {
					iniStr += j+'='+defaultSettings[i][j];
				}
			}
		}
	}
	
	fs.writeFile('./settings.ini', iniStr, function (err) {
		if(err) console.error('Warning: Could not create settings file');
	});
};*/

var TMP_DIR = (function() {
  var dirs = [process.env.TMP, '/tmp', process.cwd()];
  for (var i = 0; i < dirs.length; i++) {
    var dir = dirs[i];
    var isDirectory = false;

    try {
      isDirectory = fs.statSync(dir).isDirectory();
    } catch (e) {}

    if (isDirectory) return dir;
  }
})();

var crc32 = function (arr) {
	var crc32tab = [
		0x00000000, 0x77073096, 0xee0e612c, 0x990951ba,
		0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3,
		0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988,
		0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91,
		0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de,
		0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7,
		0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec,
		0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5,
		0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172,
		0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b,
		0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940,
		0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59,
		0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116,
		0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f,
		0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
		0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d,
		0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a,
		0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433,
		0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818,
		0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01,
		0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e,
		0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457,
		0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea, 0xfcb9887c,
		0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65,
		0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2,
		0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb,
		0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0,
		0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9,
		0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086,
		0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
		0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4,
		0x59b33d17, 0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad,
		0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a,
		0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683,
		0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8,
		0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1,
		0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe,
		0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7,
		0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc,
		0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5,
		0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252,
		0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
		0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60,
		0xdf60efc3, 0xa867df55, 0x316e8eef, 0x4669be79,
		0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
		0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f,
		0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04,
		0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d,
		0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a,
		0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713,
		0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38,
		0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21,
		0x86d3d2d4, 0xf1d4e242, 0x68ddb3f8, 0x1fda836e,
		0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777,
		0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c,
		0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45,
		0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2,
		0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db,
		0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0,
		0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
		0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6,
		0xbad03605, 0xcdd70693, 0x54de5729, 0x23d967bf,
		0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94,
		0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d
	];

	var crc = -1;
	for (var i = 0, l = arr.length; i < l; i++) {
		crc = (crc >>> 8) ^ crc32tab[(crc ^ arr[i]) & 0xff];
	}
	return crc ^ -1;
};

var zfs = function (v) {v=v+'';if(v.length == 1) return "0"+v; return v;};
var trimNull = function (str) {
	str = str.replace(/^\0\0*/, '');
	var ws = /\0/;
	var i = str.length;
	while (ws.test(str.charAt(--i)));
	return str.slice(0, i + 1);
};
var unpackStruct = function (formatCodes, buffer) {
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
		var bufFunc = 'read' + (type[0].toLowerCase()==='u'? 'U':'') + 'Int' + type[1] + (type[1] === 8? '':'LE');
		if(doArray) {
			output[name] = [];
		}
		for(var j=0; j < len; j+=1) {
			if(type[0].toLowerCase() === 'c') {
				part = buffer.slice(offset, offset+type[1]).toString('binary');
				if(type[0] === 'C') {
					part = trimNull(part);
				}
				offset += type[1];
			}
			else if(type[0].toLowerCase() === 'u' || type[0].toLowerCase() === 's') {
				part = buffer[bufFunc](offset);
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
    return new Buffer(binaryData);
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

var binary2array = function (str) {
	var l = str.length;
	var a = new Uint8Array(l);
	for(var i=0; i < l; i+=1) {
		a[i] = str.charCodeAt(i) & 0xFF;
	}
	return a;
};

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
};
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
var loadLevel = function (filedata) {
	if(filedata.length === 0) {
		console.error('Trying to read an empty J2L file');
		return;
	}
	
	var output = {};
	var i, j, x, y, w, h, l;
	var pos;
	
	var timeStart = new Date();
	
	// Get header
	var HEADER_INFO = unpack(HEADER_STRUCT, filedata.substr(0, 262));
	if(HEADER_INFO.Identifier !== 'LEVL') {
		console.error('Wrong identifier:' +HEADER_INFO.Identifier+": Is the file a J2L level?");
		return;
	}
	
	// Some good-to-have variables
	var isTSF = (HEADER_INFO.Version === 0x203);
	var MAX_TILES = isTSF ? 4096 : 1024;
	// Get the streams
	var offset = 262;
	var Streams = [];
	for(i=0; i < 4; i+=1) {
		Streams[i] = filedata.substr(offset, HEADER_INFO["USize"+(i+1)]);
		offset += HEADER_INFO["USize"+(i+1)];
	}
	
	// Get level info & fix some values
	var LEVEL_INFO = unpack(LEVEL_INFO_STRUCT, Streams[0]);
	if(LEVEL_INFO.LayerXSpeed === undefined) {
		console.error("File corrupt");
		return;
	}
	
	for(i=0; i < 8; i+=1) {
		LEVEL_INFO['LayerXSpeed'][i] /= 65536;
		LEVEL_INFO['LayerYSpeed'][i] /= 65536;
		LEVEL_INFO['LayerAutoXSpeed'][i] /= 65536;
		LEVEL_INFO['LayerAutoYSpeed'][i] /= 65536;
	}
	LEVEL_INFO.HelpString = [];
	for(i=0;i<16;i++) {
		LEVEL_INFO.HelpString[i] = trimNull(LEVEL_INFO['HelpStrings'].substr(i*512, 512));
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
	}
	var normalStreamLength = animOffset + LEVEL_INFO.AnimsUsed*137;
	LEVEL_INFO.normalStreamLength = normalStreamLength;
	
	// Events
	//var raw_events = unpack("V"+Streams[1].length/4+"Events", Streams[1]).Events;
	var raw_events = new Uint32Array(binary2array(Streams[1]).buffer);
	
	// Dictionary
	var DICT = [];
	//var dictList = unpack("v"+Streams[2].length/2+"Dict", Streams[2]).Dict;
	var dictList = new Uint16Array(binary2array(Streams[2]).buffer);
	var id = 0;
	var len = Streams[2].length/8;
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
	}
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
	
	var wordOffset = 0;
	var wordID = 0;
	var realWidth = 0;
	
	var wordList = new Uint16Array(binary2array(Streams[3]).buffer);
	var t;
	for(l=0; l < 8; l+=1) {
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
					if(x+t < w && DICT[wordID]) {
						LEVEL[l][x+t][y] = DICT[wordID][t];
					}
				}
				wordOffset+=1;
			}
		}
	}
	var timeEnd = new Date();
	
	
	LEVEL_INFO.ExtraData = Streams[0].substr(normalStreamLength);
	
	J2L.HEADER_INFO = HEADER_INFO;
	J2L.isTSF = isTSF;
	J2L.MAX_TILES = MAX_TILES;
	J2L.LEVEL_INFO = LEVEL_INFO;
	J2L.TilesetProperties = TilesetProperties;
	J2L.ANIMS = ANIMS;
	J2L.EVENTS = raw_events;
	J2L.LEVEL = LEVEL;
};

var J2L;
var headerStructJ2L = [
	['c180', 'Copyright'],
	['c4',   'Identifier'],
	['c3',   'PasswordHash'],
	['u8',   'HideLevel'],
	['C32',  'LevelName'],
	['u16',  'Version'],
	['u32',  'FileSize'],
	['s32',  'Checksum'],
	['u32',  'StreamSizes', 8]
];
var headerStructJ2T = [
	['c180', 'Copyright'],
	['c4',   'Identifier'],
	['u32',  'Signature'],
	['C32',  'TilesetName'],
	['u16',  'Version'],
	['u32',  'FileSize'],
	['s32',  'Checksum'],
	['u32',  'StreamSizes', 8]
];
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

iniparse.parse(path.join(__dirname, 'settings.ini'), function (err, settings) {
	var port = 8000;
	var filepaths = ["C:\\Games\\Jazz2\\"];
	var runcmd = "";
	var chromepath = "";
	var autoclose = true;
	var serverPassword = "";
	
	if(err) {
		console.warn('Warning: Couldn\'t read settings file, using defaults');
		defaultSettings.server = {
			'port': port,
			'autoclose': autoclose,
			'password': serverPassword
		};
		defaultSettings.folders = {
			'1': filepaths[0]
		};
		defaultSettings.paths = {
			'run': '',
			'chrome': ''
		};
		settings = defaultSettings;
		//createSettingsFile();
	}
	else {
		port = parseInt(settings.server.port, 10);
		filepaths = [];
		for(var i in settings.folders) {
			if(settings.folders.hasOwnProperty(i)) {
				filepaths.push(settings.folders[i]);
			}
		};
		runcmd = settings.paths.run;
		chromepath = settings.paths.chrome;
		autoclose = settings.server.autoclose.toLowerCase() === 'true';
		serverPassword = typeof settings.server.password === 'string'? settings.server.password.trim().substring(0, 32) : '';
	}
	
	for(var i=2; i < process.argv.length; i+=1) {
		if(process.argv[i].toLowerCase().indexOf('port=') === 0) {
			var newport = parseInt(process.argv[i].substring(5), 10);
			if(isFinite(newport))
				port = newport;
		}
		else if(process.argv[i].toLowerCase().indexOf('pswd=') === 0) {
			serverPassword = process.argv[i].substring(5).trim().substring(0, 32);
		}
	}
	
	var findFile = function (filename, callback, getFd) {
		var lastError = true;
		var searchIndex = 0;
		if(filepaths.length > 0) {
			var recursive = function () {
				if(searchIndex < filepaths.length) {
					fs.realpath(filepaths[searchIndex], function (pathErr, resolvedPath) {
						if(pathErr) {
							lastError = pathErr;
							searchIndex++;
							recursive();
							return;
						}
						fs.open(resolvedPath+"/"+filename, 'r', function (fileErr, fd) {
							if(fileErr) {
								lastError = fileErr;
								searchIndex++;
								recursive();
								return;
							}
							if(getFd) callback(fileErr, fd);
							else {
								fs.close(fd, function (err) {
									fs.readFile(resolvedPath+"/"+filename, 'binary', function (fileErr, fileData) {
										// Folder exists, check for file
										
										// Success!
										callback(fileErr, fileData);
									});
								});
							}
						});
					});
				}
			};
			recursive();
		}
		if(searchIndex === filepaths.length) {
			callback(lastError, "");
		}
	};
	
	var readDirs = function (callback, withPath) {
		var allFiles = [];
		var allFilesPaths = [];
		var searchIndex = 0;
		if(filepaths.length > 0) {
			var recursive = function () {
				if(searchIndex < filepaths.length) {
					fs.readdir(filepaths[searchIndex], function (pathErr, files) {
						if(pathErr) {
							console.log(pathErr.toString());
							searchIndex++;
							recursive();
							return;
						}
						
						for(var i=0; i < files.length; i+=1) {
							if(files[i].length > 0 && allFiles.indexOf(files[i]) === -1) {
								allFilesPaths.push(path.join(filepaths[searchIndex], files[i]));
								allFiles.push(files[i]);
							}
						}
						searchIndex++;
						recursive();
					});
				}
				else {
					if(withPath)
						callback(allFilesPaths);
					else
						callback(allFiles);
				}
			};
			recursive();
		}
	};
	
	var webserver = http.createServer(function (req, res) {
		var url = urlmod.parse(req.url === '/' ? '/index.html' : req.url, true);
		var notfound = function () {
			console.error('Not found: ' + url.href);
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.end('Not found\r\n');
		};
		var parseCallback = function (err, file) {
			if(err) {
				notfound();
			}
			else {
				var filestr = file;
				file = new Buffer(file, 'binary');
				var headerSize = 262;
				var identifier = file.slice(180, 184).toString('binary');
				if(identifier === 'LEVL') {
					var headerStruct = headerStructJ2L;
				}
				else if(identifier === 'TILE') {
					var headerStruct = headerStructJ2T;
				}
				else {
					notfound();
					return;
				}
				var st = Date.now();
				
				var header = unpackStruct(headerStruct, file.slice(0, headerSize));
				
				if(header.Checksum !== crc32(file.slice(headerSize))) {
					console.error('Error: J2L/J2T file corrupt; Checksum error');
					res.writeHead(200, {'Content-Type': 'text/plain'});
					res.end('error');
					return;
				}
				
				var loadCount = 0;
				var inflateCallback = function (i) {
					return function (err, buf) {
						streams[i] = buf;
						loadCount++;
						if(loadCount === 4) {
							streamsLoaded();
						}
					};
				};
				
				var offset = headerSize;
				var streams = [];
				var unSize = 0;
				for(var i=0; i < 4; i+=1) {
					zlib.inflate(file.slice(offset, offset+header.StreamSizes[i*2]), inflateCallback(i));
					offset += header.StreamSizes[i*2];
					unSize += header.StreamSizes[i*2+1];
				}
				var uncompressedFile = new Buffer(headerSize+unSize);
				file.copy(uncompressedFile, 0, 0);
				var streamsLoaded = function () {
					var offset = 262;
					for(var i=0; i < 4; i+=1) {
						streams[i].copy(uncompressedFile, offset, 0);
						offset += header.StreamSizes[i*2+1];
					}
					
					//console.log((uncompressedFile.length)/1000+" kb");
					res.writeHead(200, {
						'Content-Type': 'application/octet-stream',
						'Content-Length': uncompressedFile.length
					});
					res.end(uncompressedFile);
					
					//console.log('Time to parse J2L/J2T: '+(Date.now()-st)/1000+'s');
				};
			}
		};
		var compressFileCallback = function (err, file, callback) {
			if(err) {
				notfound();
			}
			else {
				var filestr = file;
				file = new Buffer(file, 'binary');
				var headerSize = 262;
				var identifier = file.slice(180, 184).toString('binary');
				if(identifier === 'LEVL') {
					var headerStruct = headerStructJ2L;
				}
				else if(identifier === 'TILE') {
					var headerStruct = headerStructJ2T;
				}
				else {
					notfound();
					return;
				}
				var st = Date.now();
				var header = unpackStruct(headerStruct, file.slice(0, headerSize));
				var loadCount = 0;
				var gzSize = 0;
				var deflateCallback = function (i) {
					return function (err, buf) {
						streams[i] = buf;
						gzSize += buf.length;
						loadCount++;
						if(loadCount === 4) {
							streamsLoaded();
						}
					};
				};
				
				var offset = headerSize;
				var streams = [];
				var unSize = 0;
				for(var i=0; i < 4; i+=1) {
					zlib.deflate(file.slice(offset, offset+header.StreamSizes[i*2+1]), deflateCallback(i));
					offset += header.StreamSizes[i*2+1];
				}
				var streamsLoaded = function () {
					var compressedFile = new Buffer(headerSize+gzSize);
					file.copy(compressedFile, 0, 0, headerSize);
					header.FileSize = compressedFile.length;
					new Buffer(new Uint8Array(new Uint32Array([header.FileSize]).buffer)).copy(compressedFile, 222);
					var offset = headerSize;
					for(var i=0; i < 4; i+=1) {
						streams[i].copy(compressedFile, offset, 0);
						header.StreamSizes[i*2] = streams[i].length;
						new Buffer(new Uint8Array(new Uint32Array([header.StreamSizes[i*2]]).buffer)).copy(compressedFile, 230+(i*2*4));
						offset += header.StreamSizes[i*2];
					}
					header.Checksum = crc32(compressedFile.slice(headerSize));
					new Buffer(new Uint8Array(new Int32Array([header.Checksum]).buffer)).copy(compressedFile, 226);
					console.log('Time to write J2L/J2T: '+(Date.now()-st)/1000+'s');
					callback(compressedFile);
				};
			}
		};
		
		if(url.pathname.indexOf('/node/') === 0) {
			switch(url.pathname.substring(6)) {
				case '':
					// Get a specific file
					if(url.query.file !== undefined) {
						findFile(url.query.file, function (err, data) {
							if(err) {
								notfound();
							}
							else {
								var buffer = new Buffer(data, 'binary');
								res.writeHead(200, {
									'Content-Type': mime.lookup(path.basename(url.query.file)),
									'Content-Length': buffer.length
								});
								res.end(buffer);
							}
						});
					}
					// Get file list
					else if(url.query.files !== undefined) {
						readDirs(function (files) {
							var buf = new Buffer(JSON.stringify(files));
							res.writeHead(200, {
								'Content-Type': 'text/json',
								'Content-Length': buf.length
							});
							res.end(buf);
							
						});
					}
					// Parse a J2L/J2T file
					else if(url.query.parse !== undefined) {
						var type = url.query.parse.toLowerCase().substring(url.query.parse.length-4) === '.j2l'?'LEVL':'TILE';
						findFile(url.query.parse, parseCallback);
					}
					else if(url.query.getheader !== undefined) {
						var hStruc = [
							['C32', 'Title'],
							['u16', 'Version']
						];
						var output = [];
						var allLoaded = function () {
							var buf = new Buffer(JSON.stringify(output));
							res.writeHead(200, {
								'Content-Type': 'text/json',
								'Content-Length': buf.length
							});
							res.end(buf);
						};
						
						var readCallback = function (i, filePath) {
							return function (err, fd) {
								fs.read(fd, new Buffer(34), 0, 34, 180+4+4, function (err, bytesRead, buffer) {
									if(!err) {
										fs.close(fd);
										var h = unpackStruct(hStruc, buffer);
										output[i] = [
											path.basename(filePath),
											h.Title,
											h.Version
										];
									}
									loadCount++;
									if(loadCount >= toLoad) {
										allLoaded();
									}
								});
							};
						};
						var loadCount = 0;
						var toLoad = 0;
						var i2 = 0;
						readDirs(function (paths) {
							for(var i=0; i < paths.length; i++) {
								if(path.extname(paths[i]).toLowerCase() === '.j2t') {
									fs.open(paths[i], 'r', readCallback(i2++, paths[i]));
									toLoad++;
								}
							}
						}, true);
					}
					else if(url.query.parsedata !== undefined) {
						var form = new formidable.IncomingForm();
						form.parse(req, function(err, fields, files) {
							var filepath = files.level.path;
							fs.readFile(filepath, 'binary', function (err, data) {
								fs.unlink(filepath); // Delete the temporary file
								parseCallback(err, data);
							});
						});
					}
					else if(url.query.savelevel !== undefined) {
						var form = new formidable.IncomingForm();
						form.parse(req, function(err, fields, files) {
							var filename = fields.filename;
							var filepath = files.filedata.path;
							var doRun = fields.doRun === 'true';
							var doSave = fields.doSave === 'true';
							fs.readFile(filepath, 'binary', function (err, data) {
								fs.unlink(filepath); // Delete the temporary file
								compressFileCallback(err, data, function (compressedFile) {
									if(doRun && settings.server.collaboration.toLowerCase() !== 'true') {
										var tmpfilename = ''; // Create a tmp filename
										for (var i = 0; i < 32; i++) {
											tmpfilename += Math.floor(Math.random() * 16).toString(16);
										}
										tmpfilename += path.extname(filename);
										var tmppath = path.join(TMP_DIR, tmpfilename);
										fs.writeFile(tmppath, compressedFile, function (err) {
											if(err) {
												console.error('Error:', err);
												return;
											}
											
											console.log("Temporary file:\n"+tmppath);
											console.log("Starting JJ2...");
											child_process.exec(runcmd.replace(/\%1/, tmppath), function (err, stdout, stderr) {
												fs.unlink(tmppath); // Delete the temporary file
												console.log("Closed JJ2, temporary file removed");
											});
										});
										res.end();
									}
									else {
										res.writeHead(200, {
											'Content-Type': 'application/octet-stream',
											'Content-Length': compressedFile.length
										});
										res.end(compressedFile);
									}
								});
							});
						});
					}
					else if(url.query.incclient !== undefined) {
						clientCount++;
						res.writeHead(200, {
							'Content-Type': 'text/plain',
						});
						res.end(clientCount.toString(10));
					}
					else if(url.query.decclient !== undefined) {
						clientCount--;
						res.writeHead(200, {
							'Content-Type': 'text/plain',
						});
						res.end(clientCount.toString(10));
						if(clientCount <= 0 && autoclose) {
							console.log('Closing server...');
							process.exit(0);
						}
					}
					else {
						notfound();
					}
					break;
				
				case 'collab.js':
					var isCollab = settings.server.collaboration.toLowerCase() === 'true';
					var serverInfo = {};
					if(isCollab) {
						serverInfo.isCollab = true;
						serverInfo.passworded = serverPassword.length > 0;
						
					}
					else {
						serverInfo.isCollab = false;
					}
					var data = "var serverInfo = "+JSON.stringify(serverInfo)+";";
					res.writeHead(200, {
						'Content-Type': 'application/javascript',
						'Content-Length': data.length
					});
					res.end(data);
					break;
				
				case 'collab':
					if(settings.server.collaboration.toLowerCase() === 'true') {
						if(url.query.level !== undefined) {
							var form = new formidable.IncomingForm();
							form.parse(req, function(err, fields, files) {
								var filename = fields.filename;
								var filepath = files.level.path;
								var uid = +fields.uid;
								fs.readFile(filepath, 'binary', function (err, file) {
									fs.unlink(filepath); // Delete the temporary file
									var socket;
									for(var i=0; i < clients.length; i++) {
										//console.log(clients[i].user.canEdit, uid);
										if(clients[i].user.unique === uid) {
											socket = clients[i];
											break;
										}
									}
									if(socket) {
										loadLevel(file);
										//getLevel(getLevelCallback(socket, function () {}, true));
										res.writeHead(200, {
											'Content-Type': 'text/plain',
										});
										res.end('OK');
										broadcast(new Buffer([0x06]), socket);
									}
								});
							});
						}
						else if(url.query.getlevel !== undefined) {
							if(serverPassword.length === 0 || (serverPassword.length > 0 && url.query.pswd && url.query.pswd.trim().substring(0, 32) === serverPassword)) {
								getLevel(function (datastr) {
									var data = new Buffer(datastr, 'binary');
									res.writeHead(200, {
										'Content-Type': 'application/octet-stream',
										'Content-Length': data.length
									});
									
									res.end(data);
								});
							}
							else {
								res.writeHead(403, {
									'Content-Type': 'text/plain'
								});
								res.end("Permission denied: Wrong password");
							}
						}
						else {
							notfound();
						}
					}
					else {
						notfound();
					}
					break;
				
				default: notfound(); break;
			}
		}
		else {
			var fullpath = path.join(__dirname, 'server'+url.pathname);
			fs.readFile(fullpath, function (err, data) {
				if(err) {
					notfound();
				}
				else {
					fs.stat(fullpath, function (err, stats) {
						var if_modified_since = req.headers['if-modified-since'];
						var normal = true;
						if(if_modified_since) {
							var req_date = new Date(if_modified_since);
							if (stats.mtime <= req_date && req_date <= Date.now()) {
								res.writeHead(304, {
									'Last-Modified': stats.mtime
								});
								res.end();
								normal = false;
							}
						}
						if(normal) {
							res.writeHead(200, {
								'Content-Type': mime.lookup(path.basename(url.pathname)),
								'Content-Length': data.length,
								'Last-Modified': stats.mtime
							});
							res.end(data);
						}
					});
				}
			});
		}
		
	}).listen(port, function () {
		console.log('Starting server on port '+port);
		if(serverPassword) {
			console.log('Server password is "'+serverPassword+'"');
		}
		else {
			console.log('Note: The server is not passworded');
		}
		//console.log('** Do not close this window without closing the client(s) first! **');
		//console.log('Also do not close the client too fast after opening it\nIn that case the server will miss it closing');
		if(chromepath.length > 0) {
			child_process.exec('"'+path.normalize(chromepath)+'" -app=http://localhost:'+port+'/', function (err) {
				if(err) {
					console.warn("Could not start chrome:\n",err);
					console.log('Chrome command: '+'"'+path.normalize(chromepath)+'" -app=http://localhost:'+port+'/');
					console.log("You might want to manually open the app at http://localhost:"+port+"/");
				}
			});
		}
	});
	
	if(settings.server.collaboration.toLowerCase() === 'true') {
		var fixJ2L = function () {
			J2L = {
				'LEVEL_INFO':
					{
						'JcsHorizontal': 0,
						'SecurityEnvelope1': 0,
						'JcsVertical': 0,
						'SecurityEnvelope2': 0,
						'SecEnvAndLayer': 3,
						'MinimumAmbient': 64,
						'StartingAmbient': 64,
						'AnimsUsed': 0,
						'SplitScreenDivider': 0,
						'IsItMultiplayer': 0,
						'StreamSize': 0,
						'LevelName': 'Untitled Collaboration',
						'Tileset': '',
						'BonusLevel': '',
						'NextLevel': '',
						'SecretLevel': '',
						'MusicFile': '',
						'HelpString': ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Made with WebJCS collaboration'],
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
						'LevelName': 'Untitled Collaboration',
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
		};
		fixJ2L();
		
		var checkIfLayerIsUsed = function (l) {
			if(l === 3) return 1;
			var i, j;
			var w = J2L.LEVEL_INFO.LayerWidth[l];
			var h = J2L.LEVEL_INFO.LayerHeight[l];
			for(i=0; i < w; i+=1) {
				for(j=0; j < h; j+=1) {
					if(J2L.LEVEL[l][i][j].id > 0 || J2L.LEVEL[l][i][j].animated) {
						return 1;
					}
				}
			}
			return 0;
		};
		
		var getLevel = function (callback) {
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
			
			var realWidth;
			var hasAnimAndEvent;
			var animEventComboCount = 0;
			var tilesetNeedsFlipped = {};
			var animNeedsFlip = {};
			var tile;
			
			for(l = 0; l < 8; l+=1) {
				J2L.LEVEL_INFO.IsLayerUsed[l] = checkIfLayerIsUsed(l);
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
						
						map[l].push({
							str: tmp.join(','), // Make it to a string
							newWord: hasAnimAndEvent
						});
					}
				}
			}
			
			var dict = {'0,0,0,0': 0};
			var tileCache = [];
			var lastDictId = 1;
			var dictionary = ['0,0,0,0'];
			for(i=0; i < 8; i+=1) {
				for(j=0; j < map[i].length; j+=1) {
					if(dict[map[i][j].str] === undefined || map[i][j].newWord) {
						dict[map[i][j].str] = lastDictId++;
					}
					tileCache.push(dict[map[i][j].str]);
					dictionary[dict[map[i][j].str]] = map[i][j].str.split(",");
				}
			}
			
			
			
			var words = new Uint16Array(dictionary.length*4);
			var wordOffset = 0;
			for(i=0; i < dictionary.length; i++) {
				tmp = dictionary[i];//.split(",");
				for(k = 0; k < 4; k+=1) {
					words[wordOffset+k] = +tmp[k];
				}
				wordOffset+=4;
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
			buf.setUint16(0, J2L.LEVEL_INFO.JcsHorizontal, true); // JcsHorizontal
			buf.setUint16(4, J2L.LEVEL_INFO.JcsVertical, true); // JcsVertical
			buf.setUint8(8, J2L.LEVEL_INFO.SecEnvAndLayer, true); // SecEnvAndLayer
			buf.setUint8(9, J2L.LEVEL_INFO.MinimumAmbient);
			buf.setUint8(10, J2L.LEVEL_INFO.StartingAmbient);
			buf.setUint16(11, J2L.ANIMS.length, true);
			buf.setUint8(13, J2L.LEVEL_INFO.SplitScreenDivider);
			buf.setUint8(14, J2L.LEVEL_INFO.IsItMultiplayer);
			buf.setUint32(15, streamLength, true);
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
				}
			}
			
			
			for(i=0; i < MAX_TILES; i+=1) {
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
			
			var datastr = "";
			var headerArray = new Uint8Array(arbuf);
			for(var i=0; i < headerArray.length; i+=1) {
				datastr += String.fromCharCode(headerArray[i]);
			}
			for(var i=0; i < allBuffers.length; i+=1) {
				datastr += String.fromCharCode(allBuffers[i]);
			}
			
			callback(datastr);
			
		};
		
		var usernameExists = function (username) {
			for(var i=0, l = clients.length; i < l; i+=1) {
				if(clients[i].user && clients[i].user.username === username) return true;
			}
			return false;
		};
		
		
		var wsServer = new WebSocketServer({
			httpServer: webserver,
			autoAcceptConnections: false
		});
		
		var clients = [];
		var uid = 0;
		
		var broadcast = function (buf, except) {
			clients.forEach(function (socket) {
				if(socket !== except && socket) {
					socket.sendBytes(buf);
				}
			});
		};
		
		var getLevelCallback = function (socket, callback, doBroadcast) {
			var st = Date.now();
			return function (data) {
				var index = clients.indexOf(socket);
				if(index > -1) {
					//clients[index].user.canEdit = true;
					//console.log('Sent level to user in', (Date.now()-st)/1000, 'secs');
					var toSend = packStruct([
						'u8',
						
						'u32',
						'C'+data.length
					], [
						0x06,
						
						data.length,
						data
					]);
					if(doBroadcast) {
						broadcast(toSend);
					}
					else {
						socket.sendBytes(toSend);
					}
				}
				callback();
			};
		};
		
		var getUserlist = function (socket) {
			var userlistData = [
				0x05,
				
				socket.user.unique,
				clients.length
			];
			var userlistStruct = [
				'u8',
				
				'u32',
				'u32'
			];
			clients.forEach(function (client) {
				userlistData.push(client.user.username.length, client.user.username);
				userlistStruct.push('u8', 'C'+client.user.username.length);
				
			});
			return packStruct(userlistStruct, userlistData);
		};
		
		var consoleChat = function (msg) {
			broadcast(packStruct([
				'u8',
				
				's32',
				'u8',
				'C'+msg.length
			], [
				0x02,
				
				-1,
				msg.length,
				msg
			]));
		};
		
		wsServer.on('request', function(request) {
			if(!request.resourceURL.query.username || request.requestedProtocols.indexOf('webjcs') === -1 || request.resourceURL.query.pswd === undefined || (serverPassword.length > 0 ? request.resourceURL.query.pswd.trim().substring(0, 32) !== serverPassword : false)) {
				var reason = "";
				if(!request.resourceURL.query.username) {
					reason = "No username entered";
				}
				else if(request.requestedProtocols.indexOf('webjcs') === -1) {
					reason = "Invalid WebSocket sub-protocol:\n\r"+request.requestedProtocols;
				}
				else if(serverPassword.length > 0) {
					var username = request.resourceURL.query.username.trim().substring(0, 32);
					reason = ("You entered wrong password:\n\r"+request.resourceURL.query.pswd.trim().substring(0, 32)).trim().substring(0, 255);
					console.log(new Date().toUTCString()+": "+username+" tried password \""+request.resourceURL.query.pswd.trim().substring(0, 32)+"\"");
				}
				
				if(reason) {
					var socket = request.accept(null, request.origin);
					socket.sendBytes(packStruct([
						'u8',
						'u8',
						'C'+reason.length
					], [
						0x00,
						reason.length,
						reason
					]));
					socket.close();
				}
				else {
					request.reject();
				}
				
				return;
			}
			
			var socket = request.accept(null, request.origin);
			
			clients.push(socket);
			
			var username = request.resourceURL.query.username.trim().substring(0, 32);
			if(usernameExists(username)) {
				var i=2;
				while(usernameExists(username+i)) {
					i+=1;
				}
				username += i;
			}
			
			console.log(new Date().toUTCString()+": "+username+' joined');
			
			socket.sendBytes(packStruct([
				'u8',
				's32'
			], [
				0x10,
				-1
			]));
			socket.pingStart = Date.now();
			
			socket.user = {
				username: username,
				unique: uid++
			};
			socket.sendBytes(getUserlist(socket));
			broadcast(packStruct([
				'u8',
				
				'u8',
				'C'+username.length
			], [
				0x04,
				
				username.length,
				username
			]), socket);
			
			//getLevel(getLevelCallback(socket, function () {}));
			
			socket.on('message', function (message) {
				var index = clients.indexOf(socket);
				if(message.type === 'binary') {
					var packet = message.binaryData;
					var packetID = packet[0];
					switch(packetID) {
						case 0x02: // Chat message
							var msgLen = packet[1];
							var msg = packet.slice(2, msgLen+2).toString('binary');
							
							console.log(new Date().toUTCString()+": "+socket.user.username+': '+msg);
							
							broadcast(packStruct([
								'u8',
								
								's32',
								'u8',
								'C'+msg.length
							], [
								0x02,
								
								index,
								msg.length,
								msg
							]));
							break;
						
						case 0x07: // Notify about level change
							var filenameLen = packet[1];
							var filename = packet.slice(2, filenameLen+2);
							console.log(new Date().toUTCString()+": "+socket.user.username+' changed level to '+filename);
							consoleChat('<em><strong>'+socket.user.username+'</strong> changed level to <strong>'+filename+'</strong></em>');
							break;
						
						case 0x08: // Update packet
							var subPacketId = packet[1];
							switch(subPacketId) {
								case 0x01: // Layer update
									var l = packet[2];
									var sx = getBinary('u16', packet.slice(3, 5));
									var sy = getBinary('u16', packet.slice(5, 7));
									var sw = getBinary('u16', packet.slice(7, 9));
									var sh = getBinary('u16', packet.slice(9, 11));
									var includeEmpty = packet[11] > 0;
									var dataLen = getBinary('u32', packet.slice(12, 16));
									
									var cursor = 16;
									var selection = "";
									while(selection.length < dataLen) selection += String.fromCharCode(packet[cursor++]);
									selection = JSON.parse(selection);
									
									var lw = J2L.LEVEL_INFO.LayerWidth[l];
									var lh = J2L.LEVEL_INFO.LayerHeight[l];
									for(var x = 0; x < sw; x+=1) {
										for(var y = 0; y < sh; y+=1) {
											if(x+sx < lw && y+sy < lh) {
												if(selection[x] && selection[x][y] && J2L.LEVEL[l][x+sx] && J2L.LEVEL[l][x+sx][y+sy] && (includeEmpty || selection[x][y].id > 0 || selection[x][y].animated || (selection.length===1 && selection[x].length === 1))) {
													J2L.LEVEL[l][x+sx][y+sy] = {'id': selection[x][y].id, 'animated': selection[x][y].animated, 'flipped': selection[x][y].flipped};
													if(l === 3) {
														J2L.EVENTS[x+sx + lw * (y+sy)] = selection[x][y].event || 0;
													}
												}
											}
										}
									}
									break;
								
								case 0x02: // Event
									var obj = unpackStruct([
										['u8', 'where'],
										['u16', 'x'],
										['u16', 'y'],
										['u32', 'event']
									], packet.slice(2, 11));
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
									
									J2L.LEVEL_INFO.Tileset = filename;
									console.log(new Date().toUTCString()+": "+socket.user.username+' changed tileset to '+filename);
									consoleChat('<em><strong>'+socket.user.username+'</strong> changed tileset to <strong>'+filename+'</strong></em>');
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
									], packet.slice(2));
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
											], packet.slice(3));
											var animated = (obj.flags >> 0) & 1 > 0;
											var flipped = (obj.flags >> 1) & 1 > 0;
											J2L.ANIMS[obj.anim].Tiles.splice(obj.pos, 0, {'id': obj.id, 'animated': animated, 'flipped': flipped});
											J2L.ANIMS[obj.anim].Frames = J2L.ANIMS[obj.anim].Tiles.length;
											break;
										
										case 0x03: // Move anim up/down
											var obj = unpackStruct([
												['u16', 'anim'],
												['s8', 'by']
											], packet.slice(3));
											var tmpHolder = J2L.ANIMS[obj.anim];
											J2L.ANIMS[obj.anim] = J2L.ANIMS[obj.anim+obj.by];
											J2L.ANIMS[obj.anim+obj.by] = tmpHolder;
											break;
										
										case 0x04: // Delete a frame
											var obj = unpackStruct([
												['u16', 'anim'],
												['u8', 'frame']
											], packet.slice(3));
											J2L.ANIMS[obj.anim].Tiles.splice(obj.frame, 1);
											J2L.ANIMS[obj.anim].Frames = J2L.ANIMS[obj.anim].Tiles.length;
											break;
										
										case 0x05: // Delete an animation
											var anim = getBinary('u16', packet.slice(3, 5));
											J2L.ANIMS.splice(anim, 1);
											break;
										
										case 0x06: // Clone an animation
											var anim = getBinary('u16', packet.slice(3, 5));
											J2L.ANIMS.push(JSON.parse(JSON.stringify(J2L.ANIMS[anim])));
											break;
										
										case 0x07: // Animation Properties
											var obj = unpackStruct([
												['u16', 'anim'],
												['u8', 'fps'],
												['u16', 'frameWait'],
												['u16', 'randomAdder'],
												['u16', 'pingPongWait'],
												['u8', 'isItPingPong']
											], packet.slice(3));
											J2L.ANIMS[obj.anim].FPS = obj.fps;
											J2L.ANIMS[obj.anim].FramesBetweenCycles = obj.frameWait;
											J2L.ANIMS[obj.anim].RandomAdder = obj.randomAdder;
											J2L.ANIMS[obj.anim].PingPongWait = obj.pingPongWait;
											J2L.ANIMS[obj.anim].IsItPingPong = obj.isItPingPong > 0;
											break;
									}
									break;
								
								case 0x06: // Tile type change
									J2L.TilesetProperties.TileType[getBinary('u16', packet.slice(3, 5))] = packet[2];
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
									], packet.slice(2));
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
										}
									}
									
									break;
								
								case 0x08: // Clear a layer
									var l = packet[2];
									var lw = J2L.LEVEL_INFO.LayerWidth[l];
									var lh = J2L.LEVEL_INFO.LayerHeight[l];
									if(l === 3) {
										J2L.EVENTS = new Uint32Array(lw*lh);
									}
									for(var x=0; x < lw; x+=1) {
										for(var y=0; y < lh; y+=1) {
											J2L.LEVEL[l][x][y] = {'id': 0, 'animated': false, 'flipped': false};
										}
									}
									consoleChat('<em><strong>'+socket.user.username+'</strong> cleared layer #<strong>'+(l+1)+'</strong></em>');
									break;
								
								case 0x09: // Create blank level
									fixJ2L();
									/*getLevel(getLevelCallback(socket, function () {
										socket.sendBytes(packet);
									}, true));*/
									consoleChat('<em><strong>'+socket.user.username+'</strong> created a new level</em>');
									broadcast(new Buffer([0x08, 0x09]));
									break;
							}
							broadcast(packet, socket);
							break;
						case 0x09: // Mouse position
							broadcast(packStruct([
								'u8',
								'u8',
								'u32',
								'u32',
								'u32'
							], [
								0x09,
								packet[1], // Layer
								index,
								getBinary('u32', packet.slice(2, 6)),
								getBinary('u32', packet.slice(6, 10))
							]), socket);
							break;
						case 0x10:
							var now = Date.now();
							var ping = now - socket.pingStart;
							socket.pingStart = now;
							setTimeout(function () {
								var index = clients.indexOf(socket);
								if(index  > -1) {
									socket.pingStart = Date.now();
									socket.sendBytes(packStruct([
										'u8',
										's32'
									], [
										0x10,
										ping
									]));
								}
							}, 2000);
							break;
					}
				}
			});
			socket.on('close', function (code, reason) {
				var index = clients.indexOf(socket);
				if(socket && index > -1) {
					console.log(new Date().toUTCString()+": "+socket.user.username+' left: '+reason);
					broadcast(packStruct([
						'u8',
						'u32',
						'u16',
						'u8',
						'C'+reason.length
					], [
						0x03,
						index,
						code,
						reason.length,
						reason
					]), socket);
					clients.splice(index, 1);
				}
			});
		});
	}
	
});




/*var cmd = process.platform === 'win32' ? 'start' : 'xdg-open';
var child = require('child_process').exec(cmd+' http://google.com/', function (error, stdout, stderr) {
	if(error)
		console.log('There was some error:', error);
});*/

