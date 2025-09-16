import { redirect } from '@sveltejs/kit';

export const ssr = false; // jalankan load di client saja
export function load() {
	// cek token di localStorage (diset saat login)
	const token = localStorage.getItem('token');
	if (!token) {
		throw redirect(302, '/login');
	}
}
