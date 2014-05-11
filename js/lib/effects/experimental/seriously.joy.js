(function (window, undefined) {
"use strict";

var Seriously = window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

function makeStripModel(gl, width) {
	var vertex, index, texCoord,
		vertexArray, indexArray,
		w2 = width * 2,
		dx, dy, x, y, i = 0, j = 0;

	if (!(gl && width > 1)) {
		return false;
	}
	
	dx = 1 / width;
	x = 0;
	vertexArray = new Float32Array(width * 2 * 2);
	indexArray = new Uint16Array(width * 2);

	for (i = 0; i < w2; i += 2) {
		vertexArray[i] = x;
		//vertexArray[i + 1] = 0; y - don't need this because it will already be 0
		vertexArray[i + width] = x;
		vertexArray[i + width + 1] = 1;
		x += dx;

		indexArray[i] = i;
		indexArray[i + 1] = i + width;
	}

	vertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
	gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
	vertex.size = 2;

	index = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

	return {
		vertex: vertex,
		index: index,
		length: j,
		mode: gl.TRIANGLE_STRIP,
		width: width
	};
}

Seriously.plugin('joy', (function () {
	var model;
	return {
		compatible: function(gl) {
			return gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;
		},
		/*
		initialize: function(parent) {
			//todo: is there a way to make this work if MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0?
			console.log('MAX_VERTEX_TEXTURE_IMAGE_UNITS = ' + this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
			
			model = makeStripModel(this.gl, this.width);
			parent();
		},
		*/
		shader: function(inputs, shaderSource, utilities) {
			
			shaderSource.vertex = '#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif \n' +
				'\n' +
				'attribute vec3 position;\n' +
				'\n' +
				'uniform mat4 transform;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'\n' +
				'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);\n' +
				'void main(void) {\n' +
				'   vec3 pixel = texture2D(source, position.xy).rgb;\n' +
				'	float luma = 1.0 - dot(pixel.rgb,lumcoeff);\n' +
				'	gl_Position = transform * vec4(position.x, position.y + luma / 20.0, position.z, 1.0);\n' +
				'	gl_PointSize = 5.0;\n' +
				'}\n';
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'uniform vec4 color;\n' +
				'\n' +
				'void main(void) {\n' +
				'	gl_FragColor = color;\n' +
				'}\n';
			
			return shaderSource;
		},
		draw: function (shader, basicModel, uniforms, frameBuffer, parent) {
			var width, height,
				inputs = this.inputs,
				bg = inputs.background,
				gl = this.gl,
				i;

			width = Math.min(this.width, inputs.source.width);
			height = this.height;

			if (!model || model.width !== width) {
				model = makeStripModel(this.gl, width, height);
			}

			gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.frameBuffer);
			gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
			
			if (!model) {
				return;
			}
			
			if (this.width > this.height) {
				uniforms.scale = [this.height / this.width, 1];
			} else {
				uniforms.scale = [this.width / this.height, 1];
			}

			this.gl.lineWidth(5);
			parent(shader, model, uniforms, frameBuffer);
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			color: {
				type: 'color',
				uniform: 'color',
				defaultValue: [1, 1, 1, 1]
			},
			background: {
				type: 'color',
				uniforms: 'background',
				defaultValue: [0, 0, 0, 1]
			},
			lines: {
				type: 'number',
				min: 1,
				step: 1
			},
			border: {
				type: 'number',
				defaultValue: 0.05,
				min: 0,
				max: 0.5
			}
		},
		description: '',
		title: 'Unknown Pleasures'
	};
}()) );

}(window));
