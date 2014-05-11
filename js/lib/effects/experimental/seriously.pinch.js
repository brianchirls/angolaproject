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

Seriously.plugin('pinch', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'\n' +
			'uniform float pinch;\n' +
			'uniform vec2 origin;\n' +
			'\n' +
			'void main (void)  {\n' +
			'	vec2 normCoord = vec2(2.0) * vTexCoord - vec2(1.0);\n' +
			'	normCoord += origin;\n' +
			'	float r = length(normCoord);\n' +
			'	float phi = atan(normCoord.y, normCoord.x);\n' +

			// manipulate r and phi to do your bidding
			'	r = pow(r, 1.0 / (1.0 - pinch * -1.0)) * 0.8;\n' +

			//back from polar space
			'	normCoord.x = r * cos(phi);\n' +
			'	normCoord.y = r * sin(phi);\n' +
			'	normCoord -= origin;\n' +

			'	vec2 texCoord = (normCoord / 2.0 + 0.5);\n' +
			'	gl_FragColor = texture2D(source, texCoord);\n' +

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
		pinch: {
			type: 'number',
			uniform: 'pinch',
			defaultValue: 0.2,
			min: -1
		},
		origin: {
			type: 'vector',
			dimensions: 2,
			uniform: 'origin',
			defaultValue: [0, 0],
			min: 0,
			max: 1
		}
	},
	title: 'Pinch',
	categories: ['distort'],
	description: ''
});

}(window));
