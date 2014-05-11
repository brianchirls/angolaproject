/* global define, require */
/*
Lens Distortion

Shader:
* Copyright Martins Upitis (martinsh) devlog-martinsh.blogspot.com
* Creative Commons Attribution 3.0 Unported License
http://devlog-martinsh.blogspot.com/2011/10/glsl-cubic-lens-distortion.html

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

	Seriously.plugin('lensdistortion', {
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'#ifdef GL_ES',
				'precision mediump float;',
				'#endif',

				'varying vec2 vTexCoord;',

				//k = 0.2, kcube = 0.3, scale = 0.9, dispersion = 0.01
				'uniform float k, kcube, scale, dispersion, blurAmount;',
				'uniform bool blurEnabled;',
				'uniform sampler2D source;',

				'const float vignette_size = 0.5;',
				'const float tolerance = 0.2;',

				//needed for fast noise based blurring
				'vec2 rand(vec2 co) {',
				'	float noise1 =  (fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453));',
				'	float noise2 =  (fract(sin(dot(co, vec2(12.9898, 78.233) * 2.0)) * 43758.5453));',
				'	return clamp(vec2(noise1, noise2), 0.0, 1.0);',
				'}',

				'vec3 blur(vec2 coords) {',
				'	vec2 noise = rand(vTexCoord);',

				'	vec2 powers = pow(abs(vTexCoord - 0.5), vec2(2.0));',

				'	float radiusSqrd = pow(vignette_size, 2.0);',
				'	float gradient = smoothstep(radiusSqrd - tolerance, radiusSqrd + tolerance, powers.x + powers.y);',

				'	vec4 col = vec4(0.0);',

				'	float X1 = coords.x + blurAmount * noise.x * 0.004 * gradient;',
				'	float Y1 = coords.y + blurAmount * noise.y * 0.004 * gradient;',
				'	float X2 = coords.x - blurAmount * noise.x * 0.004 * gradient;',
				'	float Y2 = coords.y - blurAmount * noise.y * 0.004 * gradient;',

				'	float invX1 = coords.x + blurAmount * ((1.0 - noise.x) * 0.004) * (gradient * 0.5);',
				'	float invY1 = coords.y + blurAmount * ((1.0 - noise.y) * 0.004) * (gradient * 0.5);',
				'	float invX2 = coords.x - blurAmount * ((1.0 - noise.x) * 0.004) * (gradient * 0.5);',
				'	float invY2 = coords.y - blurAmount * ((1.0 - noise.y) * 0.004) * (gradient * 0.5);',

				'	col += texture2D(source, vec2(X1, Y1)) * 0.1;',
				'	col += texture2D(source, vec2(X2, Y2)) * 0.1;',
				'	col += texture2D(source, vec2(X1, Y2)) * 0.1;',
				'	col += texture2D(source, vec2(X2, Y1)) * 0.1;',

				'	col += texture2D(source, vec2(invX1, invY1)) * 0.15;',
				'	col += texture2D(source, vec2(invX2, invY2)) * 0.15;',
				'	col += texture2D(source, vec2(invX1, invY2)) * 0.15;',
				'	col += texture2D(source, vec2(invX2, invY1)) * 0.15;',

				'	return col.rgb;',
				'}',

				'void main(void) {',
					//index of refraction of each color channel, causing chromatic dispersion
				'	vec3 eta = vec3(1.0 + dispersion * 0.9, 1.0 + dispersion * 0.6, 1.0 + dispersion * 0.3);',

					//texture coordinates
				'	vec2 texcoord = vTexCoord;',

					//canvas coordinates to get the center of rendered viewport
				'	vec2 cancoord = vTexCoord;',
				//'	vec2 cancoord = gl_TexCoord[3].st;',

				'	float r2 = (cancoord.x - 0.5) * (cancoord.x - 0.5) + (cancoord.y - 0.5) * (cancoord.y - 0.5);',

				'	float f = 0.0;',

					//only compute the cubic distortion if necessary
				'	if (kcube == 0.0) {',
				'		f = 1.0 + r2 * k;',
				'	} else {',
				'		f = 1.0 + r2 * (k + kcube * sqrt(r2));',
				'	};',

					// get the right pixel for the current position
				'	vec2 rCoords = (f * eta.r) * scale * (texcoord.xy - 0.5) + 0.5;',
				'	vec2 gCoords = (f * eta.g) * scale * (texcoord.xy - 0.5) + 0.5;',
				'	vec2 bCoords = (f * eta.b) * scale * (texcoord.xy - 0.5) + 0.5;',

				'	vec3 inputDistort = vec3(0.0); ',

				'	inputDistort.r = texture2D(source, rCoords).r;',
				'	inputDistort.g = texture2D(source, gCoords).g;',
				'	inputDistort.b = texture2D(source, bCoords).b;',

				'	if (blurEnabled) {',
				'		inputDistort.r = blur(rCoords).r;',
				'		inputDistort.g = blur(gCoords).g;',
				'		inputDistort.b = blur(bCoords).b;',
				'	}',
				'	',
				'	gl_FragColor = vec4(inputDistort.r, inputDistort.g, inputDistort.b, 1.0);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			k: {
				type: 'number',
				uniform: 'k',
				defaultValue: 0,
				min: -1,
				max: 1
			},
			kcube: {
				type: 'number',
				uniform: 'kcube',
				defaultValue: 0,
				min: 0,
				max: 1
			},
			dispersion: {
				type: 'number',
				uniform: 'scale',
				defaultValue: 1,
				min: 0,
				max: 10
			},
			blurEnabled: {
				type: 'boolean',
				uniform: 'blurEnabled',
				defaultValue: true
			}
		},
		title: 'Lens Distortion'
	});
}));
