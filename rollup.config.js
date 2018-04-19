import path from 'path';
import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import commonjs from 'rollup-plugin-commonjs';

export default {
	input: 'src/index.js',
	output: {
		format: 'cjs',
		name: 'Composer',
	},
	external: ['ramda', 'uuid'],
	plugins: [
		babel({
			exclude: path.join(__dirname, 'node_modules/**'),
			plugins: ['external-helpers'],
		}),
		peerDepsExternal(),
		commonjs(),
		resolve({
			customResolveOptions: {
				// matching NODE_PATH
				moduleDirectory: 'src'
			}
		}),
	],
};


