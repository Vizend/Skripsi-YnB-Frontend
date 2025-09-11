// src/api/barangAPI.js
import { request } from './API.js';

// Ambil semua barang
export async function getBarang() {
	return await request('/api/barang', 'GET');
}

export async function updateBarang(kode_barang, data) {
	const res = await request(`/api/barang/${kode_barang}`, 'PUT', null, data);
	return res;
}

export async function deleteBarang(kode_barang) {
	return await request(`/api/barang/${kode_barang}`, 'DELETE');
}

// Upload CSV barang
export async function uploadBarangCSV(data, fileName) {
	return await request(
		'/api/upload-barang-csv',
		'POST',
		null, // token jika pakai JWT
		data,
		false,
		{ 'X-Filename': fileName }
	);
}
