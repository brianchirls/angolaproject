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

	Seriously.plugin('relight', function () {
		this.uniforms.resMap = [1, 1];
		this.uniforms.resSource = [1, 1];

		return {
			shader: function (inputs, shaderSource) {
					shaderSource.vertex = [
					'precision mediump float;',

					'attribute vec4 position;',
					'attribute vec2 texCoord;',

					'uniform vec2 resolution;',
					'uniform vec2 resSource;',
					'uniform vec2 resMap;',

					'varying vec2 texCoordSource;',
					'varying vec2 texCoordMap;',
					'varying vec2 horizOffset;',
					'varying vec2 vertOffset;',

					'const vec2 HALF = vec2(0.5);',

					'void main(void) {',
					//we don't need to do a transform in this shader, since this effect is not "inPlace"
					'	gl_Position = position;',

					'	vec2 adjusted = (texCoord - HALF) * resolution;',

					'	texCoordSource = adjusted / resSource + HALF;',
					'	texCoordMap = adjusted / resMap + HALF;',

					'	horizOffset = vec2(1.0 / resMap.x, 0.0);',
					'	vertOffset = vec2(0.0, 1.0 / resMap.y);',
					'}'
				].join('\n');

				shaderSource.fragment = [
					'precision mediump float;\n',

					'varying vec2 texCoordSource;',
					'varying vec2 texCoordMap;',
					'varying vec2 horizOffset;',
					'varying vec2 vertOffset;',

					'uniform sampler2D source;',
					'uniform sampler2D map;',

					'uniform float amount;',
					'uniform float offset;',
					'uniform vec2 mapScale;',
					'uniform vec4 color;',

					'void main(void) {',
					'	float depth = texture2D(map, texCoordMap).r;',
					'	float depthVert = texture2D(map, texCoordMap + vertOffset).r;',
					'	float depthHoriz = texture2D(map, texCoordMap + horizOffset).r;',

					'	vec3 p1 = vec3(vertOffset, depthVert - depth);',
					'	vec3 p2 = vec3(horizOffset, depthHoriz - depth);',

					'	vec3 normal = normalize(cross(p1, p2)) / 2.0 + 0.5;',
					'	normal.z = -normal.z;',

					'	gl_FragColor = vec4((normal), 1.0);',
					//'	gl_FragColor = vec4(vec3(abs(depthVert - depth)) * 140.0, 1.0);',
					//'	gl_FragColor = vec4(abs(depthVert - depth) * 140.0, abs(depthHoriz - depth) * 140.0, 0.0, 1.0);',
					//'	gl_FragColor = vec4(vec3(depth), 1.0);',
					'}'
				].join('\n');

				// http://www.johannessaam.com/zRelightSaam-paper.pdf

				return shaderSource;
			},
			resize: function () {
				var source = this.inputs.source,
					map = this.inputs.map;

				if (source) {
					this.uniforms.resSource[0] = source.width;
					this.uniforms.resSource[1] = source.height;
				} else {
					this.uniforms.resSource[0] = 1;
					this.uniforms.resSource[1] = 1;
				}

				if (map) {
					this.uniforms.resMap[0] = map.width;
					this.uniforms.resMap[1] = map.height;
				} else {
					this.uniforms.resMap[0] = 1;
					this.uniforms.resMap[1] = 1;
				}
			}
		};
	},
	{
		inputs: {
			source: {
				type: 'image',
				uniform: 'source'
			},
			map: {
				type: 'image',
				uniform: 'map'
			},
			mapMode: {
				type: 'enum',
				shaderDirty: true,
				defaultValue: 'depth',
				options: [
					'depth', 'normal'
				]
			},
			color: {
				type: 'color',
				uniform: 'color',
				defaultValue: [0, 0, 0, 0]
			}
		},
		title: 'Relight',
		description: ''
	});
}));
