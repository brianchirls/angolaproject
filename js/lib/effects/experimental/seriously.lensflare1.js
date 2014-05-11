/* global define, require */
/*
Lens Flare Effect
http://john-chapman-graphics.blogspot.com/2013/02/pseudo-lens-flare.html
*/
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

	var horiz = [1, 0],
		vert = [0, 1];

	Seriously.plugin('lensflare', function () {
		var baseShader,
			downSampleShader,
			blurShader,
			upscaleBlendShader,

			downSampleFrame,
			lensFlareFrame,
			hBlurFrame,
			vBlurFrame,

			width,
			height,

			opts;

		return {
			initialize: function (parent) {
				var gl;

				parent();

				gl = this.gl;

				if (!gl) {
					return;
				}

				width = this.width / this.inputs.downSample;
				height = this.height / this.inputs.downSample;

				opts = {
					width: width,
					height: height
				};

				downSampleFrame = new Seriously.util.FrameBuffer(gl, width, height, true);
				lensFlareFrame = new Seriously.util.FrameBuffer(gl, width, height, true);
				hBlurFrame = new Seriously.util.FrameBuffer(gl, width, height, true);
				vBlurFrame = new Seriously.util.FrameBuffer(gl, width, height, true);
			},
			shader: function (inputs, shaderSource) {
				var gl = this.gl,
					basicVertexShader = [
						'precision mediump float;',

						'attribute vec4 position;',
						'attribute vec2 texCoord;',

						'uniform vec3 srsSize;',
						'uniform mat4 projection;',
						'uniform mat4 transform;',

						'varying vec2 vTexCoord;',

						'void main(void) {',
						'	gl_Position = position;',
						'	vTexCoord = vec2(texCoord.s, texCoord.t);',
						'}'
					].join('\n');

				if (!downSampleShader) {
					//baseShader = new Seriously.util.ShaderProgram(gl, shaderSource.vertex, shaderSource.fragment);

					downSampleShader = new Seriously.util.ShaderProgram(gl, basicVertexShader, [
						'precision mediump float;',

						'varying vec2 vTexCoord;',

						'uniform sampler2D source;',
						//'uniform vec4 scale;',
						//'uniform vec4 bias;',
						'uniform float scale;',
						'uniform float threshold;',

						'void main(void) {',
						'	vec4 pixel = texture2D(source, vTexCoord);',
						'	gl_FragColor = vec4(max(vec3(0.0), pixel.rgb - threshold / 255.0) * scale, pixel.a);',
						//'	gl_FragColor.a = 1.0;',
						'}'
					].join('\n'));

					blurShader = new Seriously.util.ShaderProgram(gl, basicVertexShader, [
						'precision mediump float;',

						'varying vec2 vTexCoord;',

						'uniform sampler2D lensFlare;',
						'uniform vec3 srsSize;',
						'uniform float blur;',
						'uniform vec2 offset;',

						'void main(void) {',
						'	vec2 blurSize = blur / srsSize.xy / 10.0;',
						'	vec4 sum = vec4(0.0);',
						'	sum += texture2D(lensFlare, vTexCoord - blurSize * offset * 4.0) * 0.05;',
						'	sum += texture2D(lensFlare, vTexCoord - blurSize * offset * 3.0) * 0.09;',
						'	sum += texture2D(lensFlare, vTexCoord - blurSize * offset * 2.0) * 0.12;',
						'	sum += texture2D(lensFlare, vTexCoord - blurSize * offset) * 0.15;',
						'	sum += texture2D(lensFlare, vTexCoord) * 0.16;',
						'	sum += texture2D(lensFlare, vTexCoord + blurSize * offset) * 0.15;',
						'	sum += texture2D(lensFlare, vTexCoord + blurSize * offset * 2.0) * 0.12;',
						'	sum += texture2D(lensFlare, vTexCoord + blurSize * offset * 3.0) * 0.09;',
						'	sum += texture2D(lensFlare, vTexCoord + blurSize * offset * 4.0) * 0.05;',

						'	gl_FragColor = min(sum, 1.0);',
						'	gl_FragColor.a = 1.0;',
						'}'
					].join('\n'));

					upscaleBlendShader = new Seriously.util.ShaderProgram(gl, shaderSource.vertex, [
						'precision mediump float;',

						'varying vec2 vTexCoord;',

						'uniform sampler2D source;',
						'uniform sampler2D lensFlare;',
						'uniform sampler2D lensDirt;',
						'uniform sampler2D lensStar;',
						'uniform mat3 lensStarMatrix;',
						'uniform float dirtBias;',
						'uniform bool useDirt;',
						'uniform bool useStar;',

						'void main(void) {',
						'	vec4 flarePixel = texture2D(lensFlare, vTexCoord);',

						'	vec4 lensMod;',
						'	vec3 lensStarTexCoord;',
						'	if (useDirt) {',
						'		lensMod = texture2D(lensDirt, vTexCoord);',
						'		flarePixel *= min(vec4(1.0), lensMod + dirtBias);',
						'	} else {',
						'		lensMod = vec4(0.0);',
						'	}',
						/*
						'	if (useStar) {',
						'		lensStarTexCoord = (lensStarMatrix * vec3(vTexcoord, 1.0)).xy;',
						'		lensMod += texture2D(lensStar, lensStarTexCoord);',
						'	}',
						*/
						'	gl_FragColor = min(texture2D(source, vTexCoord) + flarePixel, 1.0);',
						'}'
					].join('\n'));
				}

				shaderSource.vertex = basicVertexShader;
				shaderSource.fragment = [
					'precision mediump float;',

					'#define NUM_GHOSTS ' + (Math.floor(inputs.samples) || 8) + '.0',

					'const vec2 center = vec2(0.5);',

					'varying vec2 vTexCoord;',

					'uniform sampler2D downSampleSource;',
					'uniform float dispersal;',
					'uniform float haloWidth;',
					'uniform float falloff;',
					'uniform vec3 srsSize;',

					'void main(void) {',
					'	float weight;',
					'	float v2length = length(center);', //this should just be a constant sqrt(0.5), no?
					//'	vec2 texcoord = -vTexCoord + vec2(1.0);',
					'	vec2 texcoord = vTexCoord;',
					//'	vec2 texelSize = 1.0 / srsSize.xy',

					//ghost vector to image center
					'	vec2 ghostVec = (center - texcoord) * dispersal * 4.0 / NUM_GHOSTS;',//' / srsSize.xy;',
					'	vec4 result = vec4(0.0);',

					//sample ghosts
					'	for (float i = 0.0; i < NUM_GHOSTS; i += 1.0) {',
					'		vec2 offset = fract(texcoord + ghostVec * i);',

					'		weight = length(center - offset) / v2length;',
					'		weight = pow(1.0 - weight, falloff);',

					//todo: color distortion
					'		result += texture2D(downSampleSource, offset) * weight;',

					'	}',

					'	if (haloWidth > 0.0) {',
					'		vec2 haloVec = normalize(center - texcoord) * haloWidth;',
					'		weight = length(vec2(0.5) - fract(texcoord + haloVec)) / v2length;',
					'		weight = pow(1.0 - weight, 10.0);',
					'		result += texture2D(downSampleSource, fract(texcoord + haloVec)) * weight;',
					'	}',

					'	result.a = 1.0;',
					'	gl_FragColor = min(result, 1.0);',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				var w = this.width / this.inputs.downSample,
					h = this.height / this.inputs.downSample;

				if (w !== width || h !== height) {
					width = w;
					height = h;

					opts.width = w;
					opts.height = height;

					hBlurFrame.resize(w, h);
					vBlurFrame.resize(w, h);
					downSampleFrame.resize(w, h);
					lensFlareFrame.resize(w, h);
				}

				//down sample and threshold
				//draw(downSampleShader, model, uniforms, frameBuffer, null);
				//return;

				draw(downSampleShader, model, uniforms, downSampleFrame.frameBuffer, null, opts);
				uniforms.downSampleSource = downSampleFrame.texture;

				//lens flare features
				//draw(shader, model, uniforms, frameBuffer, null, opts);
				//return;

				draw(shader, model, uniforms, lensFlareFrame.frameBuffer, null, opts);

				uniforms.lensFlare = lensFlareFrame.texture;
				if (this.inputs.blur) {
					//blur: horizontal
					uniforms.offset = horiz;
					draw(blurShader, model, uniforms, hBlurFrame.frameBuffer, null, opts);

					//blur: vertical
					uniforms.lensFlare = hBlurFrame.texture;
					uniforms.offset = vert;

					//draw(blurShader, model, uniforms, frameBuffer, null);
					//return

					draw(blurShader, model, uniforms, vBlurFrame.frameBuffer, null, opts);
					uniforms.lensFlare = vBlurFrame.texture;
				}

				//upscale and blend with original image
				//todo: set up star
				uniforms.useDirt = !!this.inputs.lensDirt;
				draw(upscaleBlendShader, model, uniforms, frameBuffer, null);
			},
			destroy: function () {
				if (downSampleFrame) {
					downSampleFrame.destroy();
					lensFlareFrame.destroy();
					hBlurFrame.destroy();
					vBlurFrame.destroy();

					downSampleFrame = null;
					lensFlareFrame = null;
					hBlurFrame = null;
					vBlurFrame = null;
				}

				if (baseShader) {
					baseShader.destroy();
					baseShader = null;
				}

				if (downSampleShader) {
					downSampleShader.destroy();
					downSampleShader = null;
				}

				if (blurShader) {
					blurShader.destroy();
					blurShader = null;
				}

				if (upscaleBlendShader) {
					upscaleBlendShader.destroy();
					upscaleBlendShader = null;
				}
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
			lensDirt: {
				type: 'image',
				uniform: 'lensDirt',
				shaderDirty: false
			},
			lensStar: {
				type: 'image',
				uniform: 'lensStar',
				shaderDirty: false
			},
			downSample: {
				type: 'number',
				defaultValue: 4,
				min: 1,
				max: 16,
				step: 1
			},
			samples: {
				type: 'number',
				defaultValue: 8,
				min: 1,
				max: 24,
				step: 1,
				shaderDirty: true
			},
			dispersal: {
				type: 'number',
				uniform: 'dispersal',
				defaultValue: 0.05,
				min: 0,
				max: 2
			},
			haloWidth: {
				type: 'number',
				uniform: 'haloWidth',
				defaultValue: 0.5,
				min: 0,
				max: 1
			},
			flareScale: {
				type: 'number',
				uniform: 'scale',
				defaultValue: 1,
				min: 0,
				max: 20
			},
			threshold: {
				type: 'number',
				uniform: 'threshold',
				defaultValue: 128,
				min: 0,
				max: 255
			},
			blur: {
				type: 'number',
				uniform: 'blur',
				defaultValue: 1,
				min: 0,
				max: 100
			},
			dirtBias: {
				type: 'number',
				uniform: 'dirtBias',
				defaultValue: 0.8,
				min: 0,
				max: 1
			},
			falloff: {
				type: 'number',
				uniform: 'falloff',
				defaultValue: 0,
				min: 0,
				max: 20
			}
			//todo distortion 0-16, default = 1 (pixels?)
		},
		title: 'Lens Flare'
	});
}));
