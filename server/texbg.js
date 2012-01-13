var texturedBackground = (function (global) {
	'use strict';
	
	
	var ext = {};
	
	var canvas, gl, buffer,
	vertex_shader, fragment_shader, currentProgram,
	vertexPositionLocation, texture, textureLocation,
	parameters = { /*start_time: new Date().getTime(), time: 0,*/ screenWidth: 0, screenHeight: 0 },
	texCanvas, texc;
	
	vertex_shader = global.document.getElementById( 'texbgvs' ).textContent;
	fragment_shader = global.document.getElementById( 'texbgfs' ).textContent;
	
	var txgrad = global.document.getElementById('texturedGradient');
	
	
	canvas = document.getElementById('texturedCanvas');
	ext.canvas = canvas;
	
	canvas.width = 640;
	canvas.height = 480;
	
	// Initialise WebGL
	
	try {
	
		gl = canvas.getContext( 'webgl' );
		if(!gl)
			gl = canvas.getContext( 'experimental-webgl' );
	
	} catch( error ) { }
	
	if ( !gl ) {
		console.log("WebGL not supported");
		return false;
	}
	
	// Create Vertex buffer (2 triangles)
	buffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
	gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ - 1.0, - 1.0, 1.0, - 1.0, - 1.0, 1.0, 1.0, - 1.0, 1.0, 1.0, - 1.0, 1.0 ] ), gl.STATIC_DRAW );
	
	// Create Program
	currentProgram = createProgram( vertex_shader, fragment_shader );
	
	parameters.screenWidth = canvas.width;
	parameters.screenHeight = canvas.height;
	
	gl.viewport( 0, 0, canvas.width, canvas.height );
	
	texCanvas = global.document.createElement('canvas');
	texCanvas.width = 256;
	texCanvas.height = 256;
	texc = texCanvas.getContext('2d');
	ext.texture = texCanvas;
	ext.texc = texc;
	
	texture = gl.createTexture();
	
	function updateTexture() {
		gl.enable( gl.TEXTURE_2D );
		gl.bindTexture( gl.TEXTURE_2D, texture );
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texCanvas );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT );
		gl.generateMipmap( gl.TEXTURE_2D );
		gl.bindTexture( gl.TEXTURE_2D, null );
	};

	function createProgram( vertex, fragment ) {

		var program = gl.createProgram();

		var vs = createShader( vertex, gl.VERTEX_SHADER );
		var fs = createShader( '#ifdef GL_ES\nprecision highp float;\n#endif\n\n' + fragment, gl.FRAGMENT_SHADER );

		if ( vs == null || fs == null ) return null;

		gl.attachShader( program, vs );
		gl.attachShader( program, fs );

		gl.deleteShader( vs );
		gl.deleteShader( fs );

		gl.linkProgram( program );

		if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {

			alert( "ERROR:\n" +
			"VALIDATE_STATUS: " + gl.getProgramParameter( program, gl.VALIDATE_STATUS ) + "\n" +
			"ERROR: " + gl.getError() + "\n\n" +
			"- Vertex Shader -\n" + vertex + "\n\n" +
			"- Fragment Shader -\n" + fragment );

			return null;
			
		}
		
		return program;
		
	}
	
	function createShader( src, type ) {
		
		var shader = gl.createShader( type );
		
		gl.shaderSource( shader, src );
		gl.compileShader( shader );
		
		if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
			
			alert( ( type == gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT" ) + " SHADER:\n" + gl.getShaderInfoLog( shader ) );
			return null;
			
		}
		
		return shader;
		
	}
	
	function render() {
		
		if ( !currentProgram ) return;
		
		//parameters.time = new Date().getTime() - parameters.start_time;
		gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
		
		// Load program into GPU
		gl.useProgram( currentProgram );
		
		// Get var locations
		vertexPositionLocation = gl.getAttribLocation( currentProgram, 'position' );
		textureLocation = gl.getUniformLocation( currentProgram, 'texture' );
		
		// Set values to program variables
		//gl.uniform1f( gl.getUniformLocation( currentProgram, 'time' ), parameters.time / 1000 );
		gl.uniform2f( gl.getUniformLocation( currentProgram, 'resolution' ), parameters.screenWidth, parameters.screenHeight );
		
		gl.uniform1i( textureLocation, 0 );
		gl.activeTexture( gl.TEXTURE0);
		updateTexture();
		gl.bindTexture( gl.TEXTURE_2D, texture );
		
		// Render geometry
		gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
		gl.vertexAttribPointer( vertexPositionLocation, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( vertexPositionLocation );
		gl.drawArrays( gl.TRIANGLES, 0, 6 );
		gl.disableVertexAttribArray( vertexPositionLocation );
	}
	
	ext.render = render;
	ext.gradient = txgrad;
	ext.changeColor = function (arr) {
		var r = arr[0], g = arr[1], b = arr[2];
		txgrad.style.background = "-webkit-gradient(linear, left top, left bottom, color-stop(0%, transparent), color-stop(45%, rgb("+r+","+g+","+b+")), color-stop(55%, rgb("+r+","+g+","+b+")), color-stop(100%, transparent))";
		//txgrad.style.background = "-webkit-gradient(linear, left top, left bottom, color-stop(0%, transparent), color-stop(45%, #000), color-stop(55%, #000), color-stop(100%, transparent))";
	};
	
	return ext;
}(window));
