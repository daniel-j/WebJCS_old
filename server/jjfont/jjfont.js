"use strict";

var jjFont = (function (global, undefined) {
	var url = "jjfont/";
	var space=6;
	var font_width = [];
	font_width[0] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,7,15,10,12,0,4,9,9,10,13,6,10,4,11,10,6,11,10,11,10,9,8,9,8,6,7,9,11,9,10,14,11,11,10,12,12,9,11,9,10,11,12,10,12,12,11,10,11,12,9,11,11,9,12,10,9,11,8,11,8,13,10,6,10,9,9,9,11,9,10,10,6,9,10,6,11,10,9,10,10,10,10,9,10,9,12,9,8,9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,0,16,0,0,0,0,0,0,0,0,0,0,0,0,0,11,0,14,0,0,9,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10,12,11,13,11,11,11,15,10,12,12,13,12,11,10,13,10,13,13,12,12,13,12,11,0,11,11,11,13,11,9,9,11,11,11,13,12,11,10,15,9,12,11,13,11,10,10,13,10,9,11,11,11,13,11,9,0,9,10,11,13,10,9,9,10];
	font_width[1] = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,0,0,0,0,0,0,0,0,0,0,7,14,7,20,15,6,17,14,15,14,12,12,13,12,8,8,16,15,16,14,0,18,18,15,18,18,14,17,15,14,16,17,14,19,19,18,16,17,19,14,16,15,14,19,14,14,17,0,20,0,25,0,7,14,14,12,13,17,13,14,14,7,13,16,7,19,14,13,13,14,13,13,13,14,13,18,12,12,13,0,0,0,16,0,0,0,7,0,14,0,0,0,0,0,0,0,26,0,0,0,0,0,0,0,0,0,0,0,0,0,14,0,23,0,0,15,0,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18,18,20,18,18,28,25,15,18,18,20,18,14,14,20,17,21,19,18,18,19,18,19,16,18,15,15,20,16,15,18,18,16,14,20,18,18,14,24,12,18,17,20,18,12,12,20,16,13,16,14,15,20,16,16,18,13,14,14,20,15,13,0,15];
	font_width[0][31] = space;
	font_width[1][31] = space;
	var sizes   = [['Small',16],['Medium',31]]; /*,['Big',63]*/
	var colors	= new Array('white', 'green', 'red', 'blue', 'yellow', 'pink', 'white', 'gray', 'teal');

	var fontImages = [];
	for(var sizeindex = 0; sizeindex < sizes.length; sizeindex += 1) {
		fontImages[sizeindex] = [];
		for(var colorindex = 0; colorindex < colors.length; colorindex += 1) {
			fontImages[sizeindex][colorindex] = new Image();
			fontImages[sizeindex][colorindex].src = url + "JJ2Font"+sizes[sizeindex][0]+"_"+colors[colorindex]+".gif";
		}
	}

	return {
		draw: function (c, strText, X, Y, size, align, sinusText) {
			var colorsSel = [0, 1, 2, 3, 4, 5, 6, 7, 8];
			var indent = 0;
			var indentChar = false;
			var newWidth;
			var lastWidth = 0;
			var color = 0;
			var sinusX, sinusY;
			var supercolored = false;
			var rowOffset = 0;
	
			for(var j=0; j < strText.length; j+=1) {
				if(strText.charAt(j) === "§") {
					indentChar = true;
					continue;
				}
				if(strText.charAt(j) === "#") {
					if(!supercolored)
						color = 6;
					supercolored = true;
					continue;
				}
				if(strText.charAt(j) === "@") {
					lastWidth = 0;
					rowOffset+=sizes[size-1][1];
					continue;
				}
				if(indentChar) {
					indent = 47 - strText.charCodeAt(j);
					indentChar = false;
					continue;
				}
				if((strText.charAt(j) === "|" || fontImages[size-1][color].width > 0) && strText.charAt(j) !== ' ') {
					if(supercolored) {
						(color>=8)?color=1:color++;
					}
				}
				if(strText.charAt(j) === "|") {
					continue;
				}
				sinusX = sinusText > 0 ? (Math.cos(sinusText/10+j/2)*(0.01+size*2-1)) : 0;
				sinusY = sinusText > 0 ? (Math.sin(sinusText/10+j)*(0.5+size*2-1)) : 0;
		
				newWidth = font_width[size-1][strText.charCodeAt(j)-1];
				if(align === 'right')
					c.drawImage(fontImages[size-1][colorsSel[color]], 0, strText.charCodeAt(j)*sizes[size-1][1], fontImages[size-1][color].width, sizes[size-1][1], X-totalWidth+lastWidth+sinusX, Y+sinusY+rowOffset, fontImages[size-1][color].width, sizes[size-1][1]);
				else if(align === 'center')
					c.drawImage(fontImages[size-1][colorsSel[color]], 0, strText.charCodeAt(j)*sizes[size-1][1], fontImages[size-1][color].width, sizes[size-1][1], X-(totalWidth/2)+lastWidth+sinusX, Y+sinusY+rowOffset, fontImages[size-1][color].width, sizes[size-1][1]);
				else
					c.drawImage(fontImages[size-1][colorsSel[color]], 0, strText.charCodeAt(j)*sizes[size-1][1], fontImages[size-1][color].width, sizes[size-1][1], X+lastWidth+sinusX, Y+sinusY+rowOffset, fontImages[size-1][color].width, sizes[size-1][1]);
		
		
				lastWidth += newWidth+indent;
			}
		},
		width: function (strText, size) {
			var indentChar = false;
			size = (size<1||size>3)?1:parseInt(size, 10) || 1;
	
			var indent = 0;
			var newWidth = 0;
			var lastWidth = 0;
			var maxw = 0;
			for(var j=0; j < strText.length; j+=1) {
				if(strText.charAt(j) === "|") {
					continue;
				}
				else if(strText.charAt(j)=="§") {
					indentChar = true;
					continue;
				}
				if(indentChar === true) {
					indent = 48 - strText.charCodeAt(j);
					indentChar = false;
					continue;
				}
				if(strText.charAt(j) === "@") {
					maxw = Math.max(maxw, lastWidth);
					lastWidth = 0;
					continue;
				}
				newWidth = font_width[size-1][strText.charCodeAt(j)-1];
				lastWidth += newWidth;
				maxw = Math.max(maxw, lastWidth);
				lastWidth += indent;
		
			}
			maxw = Math.max(maxw, lastWidth - indent);
			return maxw;
			
		}
	};
})(this);
