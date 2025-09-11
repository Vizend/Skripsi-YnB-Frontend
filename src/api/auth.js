import { request } from './API.js';

export async function login(username, password) {
	return await request('/api/login', 'POST', null, { username, password });
}

export async function signup({ username, password, email }) {
	return await request('/api/signup', 'POST', null, { username, password, email });
}

export async function resetPassword(token, newPassword) {
	return await request('/api/reset-password-token', 'POST', null, {
		token,
		new_password: newPassword
	});
}

export async function forgotPassword(email) {
	return await request('/api/forgot-password', 'POST', null, { email });
}
