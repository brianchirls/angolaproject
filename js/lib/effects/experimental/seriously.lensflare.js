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
		return {
			initialize: function (parent) {
				var gl;

				parent();
			},
			shader: function (inputs, shaderSource) {
				//shaderSource.vertex = basicVertexShader;
				shaderSource.fragment = [
					'#ifdef GL_ES',
					'precision mediump float;',
					'#endif',

					'#define NSAMPLES ' + (Math.floor(inputs.samples) || 8),
					'varying vec2 vTexCoord;',

					'uniform sampler2D source;',
					'uniform vec3 srsSize;',

					'uniform sampler2D lensDirt;',
					'uniform float dispersal;',
					'uniform float haloWidth;',
					'uniform float threshold;',
					'uniform bool useDirt;',

					//highlight gain
					'uniform float gain;',

					//todo: make this configurable/uniform
					'const vec3 distortion = vec3(0.01, 0.03, 0.05);',

					'const vec3 lumcoeff = vec3(0.299, 0.587, 0.114);',
					'const vec2 image_center = vec2(0.5);',

					'vec2 flipTexcoords(in vec2 texcoords) {',
					'	return -texcoords + 1.0;',
					'}',

					'float vignette(in vec2 coords) {',
					'	float dist = distance(coords, vec2(0.5, 0.5));',
					'	dist = smoothstep(haloWidth - 0.2, haloWidth, dist);',
					'	return clamp(dist, 0.0, 1.0);',
					'}',

					'vec3 treshold(in sampler2D tex, in vec2 coords) {',
					'	vec3 col = texture2D(tex,coords).rgb;',

					'	float lum = dot(col.rgb, lumcoeff);',
					'	float thresh = max((lum - threshold / 255.0) * gain, 0.0);',
					'	return mix(vec3(0.0), col, thresh);',
					'}',

					'vec3 textureDistorted(in sampler2D tex,in vec2 sample_center,in vec2 sample_vector,in vec3 distortion)  {',
					'	vec3 col = vec3(0.0);',

					/*
					'	col.r = treshold(tex, sample_center + sample_vector * distortion.r).r;',
					'	col.g = treshold(tex, sample_center + sample_vector * distortion.g).g;',
					'	col.b = treshold(tex, sample_center + sample_vector * distortion.b).b;',
					*/

					'	return treshold(tex, sample_center);',
					//'	return col;',
					'}',

					'void main() {',
					'	vec2 texcoord = vTexCoord;// * 0.5 + 0.5;',
					'	texcoord = clamp(texcoord, 0.002, 0.998);',

					'	vec2 sample_vector = (image_center - texcoord) * dispersal;',
					'	vec2 halo_vector = normalize(sample_vector) * haloWidth;',

					'	vec3 result = textureDistorted(source, texcoord + halo_vector, halo_vector, distortion).rgb;',
					'	result *= vignette(texcoord);',

					'	vec4 pixel = texture2D(source, texcoord);',
					'	result += pixel.rgb;',
					'	for (int i = 1; i < NSAMPLES; ++i) ',
					'	{',
					'		vec2 offset = sample_vector * float(i);',
					'		result += textureDistorted(source, texcoord + offset, offset, distortion).rgb;',
					'	}',

					'	vec3 anamorph = vec3(0.0);',
					/*
					'	float s;',
					'	for (int i = -16; i < 16; ++i) {',
					'		s = clamp(1.0/abs(float(i)),0.0,1.0);',
					'		anamorph += treshold(source, vec2(texcoord.x + float(i) * (1.0 / 64.0), texcoord.y)).rgb * s;',
					'	}',
					*/

					//'	vec4 col = texture2D(source,texcoord);',
					'	if (useDirt) {',
					'		vec3 dirt = texture2D(lensDirt,texcoord).rgb;',
					'		gl_FragColor.rgb *= (dirt * 0.8 + 0.2);',
					'	}',

					'	gl_FragColor.rgb = (result + anamorph * vec3(2.5, 0.0, 2.5));',
					'	gl_FragColor.a = pixel.a;',
					'}'
				].join('\n');

				return shaderSource;
			},
			draw: function (shader, model, uniforms, frameBuffer, draw) {
				//upscale and blend with original image
				//todo: set up star
				uniforms.useDirt = !!this.inputs.lensDirt;
				draw(shader, model, uniforms, frameBuffer, null);
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
				defaultValue: 0.3,
				min: 0,
				max: 2
			},
			haloWidth: {
				type: 'number',
				uniform: 'haloWidth',
				defaultValue: 0.45,
				min: 0,
				max: 1
			},
			gain: {
				type: 'number',
				uniform: 'gain',
				defaultValue: 1.3,
				min: 0,
				max: 20
			},
			threshold: {
				type: 'number',
				uniform: 'threshold',
				defaultValue: 166,
				min: 0,
				max: 255
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
				defaultValue: 10,
				min: 0,
				max: 20
			}
			//todo distortion 0-16, default = 1 (pixels?)
		},
		title: 'Lens Flare'
	});
}));
