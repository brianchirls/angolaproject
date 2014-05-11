(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

function makeGridModel(gl, width, height) {
	var vertex, index, texCoord,
		vertexArray, indexArray,
		dx, dy, x, y, i = 0, j = 0;

	if (!gl || !(width >= 1) || !(height >= 1)) {
		return false;
	}
	
	vertexArray = new Float32Array(width * height * 3);
	indexArray = new Uint16Array(width * height);

	dx = 2 / (width - 1);
	dy = 2 / (height - 1);
	
	for (y = 1 - dy / 2; y > -1; y -= dy) {
		for (x = -1 + dx / 2; x < 1; x += dx) {
			vertexArray[i++] = x;
			vertexArray[i++] = y;
			vertexArray[i++] = 0;

			indexArray[j++] = j;
		}
	}

	vertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
	gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
	vertex.size = 3;

	index = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

	return {
		vertex: vertex,
		index: index,
		length: j,
		mode: gl.LINES,
		width: width,
		height: height
	};
}

Seriously.plugin('vectorscope', (function () {
	var model;
	return {
		compatible: function(gl) {
			return gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;
		},
		initialize: function(parent) {
			//todo: is there a way to make this work if MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0?
			console.log('MAX_VERTEX_TEXTURE_IMAGE_UNITS = ' + this.gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
			
			model = makeGridModel(this.gl, this.width, this.height);
			parent();
		},
		shader: function(inputs, shaderSource, utilities) {
			
			shaderSource.vertex = '#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif \n' +
				'\n' +
				'attribute vec4 position;\n' +
				'\n' +
				'uniform vec3 srsSize;\n' +
				'uniform mat4 projection;\n' +
				'uniform mat4 transform;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'uniform vec2 scale;\n' +
				'\n' +
				'const mat3 RGB2YCbCr = mat3(' +
					'0.299,  0.587,  0.114,' +
					'-0.16874, -0.33126,  0.500,' +
					'0.500, -0.41869, -0.08131' +
				');\n' +
				'const vec3 YCbCrOffset = vec3(0.0, 0.5, 0.5);\n' +
				'void main(void) {\n' +
				'   vec3 pixel = texture2D(source, position.xy).rgb;\n' +
				'   vec3 ycbcr = YCbCrOffset + pixel * RGB2YCbCr;\n' +
				'	vec2 colorPos = vec2(ycbcr.y * 2.0 - 1.0, ycbcr.z * scale.y * 2.0 - 1.0) * scale;\n' +
				'	gl_Position = transform * vec4(colorPos.x, colorPos.y, -1.0, 1.0);\n' +
				'	gl_Position = gl_Position * vec4(srsSize.x / srsSize.y, 1.0, 1.0, 1.0);\n' +
				'	gl_Position = transform * gl_Position;\n' +
				'	gl_Position.z -= srsSize.z;\n' +
				'	gl_Position = projection * gl_Position;\n' +
				'	gl_Position.z = 0.0;\n' + //prevent near clipping
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
				srcWidth = this.inputs.srcWidth,
				srcHeight = this.inputs.srcHeight;

			if (srcWidth > 0) {
				width = srcWidth;
			} else {
				width = this.width;
			}

			if (srcHeight > 0) {
				height = srcHeight;
			} else {
				height = this.height;
			}

			if (!model || model.width !== width || model.height !== height) {
				model = makeGridModel(this.gl, width, height);
			}
			
			if (!model) {
				return;
			}
			
			uniforms.color = this.inputs.color.slice(0);
			uniforms.color[3] *= this.inputs.weight;
			
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
				defaultValue: [1, 1, 1, 1]
			},
			weight: {
				type: 'number',
				defaultValue: 0.5,
				min: 0,
				max: 1
			},
			srcWidth: {
				type: 'number',
				defaultValue: 0,
				min: 0
			},
			srcHeight: {
				type: 'number',
				defaultValue: 0,
				min: 0
			}
		},
		description: '',
		title: 'Vectorscope'
	};
}()) );

}(window));
