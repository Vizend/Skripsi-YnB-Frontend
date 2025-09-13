// @ts-nocheck
import { API_BASE_URL } from './apiconfigs.js';

export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const defaultHeaders = {
	'Content-Type': 'application/json'
};

export async function request(
	path,
	method,
	jwtToken = null,
	body = null,
	isFormData = false,
	customHeaders = {}
) {
	const headers = {
		...defaultHeaders,
		...(jwtToken && { Authorization: `Bearer ${jwtToken}` }),
		...customHeaders // <= tambahkan custom headers seperti X-Filename
	};

	if (isFormData) {
		delete headers['Content-Type'];
	}

	const options = {
		method,
		headers
	};

	if (body) {
		options.body = isFormData ? body : JSON.stringify(body);
	}
	console.log('[API REQUEST]', method, API_BASE_URL + path, options);

	let res;
	try {
		res = await fetch(API_BASE_URL + path, options);
	} catch (e) {
		// benar-benar gagal jaringan / CORS
		throw { message: 'Tidak bisa terhubung ke server', code: 0 };
	}

	const data = await res.json().catch(() => null);
	console.log('📩 [API RESPONSE]', res.status, data);

	if (!res.ok) {
		const retryAfter = res.headers.get('Retry-After');
		const msg = (data && (data.error || data.message)) || res.statusText || 'Failed to fetch data';
		throw {
			message: msg,
			code: res.status,
			retryAfter: retryAfter ? Number(retryAfter) : undefined
		};
	}
	return data;
}
