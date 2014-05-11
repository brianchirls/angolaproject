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

	var modes = {
		'normal': 'BlendNormal',
		'lighten': 'BlendLighten',
		'darken': 'BlendDarken',
		'multiply': 'BlendMultiply',
		'average': 'BlendAverage',
		'add': 'BlendAdd',
		'subtract': 'BlendSubtract',
		'difference': 'BlendDifference',
		'negation': 'BlendNegation',
		'exclusion': 'BlendExclusion',
		'screen': 'BlendScreen',
		'overlay': 'BlendOverlay',
		'softlight': 'BlendSoftLight',
		'hardlight': 'BlendHardLight',
		'colordodge': 'BlendColorDodge',
		'colorburn': 'BlendColorBurn',
		'lineardodge': 'BlendLinearDodge',
		'linearburn': 'BlendLinearBurn',
		'linearlight': 'BlendLinearLight',
		'vividlight': 'BlendVividLight',
		'pinlight': 'BlendPinLight',
		'hardmix': 'BlendHardMix',
		'reflect': 'BlendReflect',
		'glow': 'BlendGlow',
		'phoenix': 'BlendPhoenix'
	};

	Seriously.plugin('accumulator', function () {
		var accumulateBuffer,
			mainBuffer,
			gl,
			me = this,
			width,
			height,
			opts = {
				clear: false
			};

		return {
			initialize: function (parent) {
				gl = me.gl;

				width = this.width;
				height = this.height;
				//accumulateBuffer = new Seriously.util.FrameBuffer(gl, width, height, true);
				mainBuffer = this.frameBuffer;

				parent();
			},
			shader: function (inputs, shaderSource) {
				var mode = inputs.mode || 'normal';
				mode = mode.toLowerCase();
				mode = modes[mode] || 'BlendNormal';

				shaderSource.fragment = [
					'#define BlendFunction ' + mode,
					'precision mediump float;',

					'#define BlendLinearDodgef				BlendAddf',
					'#define BlendLinearBurnf				BlendSubtractf',
					'#define BlendAddf(base, blend)			min(base + blend, 1.0)',
					'#define BlendSubtractf(base, blend)	max(base + blend - 1.0, 0.0)',
					'#define BlendLightenf(base, blend)		max(blend, base)',
					'#define BlendDarkenf(base, blend)		min(blend, base)',
					'#define BlendLinearLightf(base, blend)	(blend < 0.5 ? BlendLinearBurnf(base, (2.0 * blend)) : BlendLinearDodgef(base, (2.0 * (blend - 0.5))))',
					'#define BlendScreenf(base, blend)		(1.0 - ((1.0 - base) * (1.0 - blend)))',
					'#define BlendOverlayf(base, blend)		(base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)))',
					'#define BlendSoftLightf(base, blend)	((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)))',
					'#define BlendColorDodgef(base, blend)	((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0))',
					'#define BlendColorBurnf(base, blend)	((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0))',
					'#define BlendVividLightf(base, blend)	((blend < 0.5) ? BlendColorBurnf(base, (2.0 * blend)) : BlendColorDodgef(base, (2.0 * (blend - 0.5))))',
					'#define BlendPinLightf(base, blend)	((blend < 0.5) ? BlendDarkenf(base, (2.0 * blend)) : BlendLightenf(base, (2.0 *(blend - 0.5))))',
					'#define BlendHardMixf(base, blend)		((BlendVividLightf(base, blend) < 0.5) ? 0.0 : 1.0)',
					'#define BlendReflectf(base, blend)		((blend == 1.0) ? blend : min(base * base / (1.0 - blend), 1.0))',
					/*
					** Vector3 blending modes
					*/

					// Component wise blending
					'#define Blend(base, blend, funcf)		vec3(funcf(base.r, blend.r), funcf(base.g, blend.g), funcf(base.b, blend.b))',
					'#define BlendNormal(base, blend)		(blend)',
					'#define BlendLighten					BlendLightenf',
					'#define BlendDarken					BlendDarkenf',
					'#define BlendMultiply(base, blend)		(base * blend)',
					'#define BlendAverage(base, blend)		((base + blend) / 2.0)',
					'#define BlendAdd(base, blend)			min(base + blend, vec3(1.0))',
					'#define BlendSubtract(base, blend)	max(base + blend - vec3(1.0), vec3(0.0))',
					'#define BlendDifference(base, blend)	abs(base - blend)',
					'#define BlendNegation(base, blend)		(vec3(1.0) - abs(vec3(1.0) - base - blend))',
					'#define BlendExclusion(base, blend)	(base + blend - 2.0 * base * blend)',
					'#define BlendScreen(base, blend)		Blend(base, blend, BlendScreenf)',
					'#define BlendOverlay(base, blend)		Blend(base, blend, BlendOverlayf)',
					'#define BlendSoftLight(base, blend)	Blend(base, blend, BlendSoftLightf)',
					'#define BlendHardLight(base, blend)	BlendOverlay(blend, base)',
					'#define BlendColorDodge(base, blend)	Blend(base, blend, BlendColorDodgef)',
					'#define BlendColorBurn(base, blend)	Blend(base, blend, BlendColorBurnf)',
					'#define BlendLinearDodge				BlendAdd',
					'#define BlendLinearBurn				BlendSubtract',
					// Linear Light is another contrast-increasing mode
					// If the blend color is darker than midgray, Linear Light darkens the image by decreasing the brightness. If the blend color is lighter than midgray, the result is a brighter image due to increased brightness.
					'#define BlendLinearLight(base, blend)	Blend(base, blend, BlendLinearLightf)',
					'#define BlendVividLight(base, blend)	Blend(base, blend, BlendVividLightf)',
					'#define BlendPinLight(base, blend)		Blend(base, blend, BlendPinLightf)',
					'#define BlendHardMix(base, blend)		Blend(base, blend, BlendHardMixf)',
					'#define BlendReflect(base, blend)		Blend(base, blend, BlendReflectf)',
					'#define BlendGlow(base, blend)			BlendReflect(blend, base)',
					'#define BlendPhoenix(base, blend)		(min(base, blend) - max(base, blend) + vec3(1.0))',
					//'#define BlendOpacity(base, blend, F, O)	(F(base, blend) * O + blend * (1.0 - O))',
					'#define BlendOpacity(base, blend, F, O, A)	((F(base.rgb * blend.a * O, blend.rgb * blend.a * O) + base.rgb * base.a * (1.0 - blend.a * O)) / A)',

					'varying vec2 vTexCoord;',

					'uniform sampler2D top;',
					'uniform sampler2D bottom;',
					'uniform float opacity;',
					'void main(void) {',
					'	vec3 color;',
					'	vec4 topPixel = texture2D(top, vTexCoord);',
					'	vec4 bottomPixel = texture2D(bottom, vTexCoord);',
					'	float alpha = topPixel.a + bottomPixel.a * (1.0 - topPixel.a);',
					'	if (alpha == 0.0) {',
					'		color = vec3(0.0);',
					'	} else {',
					'		color = BlendOpacity(bottomPixel, topPixel, BlendFunction, opacity, alpha);',
					'	}',
					'	gl_FragColor = vec4(color, alpha);',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				/*
				if (width !== me.width || height !== me.height) {
					width = me.width;
					height = me.height;
					accumulateBuffer.resize(width, height);
				}
				*/

				uniforms.bottom = this.frameBuffer.texture;
				if (this.inputs.clear) {
					gl.viewport(0, 0, width, height);
					gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
					gl.clearColor(0.0, 0.0, 0.0, 0.0);
					gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				}

				if (this.inputs.update) {
					draw(shader, model, uniforms, frameBuffer, null, opts);
				}
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				uniform: 'top',
				shaderDirty: false
			},
			clear: {
				type: 'boolean',
				defaultValue: false
			},
			update: {
				type: 'boolean',
				defaultValue: true
			},
			opacity: {
				type: 'number',
				uniform: 'opacity',
				defaultValue: 1,
				min: 0,
				max: 1
			},
			mode: {
				type: 'enum',
				shaderDirty: true,
				defaultValue: 'normal',
				options: [
					['normal', 'Normal'],
					['lighten', 'Lighten'],
					['darken', 'Darken'],
					['multiply', 'Multiply'],
					['average', 'Average'],
					['add', 'Add'],
					['substract', 'Substract'],
					['difference', 'Difference'],
					['negation', 'Negation'],
					['exclusion', 'Exclusion'],
					['screen', 'Screen'],
					['overlay', 'Overlay'],
					['softlight', 'Soft Light'],
					['hardlight', 'Hard Light'],
					['colordodge', 'Color Dodge'],
					['colorburn', 'Color Burn'],
					['lineardodge', 'Linear Dodge'],
					['linearburn', 'Linear Burn'],
					['linearlight', 'Linear Light'],
					['vividlight', 'Vivid Light'],
					['pinlight', 'Pin Light'],
					['hardmix', 'Hard Mix'],
					['reflect', 'Reflect'],
					['glow', 'Glow'],
					['phoenix', 'Phoenix']
				]
			}
		},
		title: 'Accumulator'
	});
}));
