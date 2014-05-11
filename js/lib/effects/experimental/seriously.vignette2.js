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

Seriously.plugin('vignette', {
	shader: function(inputs, shaderSource, utilities) {
		shaderSource.fragment = '#ifdef GL_ES\n\n' +
			'precision mediump float;\n\n' +
			'#endif\n\n' +
			'\n' +
			'varying vec2 vTexCoord;\n' +
			'\n' +
			'uniform float vignette;\n' +
			'uniform float edge;\n' +
			'uniform float vignetteMix;\n' +
			'\n' +
			'uniform sampler2D source;\n' +
			'\n' +
			// create a black and white oval about the center of our image for our vignette
			'vec4 vignetteFunction(vec2 normalizedTexcoord, float vignetteEdge, float vignetteMix) {\n' +
			'	normalizedTexcoord = 2.0 * normalizedTexcoord - 1.0; // - 1.0 to 1.0\n' +
			'	float r = length(normalizedTexcoord);\n' +
			'	float amount = pow(clamp(r - vignetteMix, 0.0, 1.0), 1.0 + vignetteEdge * 10.0);\n' +
			'	vec4 vignette = (vec4(smoothstep(0.0, 1.0, amount)));\n' +
			'	return clamp(1.0 - vignette, 0.0, 1.0);\n' +
			'}\n' +
			'\n' +
			'void main (void)  {\n' +
			'\n' +
				// make a vignette around our borders.
			'	vec4 vignetteResult = vignetteFunction(vTexCoord, edge, vignetteMix);\n' +
			'\n' +
				// sharpen via unsharp mask (subtract image from blured image)
			'	vec4 pixel = texture2D(source, vTexCoord);\n' +
			'\n' +
			'	gl_FragColor = mix(pixel,vignetteResult * pixel, vignette);\n' +
			'	gl_FragColor.a = pixel.a;\n' +
			'}\n';

		return shaderSource;
	},
	inPlace: true,
	inputs: {
		source: {
			type: 'image',
			uniform: 'source',
			shaderDirty: false
		},
		amount: {
			type: 'number',
			uniform: 'vignette',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		edge: {
			type: 'number',
			uniform: 'edge',
			defaultValue: 1,
			min: 0,
			max: 1
		},
		mix: {
			type: 'number',
			uniform: 'vignetteMix',
			defaultValue: 1,
			min: 0,
			max: 1
		}
	},
	title: 'Vignette',
	categories: ['film'],
	description: ''
});

}(window));
