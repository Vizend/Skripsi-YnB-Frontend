<script>
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	export let onSubmit = () => {};

	export let initial = null; // <= data untuk edit, bisa null saat tambah

	const dispatch = createEventDispatcher();

	let kode = '';
	let name = '';
	let selling = '';
	let purchase = '';
	let stock = '';
	let error = '';
	let success = '';
	let loading = false;

	// flag edit
	$: isEdit = !!initial;

	// Isi form jika sedang edit
	$: if (initial) {
		kode = initial.kode_barang || '';
		name = initial.name || '';
		selling = initial.selling?.toString() || '';
		purchase = initial.purchase?.toString() || '';
		stock = initial.stock?.toString() || '';
	}

	async function handleSubmit() {
		loading = true;
		error = '';
		success = '';

		if (!name || !selling || !stock) {
			error = 'Semua field kecuali harga beli wajib diisi';
			loading = false;
			return;
		}

		if (!kode || kode.trim() === '') {
			error = 'Kode barang wajib diisi';
			loading = false;
			return;
		}

		const purchaseToSend = isEdit ? parseFloat(purchase) || 0 : purchase ? parseFloat(purchase) : 0;

		const data = {
			kode_barang: kode.trim(),
			name: name.trim(),
			selling: parseFloat(selling),
			purchase: purchaseToSend,
			stock: parseInt(stock)
		};

		dispatch('submit', data);
		loading = false;
	}

	function isNumeric(value) {
		return !isNaN(parseFloat(value)) && isFinite(value);
	}
</script>

<h3 class="mb-4 text-xl font-bold">
	{initial ? 'Edit Produk' : 'Input Produk Manual'}
</h3>

<div class="space-y-3 text-sm">
	<div>
		<label class="mb-1 block font-medium text-gray-700">Kode Barang</label>
		<input bind:value={kode} placeholder="Kode Barang" class="w-full rounded border p-2" />
	</div>

	<div>
		<label class="mb-1 block font-medium text-gray-700">Nama Produk</label>
		<input bind:value={name} placeholder="Nama Produk" class="w-full rounded border p-2" />
	</div>

	<div>
		<label class="mb-1 block font-medium text-gray-700">Harga Jual</label>
		<input
			bind:value={selling}
			type="number"
			placeholder="Harga Jual"
			class="w-full rounded border p-2"
		/>
	</div>

	<div>
		<label class="mb-1 block font-medium text-gray-700">Harga Beli</label>
		<input
			bind:value={purchase}
			type="number"
			placeholder={isEdit ? 'Tidak bisa diubah di sini' : 'Harga Beli'}
			class="w-full rounded border p-2"
			disabled={isEdit}
		/>
		{#if isEdit}
			<div class="mt-1 text-xs text-gray-500">
				Harga beli mengikuti batch pembelian/FIFO. Ubah dari modul Pembelian/Barang Masuk.
			</div>
		{/if}
	</div>

	<div>
		<label class="mb-1 block font-medium text-gray-700">Jumlah Stok</label>
		<input
			bind:value={stock}
			type="number"
			placeholder={isEdit ? 'Tidak bisa diubah di sini' : 'Jumlah Stok'}
			class="w-full rounded border p-2"
			disabled={isEdit}
		/>
	</div>

	{#if error}<p class="text-red-500">{error}</p>{/if}
	{#if success}<p class="text-green-600">{success}</p>{/if}

	<button
		disabled={loading}
		class="mt-2 w-full rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
		on:click={handleSubmit}
	>
		{loading ? 'Menyimpan...' : initial ? 'Update Produk' : 'Tambah Produk'}
	</button>
</div>

<style>
	input {
		outline: none;
	}
</style>
