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

	Seriously.plugin('tile', {
		shader: function (inputs, shaderSource) {
			shaderSource.vertex = '#ifdef GL_ES\n' +
				'precision mediump float;\n' +
				'#endif \n' +
				'\n' +
				'attribute vec4 position;\n' +
				'attribute vec2 texCoord;\n' +
				'\n' +
				'uniform vec3 srsSize;\n' +
				'uniform mat4 projection;\n' +
				'uniform mat4 transform;\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'void main(void) {\n' +
				'	vec4 pos = position * vec4(srsSize.x / srsSize.y, 1.0, 1.0, 1.0);\n' +
				'	pos = transform * pos;\n' +
				'	pos.z -= srsSize.z;\n' +
				'	pos = projection * pos;\n' +
				'	pos.z = 0.0;\n' + //prevent near clipping

				//'	float det = determinant(pos);\n' +
				//'	vTexCoord = texCoord;\n' +

				//'	vec4 warp = transform * vec4(texCoord * 2.0 - 1.0, 1.0, 1.0);\n' +
				//'	vTexCoord = 0.5 * warp.xy / warp.z + 0.5;\n' +
				'	vTexCoord = 0.5 * pos.xy / pos.w + 0.5;\n' +
				'	gl_Position = position;\n' +
				'}\n';
			shaderSource.fragment = '#ifdef GL_ES\n\n' +
				'precision mediump float;\n\n' +
				'#endif\n\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'uniform sampler2D source;\n' +
				'\n' +
				'void main(void) {\n' +
				'	gl_FragColor = texture2D(source, mod(vTexCoord, 1.0));\n' +
				'}\n';
			return shaderSource;
		},
		inputs: {
			source: {
				type: 'image',
				uniform: 'source',
				shaderDirty: false
			}
		},
		title: 'Tile'
	});
}));
