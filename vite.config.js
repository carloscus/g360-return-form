import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	// Configuración para desarrollo y producción
	build: {
		outDir: 'build',
		emptyOutDir: true,
		manifest: true
	}
};

export default config;