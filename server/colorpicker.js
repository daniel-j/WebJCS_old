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

var Colorpicker = (function (global, undefined) {
	var container = global.document.createElement('div');
	var colorpickerdiv = global.document.createElement('div');
	var canvas = global.document.createElement('canvas');
	var c = canvas.getContext('2d');
	var buttonRow = global.document.createElement('div');
	var okButton = global.document.createElement('button');
	var cancelButton = global.document.createElement('button');
	var colorcodeField = global.document.createElement('input');
	var pixelCanvas = global.document.createElement('canvas');
	var pixelC = pixelCanvas.getContext('2d');
	var isClosed = true;
	var isFullyClosed = true;
	var isHolding = false;
	var isMovingWhat = "";
	var oldcolor = [0, 0, 0, 1];
	var oldcolorStr = 'black';
	var currentcolor = [0, 0, 0, 1];
	var currentcolorHSV = [0, 0, 0, 1];
	var currentcolorStr = 'black';
	var globOnchange, globCallback, globOncancel;
	var updateSize = function () {
		colorpickerdiv.style.left = Math.max(0, Math.round(global.innerWidth/2-colorpickerdiv.offsetWidth/2)) + 'px';
	};
	global.addEventListener("keydown", function (e) {
		var kc = e.keyCode;
		if(kc === 27) {
			closeWindow(false);
		}
	}, false);
	var closeWindow = function (ok) {
		if(isClosed) return;
		isClosed = true;
		if(ok) {
			globCallback(currentcolor);
		}
		else {
			globOncancel(oldcolor);
		}
		setTimeout(function () {
			isFullyClosed = true;
			container.style.visibility = 'hidden';
			colorpickerdiv.style.visibility = 'hidden';
		}, 500);
		container.style.opacity = '0';
		colorpickerdiv.style.top = -colorpickerdiv.offsetHeight+'px';
	};
	var code2color = function (colorcode) {
		pixelC.clearRect(0, 0, 1, 1);
		pixelC.fillStyle = colorcode;
		pixelC.fillRect(0, 0, 1, 1);
		var color = Array.prototype.slice.call(pixelC.getImageData(0, 0, 1, 1).data);
		color[3] /= 255;
		return color;
	};
	var zeroFill = function (str) {
		if(str.length > 1) {
			return str;
		}
		return "0"+str;
	};
	var rgb2str = function (color) {
		return 'rgb('+Math.round(color[0])+', '+Math.round(color[1])+', '+Math.round(color[2])+')';
	};
	var rgb2hexStr = function (color) {
		return "#" + (zeroFill(Math.round(color[0]).toString(16)) + zeroFill(Math.round(color[1]).toString(16)) + zeroFill(Math.round(color[2]).toString(16))).toUpperCase();
	};
	var rgb2hsv = function (color) {
		var r = color[0] / 255;
		var g = color[1] / 255;
		var b = color[2] / 255;
		var maxc = Math.max(r, g, b);
		var minc = Math.min(r, g, b);
		var d = maxc - minc;
		var h = 0;
		var s = maxc === 0 ? 0 : d / maxc;
		var v = maxc;
		
		if(maxc !== minc) {
			switch(maxc){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		
		return [h, s, v, color[3]];
	};
	var hsv2rgb = function (color) {
		var h = color[0];
		var s = color[1];
		var v = color[2];
		var r, g, b;

		var i = Math.floor(h * 6);
		var f = h * 6 - i;
		var p = v * (1 - s);
		var q = v * (1 - f * s);
		var t = v * (1 - (1 - f) * s);

		switch(i % 6){
			case 0: r = v, g = t, b = p; break;
			case 1: r = q, g = v, b = p; break;
			case 2: r = p, g = v, b = t; break;
			case 3: r = p, g = q, b = v; break;
			case 4: r = t, g = p, b = v; break;
			case 5: r = v, g = p, b = q; break;
		}

		return [r * 255, g * 255, b * 255, color[3]];
	};
	
	var redraw = function () {
		c.clearRect(0, 0, canvas.width, canvas.height);
		var w = canvas.width;
		var h = canvas.height;
		var grad;
		c.save();
			c.translate(7, 7);
			c.strokeStyle = 'black';
			c.strokeRect(-0.5, -0.5, picksize+1, picksize+1);
			c.fillStyle = 'hsl('+Math.round(currentcolorHSV[0]*360)+', 100%, 50%)';
			c.fillRect(0, 0, picksize, picksize);
			
			grad = c.createLinearGradient(0, 0, picksize, 0);
			grad.addColorStop(0, 'white');
			grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
			c.fillStyle = grad;
			c.fillRect(0, 0, picksize, picksize);
			grad = c.createLinearGradient(0, picksize, 0, 0);
			grad.addColorStop(0, 'black');
			grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
			c.fillStyle = grad;
			c.fillRect(0, 0, picksize, picksize);
			
			c.save();
				c.beginPath();
				c.rect(0, 0, picksize, picksize);
				c.closePath();
				c.clip();
				c.strokeStyle = 'white';
				c.beginPath();
					c.arc(Math.round(currentcolorHSV[1]*picksize), picksize-Math.round(currentcolorHSV[2]*picksize), 4, Math.PI*2, 0, false);
				c.closePath();
				c.stroke();
				c.strokeStyle = 'black';
				c.beginPath();
					c.arc(Math.round(currentcolorHSV[1]*picksize), picksize-Math.round(currentcolorHSV[2]*picksize), 5, Math.PI*2, 0, false);
				c.closePath();
				c.stroke();
			c.restore();
		c.restore();
		c.save();
			c.translate(7+picksize+5, 7);
			c.strokeRect(-0.5, -0.5, 32+1, picksize+1);
			c.fillStyle = hueGradient;
			c.fillRect(0, 0, 32, picksize);
			c.save();
				c.translate(32+1, picksize-Math.round(currentcolorHSV[0]*picksize));
				c.fillStyle = 'hsl('+Math.round(currentcolorHSV[0]*360)+', 100%, 50%)';
				c.beginPath();
					c.moveTo(0, 0);
					c.lineTo(10.5, -5);
					c.lineTo(10.5, 5);
				c.closePath();
				c.stroke();
				c.fill();
			c.restore();
		c.restore();
		c.save();
			c.translate(7+picksize+5+32+15, 7);
			c.fillStyle = oldcolorStr;
			c.fillRect(16, 16, 32, 32);
			c.strokeRect(15.5, 15.5, 33, 33);
			c.fillStyle = currentcolorStr;
			c.fillRect(0, 0, 32, 32);
			c.strokeRect(-0.5, -0.5, 33, 33);
		c.restore();
		globOnchange(currentcolor);
	};
	var picksize = 360;
	canvas.width = 580;
	canvas.height = picksize+2+7*2;
	pixelCanvas.width = 1;
	pixelCanvas.height = 1;
	var hueGradient = c.createLinearGradient(1, picksize, 1, 1);
	(function () {
		for(var i = 0; i <= 360; i+=60) {
			hueGradient.addColorStop((1/360)*i, 'hsl('+i+', 100%, 50%)');
		}
	})();
	var canvasdown = function (e) {
		isHolding = true;
		var bounding = canvas.getBoundingClientRect();
		var X = e.clientX - bounding.left;
		var Y = e.clientY - bounding.top;
		if(X >= 7 && X < 7+picksize && Y >= 7 && Y < 7+picksize) {
			isMovingWhat = 'picker';
			canvasmove(e);
		}
		else if(X >= 7+picksize+5 && X < 7+picksize+5+32 && Y >= 7 && Y < 7+picksize) {
			isMovingWhat = 'hueslider';
			canvasmove(e);
		}
		colorcodeField.blur();
		e.preventDefault();
	};
	var canvasmove = function (e) {
		if(!isHolding) return;
		var bounding = canvas.getBoundingClientRect();
		var X = e.clientX - bounding.left;
		var Y = e.clientY - bounding.top;
		switch(isMovingWhat) {
			case 'picker':
				currentcolorHSV = [currentcolorHSV[0], Math.max(0, Math.min(1, (X-7)/picksize)), Math.max(0, Math.min(1, 1-(Y-7)/picksize)), currentcolor[3]];
				currentcolor = hsv2rgb(currentcolorHSV);
				currentcolorStr = rgb2str(currentcolor);
				requestAnimFrame(redraw, canvas);
				colorcodeField.value = rgb2hexStr(currentcolor);
				break;
			case 'hueslider':
				currentcolorHSV = [Math.max(0, Math.min(1-1/360, (1-(Y-7)/picksize))), currentcolorHSV[1], currentcolorHSV[2], currentcolor[3]];
				currentcolor = hsv2rgb(currentcolorHSV);
				currentcolorStr = rgb2str(currentcolor);
				requestAnimFrame(redraw, canvas);
				colorcodeField.value = rgb2hexStr(currentcolor);
				break;
		}
	};
	var canvasup = function (e) {
		isHolding = false;
		isMovingWhat = '';
	};
	var changeColorCodeField = function (e) {
		colorcodeField.value = rgb2hexStr(currentcolor);
	};
	canvas.addEventListener('mousedown', canvasdown, false);
	global.addEventListener('mousemove', canvasmove, false);
	global.addEventListener('mouseup', canvasup, false);
	global.addEventListener('blur', canvasup, false);
	container.id = 'colorpickeroverlay';
	colorpickerdiv.id = "colorpicker";
	colorcodeField.id = 'colorcodeField';
	colorcodeField.addEventListener('keyup', function (e) {
		currentcolor = code2color(this.value);
		currentcolorHSV = rgb2hsv(currentcolor);
		currentcolorStr = rgb2str(currentcolor);
		requestAnimFrame(redraw, canvas);
	}, false);
	colorcodeField.addEventListener('blur', changeColorCodeField, false);
	colorcodeField.addEventListener('change', changeColorCodeField, false);
	buttonRow.id = 'buttonRow';
	okButton.textContent = 'OK';
	okButton.addEventListener('click', function () {closeWindow(true);}, false);
	cancelButton.textContent = 'Cancel';
	cancelButton.addEventListener('click', function () {closeWindow(false);}, false);
	
	buttonRow.appendChild(okButton);
	buttonRow.appendChild(cancelButton);
	colorpickerdiv.appendChild(canvas);
	colorpickerdiv.appendChild(colorcodeField);
	colorpickerdiv.appendChild(buttonRow);
	global.document.body.appendChild(container);
	global.document.body.appendChild(colorpickerdiv);
	global.addEventListener('resize', updateSize, false);
	
	colorpickerdiv.style.top = -colorpickerdiv.offsetHeight+'px';
	
	var updatePicker = function (picker, color) {
		picker.preview.style.backgroundColor = rgb2str(color);
		picker.input.textContent = rgb2hexStr(color);
	};
	
	global.addEventListener('load', function () {
		var pickColorsDom = global.document.querySelectorAll('.pickColor');
		var pickers = [];
		var defaultColor;
		var clickPreview = function (picker) {
			return function (e) {
				new Colorpicker(picker.preview.style.backgroundColor,
					function (color) { // onupdate
						if(typeof picker.dom.onupdate === 'function') picker.dom.onupdate(color, rgb2str(color));
					},
					function (color) { // onchange
						updatePicker(picker, color);
						if(typeof picker.dom.onchange === 'function') picker.dom.onchange(color, rgb2str(color));
					},
					function (oldcolor) { // oncancel
						if(typeof picker.dom.oncancel === 'function') picker.dom.oncancel(oldcolor, rgb2str(oldcolor));
					}
				);
			};
		};
		var resetColor = function (picker) {
			return function (e) {
				updatePicker(picker, picker.resetColor);
				picker.dom.onchange(picker.resetColor, rgb2str(picker.resetColor));
			};
		};
		for(var i=0; i < pickColorsDom.length; i+=1) {
			defaultColor = code2color(pickColorsDom[i].textContent);
			pickColorsDom[i].innerHTML = "";
			pickers[i] = {};
			pickers[i].dom = pickColorsDom[i];
			pickers[i].defaultColor = defaultColor;
			if(pickColorsDom[i].getAttribute('resetColor') !== null)
				pickers[i].resetColor = code2color(pickColorsDom[i].getAttribute('resetColor'));
			else
				pickers[i].resetColor = "";
			pickers[i].preview = global.document.createElement('input');
			pickers[i].preview.type = 'button';
			pickers[i].preview.className = 'pickColorPreview';
			pickers[i].preview.style.backgroundColor = rgb2str(defaultColor);
			pickers[i].preview.addEventListener('click', clickPreview(pickers[i]), false);
			pickers[i].input = global.document.createElement('div');
			pickers[i].input.className = 'pickColorInput';
			pickers[i].input.textContent = rgb2hexStr(defaultColor);
			if(pickers[i].resetColor !== "") {
				pickers[i].reset = global.document.createElement('input');
				pickers[i].reset.type = 'button';
				pickers[i].reset.value = 'Reset';
				pickers[i].reset.addEventListener('click', resetColor(pickers[i]), false);
			}
			
			pickColorsDom[i].appendChild(pickers[i].preview);
			pickColorsDom[i].appendChild(pickers[i].input);
			if(pickers[i].resetColor !== "")
				pickColorsDom[i].appendChild(pickers[i].reset);
			pickColorsDom[i].update = (function (picker) {
				return function (color) {
					updatePicker(picker, color);
				};
			})(pickers[i]);
			pickColorsDom[i].getColor = (function (picker) {
				return function () {
					return code2color(picker.input.textContent);
				};
			})(pickers[i]);
		}
	}, false);
	
	var construct = function (colorcode, onchange, callback, oncancel) {
		if(!isFullyClosed) return;
		isFullyClosed = false;
		isClosed = false;
		oldcolor = code2color(colorcode);
		oldcolorStr = rgb2str(oldcolor);
		currentcolor = oldcolor.slice();
		currentcolorHSV = rgb2hsv(currentcolor);
		currentcolorStr = rgb2str(currentcolor);
		container.style.opacity = '1';
		container.style.visibility = 'visible';
		colorpickerdiv.style.visibility = 'visible';
		colorpickerdiv.style.top = '0px';
		updateSize();
		colorcodeField.focus();
		requestAnimFrame(redraw, canvas);
		colorcodeField.value = rgb2hexStr(currentcolor);
		globOnchange = onchange;
		globCallback = callback;
		globOncancel = oncancel;
	};
	construct.hide = function () {
		closeWindow();
	};
	construct.isOpen = function () {
		return !isFullyClosed;
	};
	construct.rgb2hexStr = rgb2hexStr;
	return construct;
	
})(this);


/*setTimeout(function () {
	new Colorpicker('lightblue', function (color) {
		
		}, function (color) {
		
	});
}, 500);*/
