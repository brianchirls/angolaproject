/* global define, require */
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

	/*
	Adapted and optimized based on: https://www.shadertoy.com/view/ldXSz4#
	Maps into DawnBringer's 4-bit (16 color) palette:
	http://www.pixeljoint.com/forum/forum_posts.asp?TID=12795
	*/

	Seriously.plugin('pixelart', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform vec2 resolution;',
				'uniform float pixelate;',

				'const float time = 4.0;',

				'float hash(vec2 p) {',
				'	return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x))));',
				'}',

				'float compare(vec3 a, vec3 b) {',
				'	vec3 diff = (a - b);',
				'	return dot(diff, diff);',
				'}',

				// Increase saturation
				'#define COMP(a) pow(max(vec3(0.0), a - min(a.r, min(a.g, a.b)) * 0.25), vec3(2.0))',

				'void main(void) {',
				'	float pixelScale = resolution.x / pixelate;',
				'	float aspect = resolution.x / resolution.y;',
				'	vec2 d = vec2(1.0 / pixelScale, aspect / pixelScale);',
				'	vec2 coord = floor(vTexCoord / d) * d;',
				'	vec2 c = floor(gl_FragCoord.xy / pixelScale);',

				'	vec4 pixel = texture2D(source, coord);',
				'	vec3 src = COMP(pixel.rgb);',

				// Track the two best colors
				'	vec3 dst0 = vec3(0), dst1 = vec3(0);',
				'	float best0 = 1e3, best1 = 1e3;',
				'#	define TRY(R, G, B) { const vec3 tst = vec3(R, G, B); float err = compare(src, tst); if (err < best0) { best1 = best0; dst1 = dst0; best0 = err; dst0 = tst; } }',

				'	TRY(0.004444, 0.001246, 0.009612);',
				'	TRY(0.053533, 0.011211, 0.028435);',
				'	TRY(0.019931, 0.024606, 0.144698);',
				'	TRY(0.054444, 0.047370, 0.054444);',
				'	TRY(0.225160, 0.062991, 0.019931);',
				'	TRY(0.028435, 0.130165, 0.011211);',
				'	TRY(0.558096, 0.042388, 0.045679);',
				'	TRY(0.132297, 0.121131, 0.081393);',
				'	TRY(0.068521, 0.162361, 0.519247);',
				'	TRY(0.609011, 0.199862, 0.016747);',
				'	TRY(0.153019, 0.206045, 0.250982);',
				'	TRY(0.147697, 0.388789, 0.016747);',
				'	TRY(0.453641, 0.266945, 0.202500);',
				'	TRY(0.102777, 0.427613, 0.469628);',
				'	TRY(0.581780, 0.546441, 0.076436);',
				'	TRY(0.436635, 0.523494, 0.396159);',
				'#	undef TRY',

				'	best0 = sqrt(best0);',
				'	best1 = sqrt(best1);',
				'	gl_FragColor = vec4(mod(c.x + c.y, 2.0) >  (hash(c * 2.0 + fract(sin(vec2(floor(time), floor(time * 1.7))))) * 0.75) + (best1 / (best0 + best1)) ? dst1 : dst0, 1.0);',
				'}'
			].join('\n');
			return shaderSource;
		},
		inPlace: true,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},

			//scale of each pixel
			pixelate: {
				type: 'number',
				uniform: 'pixelate',
				defaultValue: 8
			}
		},
		title: 'Pixel Art',
		description: ''
	});
}));
