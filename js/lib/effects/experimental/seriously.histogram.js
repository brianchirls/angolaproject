/* global define, require */
(function (root, factory) {
	'use strict';

	if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	//todo: use floating point textures if available

	function buildModel(gl, width, height) {
		var vertex, index,
			vertexArray,
			dx, dy, x, y, i = 0, j = 0;

		if (!gl || !width || !height) {
			return false;
		}

		vertexArray = new Float32Array(width * height * 2);
		//indexArray = new Uint16Array(width * height);

		dx = 2 / (width - 1);
		dy = 2 / (height - 1);
		
		/*
		for (y = 1 - dy / 2; y > -1; y -= dy) {
			for (x = -1 + dx / 2; x < 1; x += dx) {
				vertexArray[i++] = x;
				vertexArray[i++] = y;
				vertexArray[i++] = 0;

				indexArray[j++] = j;
			}
		}
		*/
		for (j = 0; j < height; j++) {
			y = 2 * j / height - 1 + dy;
			for (x = 0; x < width; x++) {
				vertexArray[i++] = 2 * x / width - 1 + dx;
				vertexArray[i++] = y;
			}
		}

		vertex = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
		gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
		vertex.size = 2;

		/*
		index = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);
		*/

		return {
			vertex: vertex,
			//index: index,
			length: j,
			mode: gl.POINTS,
			width: width,
			height: height
		};
	}
	Seriously.plugin('histogram', function () {
		var /*histogramFrameBuffer,
			histoShader,*/
			me = this,
			gl,
			gridModel,
			opts;

		this.height = 1;
		this.width = 256;

		function updateModel() {
			var source = me.inputs.source;
			if (!gl || !source || !source.width || !source.height) {
				return;
			}

			if (gridModel && gridModel.width === source.width && gridModel.height === source.height) {
				return;
			}

			gridModel = buildModel(gl, source.width, source.height);
		}

		this.resize = function () {
			var i;
			this.emit('resize');
			for (i = 0; i < this.targets.length; i++) {
				this.targets[i].resize();
			}
		};

		return {
			compatible: function (gl) {
				/*
				todo: for now we require 4096x4096 texture but we may be able to
				build a workaround or just limit the number of bins
				*/
				return gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) > 0;/* &&
					gl.getParameter(gl.MAX_TEXTURE_SIZE) >= 4096*/
			},
			commonShader: true,
			initialize: function (initialize) {
				gl = this.gl;
				//todo: histogramFrameBuffer
				opts = {
					width: 256,
					height: 1,
					blendEquation: gl.FUNC_ADD,
					srcRGB: gl.ONE,
					srcAlpha: gl.ONE,
					blend: true
				};
console.log(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE));
				updateModel();

				initialize();
			},
			resize: updateModel,
			shader: function (inputs, shaderSource) {
				shaderSource.vertex = [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif',

					'uniform sampler2D source;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'const vec3 lumaCoeffs = vec3(0.2125,0.7154,0.0721);',

					'void main(void) {',
					'	vec3 rgb = texture2D(source, position.xy).rgb;',
					'	float luma = dot(rgb, lumaCoeffs);',
					'	gl_Position = vec4(luma * 2.0 - 1.0, 0.0, 0.0, 1.0);',
					'	gl_PointSize = 1.0;',
					'}\n'
				].join('\n');

				shaderSource.fragment = [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif',
					'void main(void) {',
					'	gl_FragColor = vec4(vec3(1.0 / 255.0), 1.0);',
					'}'
				].join('\n');
				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer/*, draw*/) {
				var source = this.inputs.source,
					shaderUniform;
				//draw(shader, gridModel, uniforms, frameBuffer, opts);
				//custom draw function for points

				//setup and clear view port
				gl.viewport(0, 0, this.width, this.height);
				gl.clearColor(0, 0, 0, 1);
				gl.clear(gl.COLOR_BUFFER_BIT);

				if (!source) {
					return;
				}

				//select frame buffer and shader
				gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
				shader.use();

				//set uniform(s)
				shaderUniform = shader.uniforms.source;
				if (source instanceof window.WebGLTexture) {
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, source);
					shaderUniform.set(0);
				} else if (source.texture && source.texture instanceof window.WebGLTexture) {
					gl.activeTexture(gl.TEXTURE0);
					gl.bindTexture(gl.TEXTURE_2D, source.texture);
					shaderUniform.set(0);
				} else {
					return;
				}

				//configure draw mode
				gl.blendEquation(gl.FUNC_ADD);
				gl.blendFunc(gl.ONE, gl.ONE);
				gl.enable(gl.BLEND);
				gl.disable(gl.DEPTH_TEST);

				//load up model
				gl.bindBuffer(gl.ARRAY_BUFFER, gridModel.vertex);
				gl.enableVertexAttribArray(shader.location.position);
				gl.vertexAttribPointer(shader.location.position, gridModel.vertex.size, gl.FLOAT, false, 0, 0);

				//draw
				gl.drawArrays(gl.POINTS, 0, gridModel.width * gridModel.height);
			},
			inputs: {
				source: {
					type: 'image',
					uniform: 'source',
					update: updateModel
				},
				mode: {
					type: 'enum',
					shaderDirty: true,
					options: [
						'rgba',
						'luma'
					]
				}
				//todo: number of bins or bits per channel
			},
			destroy: function () {
			}
		};
	}, {
		title: 'Histogram',
		description: ''
	});
}));
