<script>
	import { onMount, onDestroy } from 'svelte';
	import Modal from './Modal.svelte';
	import UploadBarang from './UploadBarang.svelte';
	import ProductForm from './ProductForm.svelte';
	import DetailMasukModal from './DetailMasukModal.svelte';
	import DetailMasukContent from './DetailMasukContent.svelte';
	import { getBarang, updateBarang, deleteBarang } from '../api/barangAPI.js';
	import { API_BASE_URL } from '../api/apiconfigs';

	let showModal = false;
	let uploadMode = ''; // "manual" atau "csv"

	let showMainModal = false;
	let showManualForm = false;
	let showCSVForm = false;
	let showUploadResultModal = false;
	let showExportModal = false;

	let search = '';
	let selectedProduct = null;
	let showEditModal = false;

	let uploadResults = [];
	let uploadSuccessMessage = '';
	let products = [];
	let filteredProducts = [];

	let editSuccess = '';
	let editError = '';

	let touchStartX = 0;
	let touchEndX = 0;

	let swipedKode = null;
	let swipeClass = '';

	let showDetailModal = false;
	let selectedKode = '';
	let barangMasukList = [];

	let isEditMode = false;
	let selectedCodes = new Set(); // kumpulan kode_barang terpilih
	let selectAll = false;

	// biar gampang dipakai di template
	$: selectedCount = selectedCodes.size;

	$: if (isEditMode) {
		const allSelected =
			filteredProducts.length > 0 &&
			filteredProducts.every((p) => selectedCodes.has(p.kode_barang));
		if (selectAll !== allSelected) selectAll = allSelected;
	}

	// pilihan kolom export
	const exportChoices = [
		{ key: 'kode_barang', label: 'Kode Barang' },
		{ key: 'nama_barang', label: 'Nama Barang' },
		{ key: 'harga_jual', label: 'Harga Jual' },
		{ key: 'harga_beli', label: 'Harga Beli' },
		{ key: 'quantity', label: 'Quantity (stok tersisa)' },
		{ key: 'value', label: 'Value (nilai persediaan)' }
	];
	let selectedExport = new Set(['kode_barang', 'nama_barang', 'quantity', 'value']);
	let includeArchived = false;

	function toggleExportChoice(key) {
		const s = new Set(selectedExport);
		if (s.has(key)) s.delete(key);
		else s.add(key);
		selectedExport = s;
	}

	function handleTouchStart(event) {
		touchStartX = event.touches[0].clientX;
	}

	function handleTouchEnd(event, p) {
		touchEndX = event.changedTouches[0].clientX;
		const deltaX = touchEndX - touchStartX;

		if (deltaX > 50) {
			// Geser ke kanan = Edit
			swipedKode = p.kode_barang;
			swipeClass = 'swipe-right';
			setTimeout(() => {
				swipedKode = null;
				swipeClass = '';
				handleRowDblClick(p);
			}, 250);
		} else if (deltaX < -50) {
			// Geser ke kiri = Hapus
			swipedKode = p.kode_barang;
			swipeClass = 'swipe-left';
			setTimeout(() => {
				swipedKode = null;
				swipeClass = '';
				selectedProduct = p;
				handleDeleteProduct();
			}, 250);
		}
	}

	function toggleEditMode() {
		isEditMode = !isEditMode;
		if (!isEditMode) {
			selectedCodes = new Set(); // <= REASSIGN
			selectAll = false;
		}
	}

	function toggleSelect(kode) {
		const s = new Set(selectedCodes); // <= copy
		if (s.has(kode)) s.delete(kode);
		else s.add(kode);
		selectedCodes = s; // <= REASSIGN
	}

	function toggleSelectAll() {
		const s = new Set();
		if (!selectAll) {
			for (const p of filteredProducts) s.add(p.kode_barang);
		}
		selectedCodes = s; // <= REASSIGN
		selectAll = !selectAll;
	}

	async function handleBulkDelete() {
		if (selectedCount === 0) return;
		const ok = confirm(`Yakin menghapus ${selectedCount} produk terpilih?`);
		if (!ok) return;

		const res = await fetch(`${API_BASE_URL}/api/barang/bulk-delete`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ kode_list: Array.from(selectedCodes) })
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err.message || 'Gagal bulk delete');
			return;
		}

		await fetchProducts();
		isEditMode = false;
		selectedCodes = new Set(); // <= REASSIGN
		selectAll = false;
		alert('Produk terpilih berhasil dihapus.');
	}

	async function fetchProducts() {
		try {
			const data = await getBarang();
			console.log(data);
			// Tambah async fetch untuk harga beli FIFO
			products = await Promise.all(
				data.map(async (p) => {
					const res = await fetch(`${API_BASE_URL}/api/barang/${p.kode_barang}/fifo-harga`);
					const { harga_beli } = await res.json();

					return {
						name: p.nama_barang,
						selling: p.harga_jual,
						purchase: harga_beli, // << FIFO harga_beli di sini
						stock: p.jumlah_stock,
						kode_barang: p.kode_barang
					};
				})
			);
			filteredProducts = [...products];
		} catch (err) {
			console.error('Fetch error:', err);
		}
	}

	async function refreshBarangMasukList() {
		if (!selectedKode) return;
		const res = await fetch(`${API_BASE_URL}/api/barang/${selectedKode}/masuk`);
		barangMasukList = await res.json();
	}

	async function openDetailModal(kode) {
		selectedKode = kode;
		showDetailModal = true;

		const res = await fetch(`${API_BASE_URL}/api/barang/${kode}/masuk`);
		barangMasukList = await res.json();
		await refreshBarangMasukList();
	}

	async function doExportCSV() {
		if (selectedExport.size === 0) {
			alert('Pilih minimal satu kolom.');
			return;
		}
		const body = {
			columns: Array.from(selectedExport),
			include_archived: includeArchived
		};
		const resp = await fetch(`${API_BASE_URL}/api/barang/export-csv`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!resp.ok) {
			const t = await resp.text();
			alert('Export gagal: ' + t);
			return;
		}
		const blob = await resp.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'barang_export.csv';
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
		showExportModal = false;
	}

	function handleSearch() {
		const keyword = search.toLowerCase();
		filteredProducts = products.filter(
			(p) => p.name.toLowerCase().includes(keyword) || p.kode_barang.toLowerCase().includes(keyword)
		);
	}

	function handleRowDblClick(p) {
		selectedProduct = { ...p };
		console.log(selectedProduct);
		editSuccess = '';
		editError = '';
		showEditModal = true;
	}

	function handleEditBarangMasuk(entry) {
		console.log('📝 Edit entry:', entry);
	}

	onMount(() => {
		fetchProducts();
	});

	async function handleAddProduct(data) {
		console.log('Sending data to backend:', JSON.stringify(data, null, 2));
		try {
			const res = await fetch(`${API_BASE_URL}/api/barang/manual`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});

			if (!res.ok) {
				const err = await res.json();
				alert('Gagal menambahkan produk: ' + err.message);
				return;
			}

			alert('Produk berhasil ditambahkan');
			await fetchProducts(); // refresh tabel
			showManualForm = false;
		} catch (error) {
			console.error(error);
			alert('Error saat menambahkan produk.');
		}
	}
	async function handleUpdateProduct(data) {
		if (!selectedProduct || !selectedProduct.kode_barang) {
			console.error('Kode barang tidak tersedia');
			return { ok: false, message: 'Kode barang tidak tersedia' };
		}

		console.log('📦 Mengirim update:', selectedProduct.kode_barang, data);

		try {
			await updateBarang(selectedProduct.kode_barang, {
				nama_barang: data.name,
				harga_jual: data.selling,
				harga_beli: data.purchase,
				jumlah_stock: data.stock
			});
			editSuccess = 'Berhasil update produk';
			editError = '';
			await fetchProducts(); // refresh table
			showEditModal = false;
			selectedProduct = null;
			return true; //sukses
		} catch (err) {
			console.error('Gagal update:', err);
			return { ok: false, message: err.message };
		}
	}

	async function handleDeleteProduct() {
		if (!selectedProduct || !selectedProduct.kode_barang) {
			alert('Produk tidak valid.');
			return;
		}

		console.log('📦 Menghapus produk:', selectedProduct.kode_barang);

		const confirmDelete = confirm(`Yakin ingin menghapus ${selectedProduct.name}?`);
		if (!confirmDelete) return;

		try {
			await deleteBarang(selectedProduct.kode_barang);
			alert('Produk berhasil dihapus.');
			await fetchProducts(); // refresh data
			showEditModal = false;
			selectedProduct = null;
		} catch (err) {
			alert('Gagal menghapus produk: ' + err.message);
		}
	}

	async function lihatDetail(kode) {
		const res = await fetch(`${API_BASE_URL}/api/barang/${kode}/detail-masuk`);
		const detail = await res.json();
		alert(JSON.stringify(detail, null, 2)); // bisa ganti dengan modal
	}
</script>

<!-- Container -->
<div class="flex h-full flex-col rounded-lg bg-white p-4 shadow">
	<!-- Sticky Header Section -->
	<div class="sticky top-0 z-10 bg-white pb-4">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-bold text-gray-800">Inventory</h2>
			<div class="flex gap-2">
				<button
					class="rounded bg-emerald-600 px-4 py-2 text-white"
					on:click={() => (showExportModal = true)}
					title="Export CSV"
				>
					Export
				</button>
				<button
					class="rounded px-4 py-2 text-white"
					class:bg-blue-500={!isEditMode}
					class:bg-gray-500={isEditMode}
					on:click={toggleEditMode}
					title="Edit mode untuk pilih & hapus banyak"
				>
					{isEditMode ? 'Batal' : 'Edit'}
				</button>

				{#if isEditMode}
					<button
						class="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
						on:click={handleBulkDelete}
						disabled={!selectedCount}
					>
						Hapus ({selectedCount})
					</button>
				{/if}

				<button
					class="rounded bg-blue-500 px-4 py-2 text-white"
					on:click={() => (showMainModal = true)}
				>
					Add Product
				</button>
			</div>
		</div>

		<input
			type="text"
			placeholder="Search"
			bind:value={search}
			on:input={handleSearch}
			class="w-full rounded border p-2"
		/>
	</div>

	<!-- Scrollable Table Section -->
	<div class="mt-4 flex-1 overflow-y-auto pb-10">
		<table class="w-full table-auto text-left">
			<thead class="sticky top-0 bg-white shadow">
				<tr class="border-b font-semibold">
					{#if isEditMode}
						<th class="w-10 py-2 text-center">
							<input type="checkbox" bind:checked={selectAll} on:change={toggleSelectAll} />
						</th>
					{/if}
					<th class="py-2">Kode</th>
					<th>Name</th>
					<th>Selling Price</th>
					<th>Purchase Price</th>
					<th>Stock</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredProducts as p}
					<tr
						class={`cursor-pointer border-b transition-all duration-300 ease-in-out ${
							swipedKode === p.kode_barang
								? swipeClass === 'swipe-left'
									? 'translate-x-[-10px] bg-red-100'
									: swipeClass === 'swipe-right'
										? 'translate-x-[10px] bg-green-100'
										: ''
								: ''
						}`}
						on:touchstart={handleTouchStart}
						on:touchend={(e) => handleTouchEnd(e, p)}
						on:dblclick={() => !isEditMode && handleRowDblClick(p)}
					>
						{#if isEditMode}
							<td class="w-10 py-2 text-center">
								<input
									type="checkbox"
									checked={selectedCodes.has(p.kode_barang)}
									on:change={() => toggleSelect(p.kode_barang)}
									on:click={(e) => e.stopPropagation()}
								/>
							</td>
						{/if}

						<td class="py-2 font-mono">{p.kode_barang}</td>
						<td>{p.name}</td>
						<td>{p.selling}</td>
						<td>{p.purchase}</td>
						<td>{p.stock}</td>
						<td>
							<button
								class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:outline-none"
								title="Lihat detail barang masuk"
								on:click={(e) => {
									e.stopPropagation();
									openDetailModal(p.kode_barang);
								}}
								>Detail
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Pilihan metode input -->
<Modal show={showMainModal} onClose={() => (showMainModal = false)}>
	<h3 class="mb-4 text-lg font-bold">Pilih metode input</h3>
	<button
		class="mb-2 w-full rounded bg-green-500 p-2 text-white"
		on:click={() => {
			showManualForm = true;
			showMainModal = false;
		}}
	>
		Input Manual
	</button>
	<button
		class="w-full bg-blue-600 p-2 text-white"
		on:click={() => {
			showCSVForm = true;
			showMainModal = false;
		}}
	>
		Upload CSV
	</button>
</Modal>

<!-- Modal Manual Form -->
<Modal show={showManualForm} onClose={() => (showManualForm = false)}>
	<ProductForm on:submit={(e) => handleAddProduct(e.detail)} />
</Modal>

<!-- Modal Upload CSV -->
<Modal show={showCSVForm} onClose={() => (showCSVForm = false)}>
	<UploadBarang
		on:closeModal={() => (showCSVForm = false)}
		on:showResult={(e) => {
			uploadResults = e.detail.results;
			uploadSuccessMessage = e.detail.message;
			showUploadResultModal = true;
			fetchProducts(); //untuk refresh
		}}
	/>
</Modal>

<Modal show={showUploadResultModal} onClose={() => (showUploadResultModal = false)}>
	<h3 class="mb-3 text-lg font-semibold">Hasil Upload</h3>
	<p class="mb-2 font-medium text-green-600">✔ {uploadSuccessMessage}</p>
	<div class="max-h-[400px] overflow-auto rounded border">
		<table class="w-full border-collapse text-sm">
			<thead class="sticky top-0 bg-gray-100">
				<tr>
					<th class="border px-2 py-1">Kode</th>
					<th class="border px-2 py-1">Nama</th>
					<th class="border px-2 py-1">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each uploadResults as row}
					<tr>
						<td class="border px-2 py-1">{row.kode_barang}</td>
						<td class="border px-2 py-1">{row.nama_barang}</td>
						<td class="border px-2 py-1">
							<span class={row.status.includes('Gagal') ? 'text-red-500' : 'text-green-600'}
								>{row.status}</span
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</Modal>

<Modal show={showEditModal} onClose={() => (showEditModal = false)}>
	<ProductForm
		bind:initial={selectedProduct}
		on:submit={(e) => {
			console.log('🚀 UPDATE EVENT TRIGGERED');
			handleUpdateProduct(e.detail);
		}}
	/>
	<!-- Tombol hapus di bawah form -->
	<button
		class="mt-4 w-full rounded bg-red-600 p-2 text-white hover:bg-red-700"
		on:click={handleDeleteProduct}
	>
		Hapus Produk
	</button>
</Modal>

<!-- Modal Detail Barang Masuk -->
<Modal show={showDetailModal} onClose={() => (showDetailModal = false)}>
	<DetailMasukContent
		kodeBarang={selectedKode}
		list={barangMasukList}
		onEdit={(e) => handleEditBarangMasuk(e.detail)}
		on:refresh={async () => {
			await refreshBarangMasukList(); //refresh detail masuk content
			await fetchProducts(); //refresh table
		}}
	/>
</Modal>

<Modal show={showExportModal} onClose={() => (showExportModal = false)}>
	<h3 class="mb-3 text-lg font-bold">Export Barang ke CSV</h3>
	<div class="mb-3 text-sm text-gray-600">Pilih kolom yang ingin diekspor:</div>
	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		{#each exportChoices as ch}
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={selectedExport.has(ch.key)}
					on:change={() => toggleExportChoice(ch.key)}
				/>
				<span>{ch.label}</span>
			</label>
		{/each}
	</div>
	<div class="mt-3 flex items-center gap-2">
		<input id="arch" type="checkbox" bind:checked={includeArchived} />
		<label for="arch" class="text-sm">Sertakan barang yang diarsipkan</label>
	</div>

	<div class="mt-4 flex justify-end gap-2">
		<button class="rounded border px-4 py-2" on:click={() => (showExportModal = false)}
			>Batal</button
		>
		<button class="rounded bg-emerald-600 px-4 py-2 text-white" on:click={doExportCSV}>
			Export CSV
		</button>
	</div>
</Modal>

<style>
	tr {
		transition: all 0.25s ease-in-out;
	}
</style>
