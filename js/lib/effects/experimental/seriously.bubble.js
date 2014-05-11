(function (window, undefined) {
	"use strict";

	/*
	Shader code:
	* Copyright vade - Anton Marini
	* Creative Commons, Attribution - Non Commercial - Share Alike 3.0

	http://v002.info/?page_id=34
	*/

	window.Seriously = window.Seriously ||
		{ plugin: function (name, opt) { this[name] = opt; } };

	Seriously.plugin('bubble', {
		shader: function(inputs, shaderSource, utilities) {
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'\n' +
				'uniform float amount;\n' +
				'uniform float radius;\n' +
				'uniform vec2 origin;\n' +
				'\n' +
				'const float PI = 3.14159265358979323846264;\n' +
				'void main (void)  {\n' +
				'	vec2 delta = vTexCoord - origin;\n' +
				'	float x;\n' +
				'	x = 0.5 * PI * clamp((radius < 0.0 ? 1.0 : length(delta) / radius), 0.0, 1.0);\n' +
				'	vec2 texCoord = origin + delta * (1.0 / pow(sin(x) , amount));\n' +
				'	if (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.x < 0.0 || texCoord.x > 1.0) {\n' +
				'		gl_FragColor = vec4(0.0);\n' +
				'	} else {\n' +
				'		gl_FragColor = texture2D(source, texCoord);\n' +
				'	}\n' +
	//			'	gl_FragColor = vec4( vec3(1.0 /pow(sin(x) , amount)  ), 1.0);\n' +

	//			'	gl_FragColor = vec4( texCoord.x, texCoord.y, 0.0, 1.0);\n' +

				'} \n';
			return shaderSource;
		},
		inPlace: false,
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			},
			amount: {
				type: 'number',
				uniform: 'amount',
				defaultValue: 0.0
			},
			radius: {
				type: 'number',
				uniform: 'radius',
				defaultValue: 0.5,
				min: 0
			},
			origin: {
				type: 'vector',
				dimensions: 2,
				uniform: 'origin',
				defaultValue: [0.5, 0.5],
				min: 0,
				max: 1
			}
		},
		title: 'Bubble',
		categories: ['distort'],
		description: ''
	});

}(window));
