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

	Seriously.plugin('background', function () {
		var me = this,

			//frame buffers
			modeFrameBuffers,
			textureses,
			fb = 0,

			//state
			learning = false,
			//frameCount = 0,
			opts = {
				blend: false,
				//clear: false,
				textureArray: new Uint8Array(4)
			},

			shaderConstants = [
				'const float fThresholdb = 4.0 * 4.0;', //todo: scale for 1/256?
				'const float fThresholdB = 0.9;', //todo: scale for 1/256?
				'const float fGenerate = 3.0 * 3.0;', //todo: scale for 1/256?
				'const float fSigma = 11.0;',
				'const float fAlpha = 0.001;',
				'const float fComplexity = 0.05;',
				'const float oneMinusAlpha = 1.0 - 0.001;'
				//todo: shadow threshold? 0.5
			].join('\n'),

			gaussianStruct = [
				'struct gaussian {',
				'	int count;',
				'	float sigma;',
				'	float weight;',
				'	vec3 color;',
				'};'
			].join('\n'),

			// todo: higher precision for blue/green
			// todo: change to hsl/yuv?
			/*
			shaderPackData = 'vec4 packData(vec4 color, float sigma, float weight, bool used) {',
				'return vec4(sigma, weight, ' +
					'(used ? -1.0 : 1.0) * color.r, ' +
					'color.g * 256.0 + color.b);' +
				'}\n\n',
			*/
			shaderPackData = [
				'vec4 packData(gaussian g) {',
				'	return vec4(',
				'		float(g.count) * 256.0 + g.color.r, ',
				'		g.color.g * 256.0 + g.color.b, ',
				'		g.sigma, ',
				'		g.weight',
				'	);',
				'}'
			].join('\n'),

			shaderUnPackData = [
				'gaussian unPackData(vec4 data) {',
				'	return gaussian(',
				'		int(floor(data.r / 256.0)), ', //count
				'		data.z,', //sigma
				'		data.w,', //weight
				'		vec3(mod(data.r, 256.0), floor(data.g / 256.0),  mod(data.g, 256.0))',
				'	);',
				'}'
			].join('\n');

		return {
			initialize: function () {
				var gl;

				me = this;
				gl = me.gl;

				//need two of these for ping-ponging
				modeFrameBuffers = [
					new Seriously.util.FrameBuffer(gl, me.width, me.height, {
						useFloat: true,
						numBuffers: 5
					}),
					new Seriously.util.FrameBuffer(gl, me.width, me.height, {
						useFloat: true,
						numBuffers: 5
					})
				];
modeFrameBuffers[0].textures[0].id = 'zero';
modeFrameBuffers[1].textures[0].id = 'one';

				me.uniforms.load = false;
				textureses = [
					modeFrameBuffers[0].textures.slice(1),
					modeFrameBuffers[1].textures.slice(1)
				];
				//uniforms.gaussianSamplers = textureses[1];
				//me.uniforms['gaussianSamplers[0]'] = modeFrameBuffers.textures.slice(1);
			},
			resize: function () {
				if (modeFrameBuffers) {
					modeFrameBuffers[0].resize(me.width, me.height);
					modeFrameBuffers[1].resize(me.width, me.height);
				}
			},
			shader: function (inputs, shaderSource) {
				shaderSource.fragment = [
					'#extension GL_EXT_draw_buffers : require',
					'precision mediump float;',

					shaderConstants +
					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'uniform sampler2D gaussianSamplers[4];',
					'uniform bool load;',
					//'uniform float mode;',
					'uniform vec2 vectors[4];',

					gaussianStruct,
					shaderPackData,
					shaderUnPackData,

					'gaussian gaussians[4];',
					//you can't just set an array in GLSL ES
					'void setGaussian(int index, gaussian g) {',
					'	if (index == 0) {',
					'		gaussians[0] = g;',
					'	} else if (index == 1) {',
					'		gaussians[1] = g;',
					'	} else if (index == 2) {',
					'		gaussians[2] = g;',
					'	} else if (index == 3) {',
					'		gaussians[3] = g;',
					'	}',
					'}',

					'void main(void) {',
					'	int count = 0;',
					'	if (load) {',
					'		gaussians[0] = unPackData(texture2D(gaussianSamplers[0], vTexCoord));',
					'		count = gaussians[0].count;',
					'	}',
					'	vec4 pixel = texture2D(source, vTexCoord);',

//'	gl_FragColor = pixel;',
//'	return;',
					//*
					'	gl_FragData[1].x = vectors[1].y;',
					'	gl_FragData[2].x = vectors[2].y;',
					'	gl_FragData[0] = vec4(1.0, vTexCoord.x, vTexCoord.y, 1.0);',
					//'	gl_FragData[0] = pixel;',
					//'	gl_FragData[0] = vec4(1.0, 0.0, 0.0, 1.0);',
					'	float x = 1.0;',
					'	for (int i = 0; i < 4; i++) {',
					//'		if (i >= count) break;',
					'		gl_FragData[i + 1] = vec4(x);',
					'		x = x + 1.0;',
					'	}',
					'	return;',
					//*

					'	bool fits = false;',
					'	bool background = false;',
					'	float totalWeight = 0.0;',
					'	for (int i = 0; i < 4; i++) {',
					'		if (i >= count) break;',

					'		gaussian g = gaussians[i];',
					'		float weight = g.weight;',
					'		weight = oneMinusAlpha * g.weight + fComplexity;',
					'		if (!fits) {',
					'			vec3 diff = g.color - pixel.rgb;',
					'			float dist = length(diff);',
					'			if (totalWeight < fThresholdB && dist < fThresholdb * g.sigma) {',
					'				background = true;',
					'			}',
					'			if (dist < fGenerate * g.sigma) {',
					'				fits = true;',

					'				float k = fAlpha / g.weight;',
					'				weight += fAlpha;',
					'				g.color = g.color - k * diff;',

					'				float sigmanew = g.sigma + k * (dist - g.sigma);',
					'				g.sigma = min(4.0, max(5.0 * fSigma, sigmanew));',

									//re-sort gaussians
					'				for (int j = 4; j > 0; j--) {',
					'					if (j > i) continue;',
					'					if (weight < gaussians[j].weight) {',
					'						break;',
					'					} else {',
					'						gaussian temp = gaussians[j];',
					'						gaussians[j] = gaussians[j - 1];',
					'						gaussians[j - 1] = temp;',
					'					}',
					'				}',
					'			} else if (weight < fComplexity) {',
					'				weight = 0.0;',
					'				count = count - 1;',
					'			}',
					'		} else if (weight < fComplexity) {', //fit not found yet
					'			weight = 0.0;',
					'			count = count - 1;',
					'		}',
					'		totalWeight += weight;',
					'		g.weight = weight;',
					'	}',

					//todo: renormalize weights

					'	for (int i = 0; i < 4; i++) {',
					'		if (i >= count) break;',
					'		gaussians[i].weight /= totalWeight;',
					'	}',

					//make new mode if needed
					'	if (!fits && count < 4) {',
					'		count++;',
					'		float weight = (count == 1 ? 1.0 : fAlpha);',
					'		gaussian newGaussian = gaussian(count, fSigma, weight, pixel.rgb);',

					//re-normalize weights
					'		for (int i = 0; i < 4; i++) {',
					'			if (i >= count - 1) break;',
					'			gaussians[i].weight *= oneMinusAlpha;',
					'			gaussians[i].count = count;',
					'		}',
					'		setGaussian(count - 1, newGaussian);',

					//sort
					'		for (int i = 3; i > 0; i--) {',
					'			if (i > count - 1) continue;',
					'			if (fAlpha < gaussians[i].weight) break;',
					'			gaussian temp = gaussians[i];',
					'			gaussians[i] = gaussians[i - 1];',
					'			gaussians[i - 1] = temp;',
					'		}',
					'	}',

					//pack everything
					'	gl_FragData[0] = pixel; //background ? vec4(0.0) : pixel;',
					'	for (int i = 0; i < 4; i++) {',
					'		if (i >= count) break;',
					'		gl_FragData[i + 1] = packData(gaussians[i]);',
					'	}',

					//'	if (count > 0) {',
					//'		gl_FragData[0] = packData(gaussians[0]);',
					//'	}',
					//'gl_FragData[0] = vec4(1.0, 0.0, 0.0, 1.0);',
					//'	gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, parent) {
				if (this.inputs.learning && !learning) {
					//todo: clear frame buffers
				}

				uniforms.gaussianSamplers = textureses[fb];
				fb = (fb + 1) % 2;

				parent(shader, model, uniforms, modeFrameBuffers[fb].frameBuffer, null, opts);
//parent(shader, model, uniforms, null);
				//uniforms.load = true;
				this.texture = modeFrameBuffers[fb].textures[0];
				//throw 'blah';
			},
			inPlace: false,
			destroy: function () {
				//todo: delete frame buffers
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			learning: {
				type: 'boolean',
				defaultValue: false
			}
		},
		compatible: function (gl) {
			//check for float texture extension
			var ext;

			ext = gl.getExtension('WEBGL_draw_buffers');
			if (!ext || gl.getParameter(ext.MAX_DRAW_BUFFERS_WEBGL) < 5) {
				return false;
			}

			ext = gl.getExtension('OES_texture_float');
			if (!ext) {
				return true;
			}

			return true;
		},
		description: 'Background Segmentation',
		title: 'Background'
	});
}));
