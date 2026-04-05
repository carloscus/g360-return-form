import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			strategies: 'generateSW',
			manifest: {
				name: 'Devoluciones - CIPSA',
				short_name: 'CIPSA Dev',
				description: 'Sistema de gestión de devoluciones para CIPSA',
				theme_color: '#008f5d',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/g360-return-form/',
				start_url: '/g360-return-form/',
				orientation: 'portrait-primary',
				icons: [
					{
						src: 'icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
				globDirectory: 'build',
				navigateFallback: '/g360-return-form/index.html',
				navigateFallbackDenylist: [/^\/g360-return-form\/_app\//]
			},
			devOptions: {
				enabled: false
			}
		})
	],
	build: {
		outDir: 'build',
		emptyOutDir: true,
		manifest: true
	}
};

export default config;