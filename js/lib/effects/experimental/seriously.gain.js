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

	Seriously.plugin('gain', {
		shader: function (inputs, shaderSource) {
			var biasFunc,
				halfLog = Math.log(0.5);
			if (inputs.fast) {
				biasFunc = 't / ((1.0 / b - 2.0) * (1.0 - t) + 1.0);';
			} else {
				biasFunc = 'pow(t, log(b)/' + halfLog + ');';
			}
			shaderSource.fragment = [
				'#ifdef GL_ES',
				'precision mediump float;',
				'#endif',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float mixAmount;',
				'uniform float gain;',

				'const vec3 lumcoeff = vec3(0.2125,0.7154,0.0721);',

				'float bias(float b, float t) {',
				'	return ' + biasFunc,
				'}',

				'void main(void) {',
				'	vec4 pixel = clamp(texture2D(source, vTexCoord), 0.0, 1.0);',
				'	float g = 1.0 - (gain + 1.0) * 0.5;',
				'	float luma = dot(pixel.rgb,lumcoeff);',
				'	float val;',
				'	if (luma < 0.5) {',
				'		val = bias(g, 2.0 * luma) / 2.0;',
				'	} else {',
				'		val = 1.0 - bias(1.0 - g, 2.0 - 2.0 * luma) / 2.0;',
				'	}',
				'	val /= (luma + 0.00001);',
				'	vec4 result = vec4(min(pixel.rgb * val, 1.0), pixel.a);',
				'	gl_FragColor = mix(pixel, result, mixAmount);',
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
			gain: {
				type: 'number',
				uniform: 'gain',
				min: -1,
				max: 1,
				defaultValue: 0
			},
			mix: {
				type: 'number',
				uniform: 'mixAmount',
				min: 0,
				max: 1,
				defaultValue: 1
			},
			fast: {
				type: 'boolean',
				shaderDirty: true
			}
		},
		title: 'Gain',
		description: 'Perlin Gain. a.k.a. Filmic Contrast'
	});
}));
