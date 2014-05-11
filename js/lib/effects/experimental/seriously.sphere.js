(function (window, undefined) {
"use strict";

window.Seriously = window.Seriously ||
	{ plugin: function (name, opt) { this[name] = opt; } };

function makeGridModel(gl) {
	var verts = [],
		faces = [],
		tex = [],
		latBands = 16, lonBands = 16,
		i, j, u, v, y,
		first, second,
		vertex, index, texCoord,
		vertexArray, indexArray, texArray;

	if (!gl) {
		return false;
	}
	
	for (i = 0; i <= latBands; i++) {
		v = 1 - (i / latBands);
		y = v * 2 - 1;

		for (j = 0; j <= lonBands; j++) {
			//todo:  normals
			u = 1 - (j / lonBands);
			tex.push(u, v);

			verts.push(u * 2 - 1, y, 0);
		}
	}

	for (i = 0; i < latBands; i++) {
		for (j = 0; j < lonBands; j++) {
			first = i * (lonBands + 1) + j;
			second = first + lonBands + 1;

			faces.push(first, second, first + 1);
			faces.push(second, second + 1, first + 1);
		}
	}

	vertexArray = new Float32Array(verts);
	indexArray = new Uint16Array(faces);
	texArray = new Float32Array(tex);

	vertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
	gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
	vertex.size = 3;

	index = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexArray, gl.STATIC_DRAW);

	texCoord = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoord);
	gl.bufferData(gl.ARRAY_BUFFER, texArray, gl.STATIC_DRAW);
	texCoord.size = 2;

	return {
		vertex: vertex,
		index: index,
		texCoord: texCoord,
		length: faces.length,
		mode: gl.TRIANGLES
	};
}

Seriously.plugin('sphere', (function () {
	var model;
	return {
		initialize: function(parent) {
			model = makeGridModel(this.gl, this.width, this.height);
			parent();
		},
		shader: function(inputs, shaderSource, utilities) {
			
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
				'uniform float amount;\n' +
				'\n' +
				'varying vec2 vTexCoord;\n' +
				'\n' +
				'vec4 spherePosition(vec4 pos, float amount) {\n' +
				'	if (amount == 0.0) return pos;\n' +
				'	float amt = amount * ' + Math.PI + ';\n' +
				'	return vec4(\n' +
				'		sin(pos.x * amt) / amt,\n' +
				'		pos.y,\n' +
				'		cos(pos.x * amt) / ' + Math.PI + ',\n' +
				'		1.0\n' +
				'	);\n' +
				'}\n' +
				'void main(void) {\n' +
				'   vec4 adjustedPosition = spherePosition(position, amount);\n' +
				'	vec4 pos = adjustedPosition * vec4(srsSize.x / srsSize.y, 1.0, 1.0, 1.0);\n' +
				'	gl_Position = transform * pos;\n' +
				'	gl_Position.z -= srsSize.z;\n' +
				'	gl_Position = projection * gl_Position;\n' +
				//'	gl_Position.z = 0.0;\n' + //prevent near clipping
				'	vTexCoord = vec2(texCoord.s, texCoord.t);\n' +
				'}\n';
			
			return shaderSource;
		},
		draw: function (shader, basicModel, uniforms, frameBuffer, parent) {
			parent(shader, model, uniforms, frameBuffer, {
				depth: true
			});
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
				defaultValue: 1,
				min: 0,
				max: 1
			}
		},
		description: '',
		title: 'Sphere'
	};
}()) );

}(window));
