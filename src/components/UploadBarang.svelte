<script>
	import Modal from './Modal.svelte';
	import { createEventDispatcher } from 'svelte';
	import { getBarang, uploadBarangCSV } from '../api/barangAPI.js';

	const dispatch = createEventDispatcher();

	let showUploadResultModal = false;

	let file,
		previewData = [],
		error = '',
		success = '',
		uploadResults = [];

	function handleFileUpload(event) {
		file = event.target.files[0]; // Ambil file yang dipilih

		// Validasi ekstensi
		if (!file.name.toLowerCase().endsWith('.csv')) {
			error = 'Hanya file .csv yang diperbolehkan';
			file = null;
			previewData = [];
			return;
		}

		const reader = new FileReader();
		reader.onload = (e) => {
			const lines = e.target.result.split('\n').filter(Boolean);
			const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^\uFEFF/, '')); // buang BOM
			const headers = rawHeaders.map((h) => h.toLowerCase());

			previewData = lines.slice(1).map((line) => {
				const cols = line.split(',');
				let row = {};

				headers.forEach((h, i) => {
					const value = cols[i]?.trim() || '';
					switch (h) {
						case 'code':
							row.kode_barang = value;
							break;
						case 'description':
							row.nama_barang = value;
							break;
						case 'quantity':
							row.jumlah_stock = parseInt(value) || 0;
							break;
						case 'value':
							row._value = parseFloat(value) || 0; // simpan sementara
							break;
						case 'harga_beli':
							row.harga_beli = parseFloat(value) || 0;
							break;
					}
				});

				// Default kosong
				row.harga_beli = row.harga_beli ?? 0;

				// Hitung harga_jual dari value/quantity * 100
				if (row.jumlah_stock > 0 && row._value > 0) {
					row.harga_jual = (row._value / row.jumlah_stock) * 1000;
				} else {
					row.harga_jual = 0;
				}
				delete row._value; // buang supaya tidak ikut terkirim


				return row;
			});
			console.log('Preview Data:', previewData); // debug
		};
		reader.readAsText(event.target.files[0]);
	}

	async function uploadCSV() {
		if (!file) {
			error = 'File belum dipilih';
			return;
		}

		try {
			// const res = await fetch('http://localhost:8080/api/upload-barang-csv', {
			// 	method: 'POST',
			// 	headers: {
			// 		'Content-Type': 'application/json',
			// 		'X-Filename': file.name // ← kirim nama file
			// 	},
			// 	body: JSON.stringify(previewData)
			// });
			// if (!res.ok) throw new Error('Gagal upload');
			// const result = await res.json();
			const result = await uploadBarangCSV(previewData, file.name);
			success = result.message;
			uploadResults = result.result;
			// success = 'Upload berhasil!';

			// saat upload berhasil
			dispatch('closeModal');
			dispatch('showResult', { results: uploadResults, message: success });
		} catch (err) {
			error = err.message;
		}
	}
</script>

<div class="space-y-4 p-4">
	<input type="file" accept=".csv" on:change={handleFileUpload} />

	{#if previewData.length}
		<button on:click={uploadCSV} class="rounded bg-blue-500 px-4 py-2 text-white">
			Upload ke Server
		</button>

		<div class="mt-4 max-h-[400px] overflow-auto border">
			<table class="w-full border">
				<thead>
					<tr>
						<th class="border px-2">Kode</th>
						<th class="border px-2">Nama</th>
						<th class="border px-2">Harga Jual</th>
						<th class="border px-2">Harga Beli</th>
						<th class="border px-2">Stok</th>

					</tr>
				</thead>
				<tbody>
					{#each previewData as row}
						<tr>
							<td class="border px-2 text-sm">{row.kode_barang}</td>
							<td class="border px-2 text-sm">{row.nama_barang}</td>
							<td class="border px-2 text-sm">{row.harga_jual}</td>
							<td class="border px-2 text-sm">{row.harga_beli}</td>
							<td class="border px-2 text-sm">{row.jumlah_stock}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if error}<p class="text-red-500">{error}</p>{/if}
</div>
