/* global define, require */
/*
Blur

Adapted from v002 by Anton Marini and Tom Butterworth
* Copyright vade - Anton Marini
* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

http://v002.info/plugins/v002-blurs/
*/
(function (root, factory) {
	'use strict';

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['seriously'], factory);
	} else if (typeof exports === 'object') {
		// Node/CommonJS
		factory(require('seriously'));
	} else {
		if (!root.Seriously) {
			root.Seriously = { plugin: function (name, opt) { this[name] = opt; } };
		}
		factory(root.Seriously);
	}
}(this, function (Seriously, undefined) {
	'use strict';

	var horizontal = [1, 0],
		vertical = [0, 1];

	Seriously.plugin('bilateral', function (options) {
		var fbHorizontal,
			fbVertical,
			baseShader;

		return {
			initialize: function () {
				var gl;

				gl = this.gl;

				if (!gl) {
					return;
				}

				baseShader = this.baseShader;

				fbHorizontal = new Seriously.util.FrameBuffer(gl, this.width, this.height, true);
				fbVertical = new Seriously.util.FrameBuffer(gl, this.width, this.height, true);

				this.frameBuffer = fbVertical;
			},
			commonShader: true,
			shader: function (inputs, shaderSource) {
				var gl = this.gl,
					/*
					Some devices or browsers (e.g. IE11 preview) don't support enough
					varying vectors, so we need to fallback to a less efficient method
					*/
					maxVaryings = gl.getParameter(gl.MAX_VARYING_VECTORS),
					//defineVaryings = (maxVaryings >= 10 ? '#define USE_VARYINGS' : ''),
					pixelsPerSide = 7,

					defines = [
						'#define PIXELS_PER_SIDE ' + pixelsPerSide,
						'#define NUM_TAPS (PIXELS_PER_SIDE * 2 + 1)',
						'#define PI ' + Math.PI
					].join('\n');

				shaderSource.vertex = [
					defines,
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform mat4 transform;',

					'uniform vec2 direction;',
					'uniform float sigma;',
					'uniform float amount;',

					'const vec2 zero = vec2(0.0, 0.0);',
					'const vec2 one = vec2(1.0, 1.0);',

					'varying vec2 coords[NUM_TAPS];',
					'varying float weights[NUM_TAPS];',

					'void main(void) {',
					// first convert to screen space
					//todo: can remove all this, since we're not doing any transforms. do same in blur
					'	vec4 screenPosition = vec4(position.xy * resolution / 2.0, position.z, position.w);',
					'	screenPosition = transform * screenPosition;',

					// convert back to OpenGL coords
					'	gl_Position = screenPosition;',
					'	gl_Position.xy = screenPosition.xy * 2.0 / resolution;',
					'	gl_Position.z = screenPosition.z * 2.0 / (resolution.x / resolution.y);',

					// Incremental Gaussian Coefficent Calculation (See GPU Gems 3 pp. 877 - 889)
					// http://http.developer.nvidia.com/GPUGems3/gpugems3_ch40.html
					'	vec3 incrementalGaussian;',
					'	incrementalGaussian.x = 1.0 / (sqrt(2.0 * PI) * sigma);',
					'	incrementalGaussian.y = exp(-0.5 / (sigma * sigma));',
					'	incrementalGaussian.z = incrementalGaussian.y * incrementalGaussian.y;',

					'	vec2 step = amount / resolution;',

					'	coords[0] = texCoord;', //max(zero, min(one, texCoord));',
					'	weights[0] = incrementalGaussian.x;',

					'	for (int i = 1; i < NUM_TAPS; i += 2) {',
					'		incrementalGaussian.xy *= incrementalGaussian.yz;',
					'		coords[i] = texCoord - float(i) * step * direction;',
					'		coords[i + 1] = texCoord + float(i) * step * direction;',
					'		weights[i] = weights[i + 1] = incrementalGaussian.x;',
					'	}',
					'}'
				].join('\n');
				shaderSource.fragment = [
					defines,
					'precision mediump float;\n',

					'uniform sampler2D source;',
					'uniform float sigma;',
					'uniform float exponent;',

					'varying vec2 coords[NUM_TAPS];',
					'varying float weights[NUM_TAPS];',

					'void main(void) {',
					'	vec4 color = vec4(0.0);',

					'	vec4 center = texture2D(source, coords[0]);',
					'	color = center * weights[0];',
					'	float normalization = weights[0];',

					'	for (int i = 1; i < NUM_TAPS; i++) {',
					//todo, don't get sample if weights[i] < 1/255 or something
					'		vec4 sample = texture2D(source, coords[i]);',
					'		float weight = weights[i] * distance(sample, center) / length(vec3(1,1,1));',
					//'		float weight = weights[i] / pow((1.0 + distance(sample, center)), exponent);',
					'		color += sample * weight;',
					'		normalization += weight;',
					'	}',

					'	gl_FragColor = color / normalization;',
					//'	gl_FragColor = texture2D(source, coords[0]);',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				if (!this.inputs.sigma) {
					uniforms.source = this.inputs.source.texture;
					parent(baseShader, model, uniforms, frameBuffer);
					return;
				}

				//horizontal pass
				uniforms.direction = horizontal;
				uniforms.source = this.inputs.source.texture;
				parent(shader, model, uniforms, fbHorizontal.frameBuffer);

				//vertical pass
				uniforms.direction = vertical;
				uniforms.source = fbHorizontal.texture;
				parent(shader, model, uniforms, frameBuffer);
				return;
			},
			resize: function () {
				if (fbHorizontal) {
					fbHorizontal.resize(this.width, this.height);
					fbVertical.resize(this.width, this.height);
				}
			},
			destroy: function () {
				if (fbHorizontal) {
					fbHorizontal.destroy();
					fbVertical.destroy();
					fbHorizontal = null;
					fbVertical = null;
				}
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				shaderDirty: false
			},
			sigma: {
				type: 'number',
				uniform: 'sigma',
				defaultValue: 2.7,
				min: 0,
				max: 10
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0.2,
				min: 0,
				max: 10
			},
			exponent: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0.2,
				min: 0,
				max: 10
			}
		},
		title: 'Bilateral Filter'
	});
}));
