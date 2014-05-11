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

	Seriously.plugin('solarize', {
		commonShader: true,
		shader: function (inputs, shaderSource) {
			shaderSource.fragment = [
				'precision mediump float;',

				'varying vec2 vTexCoord;',

				'uniform sampler2D source;',
				'uniform float threshold;',
				'uniform float amount;',
				'uniform float peak;',

				'const vec3 lumcoeff = vec3(0.2125, 0.7154, 0.0721);',

				'void main(void) {',
				'	vec4 pixel = texture2D(source, vTexCoord);',
				'	vec3 color = pixel.rgb;',
				'	if (amount > 0.0) {',
				'		if (dot(pixel.rgb, lumcoeff) > threshold) {',
				'			color = 1.0 - color;',
				'		}',
				'		if (threshold > 0.0) {',
				'			color = color * (peak / threshold);',
				'		//} else {',
				'			//color = 0.0;',
				'		}',
				'	}',
				'	gl_FragColor = vec4(mix(pixel.rgb, color, amount), pixel.a);',
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
			threshold: {
				type: 'number',
				uniform: 'threshold',
				min: 0,
				max: 1,
				defaultValue: 0.5
			},
			peak: {
				type: 'number',
				uniform: 'peak',
				min: 0,
				max: 1,
				defaultValue: 0.5
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				min: 0,
				max: 1,
				defaultValue: 1
			}
		},
		title: 'Solarize'
	});
}));
