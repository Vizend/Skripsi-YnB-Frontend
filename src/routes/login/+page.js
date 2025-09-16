import { redirect } from '@sveltejs/kit';

export const ssr = false; // jalankan load di client saja

export function load() {
	if (localStorage.getItem('token')) {
		throw redirect(302, '/dashboard');
	}
}
