<!-- DetailMasukContent.svelte -->
<script>
	import { createEventDispatcher } from 'svelte';
	export let list = [];
	export let kodeBarang = '';
	import { API_BASE_URL } from '../api/apiconfigs';
	// export let onEdit = () => {};

	const dispatch = createEventDispatcher();

	let editingId = null;
	let editData = {};

	let loading = false;

	function startEdit(entry) {
		editingId = entry.masuk_id;
		editData = { ...entry };
	}

	async function saveEdit() {
		loading = true;

		const res = await fetch(`${API_BASE_URL}/api/barang-masuk/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(editData)
		});
		loading = false;

		if (res.ok) {
			alert('Berhasil update barang masuk!');
			editingId = null;
			editData = {};
			dispatch('refresh');
		} else {
			alert('Gagal update data.');
		}
	}
</script>

<h3 class="mb-4 text-lg font-bold">Riwayat Barang Masuk - {kodeBarang}</h3>

<div class="max-h-[60vh] overflow-y-auto rounded border">
	<table class="w-full border-collapse text-sm">
		<thead class="bg-gray-100">
			<tr>
				<th class="border px-2 py-1">Tanggal</th>
				<th class="border px-2 py-1">Jumlah</th>
				<th class="border px-2 py-1">Harga Beli</th>
				<th class="border px-2 py-1">Sisa Stok</th>
				<!-- <th class="border px-2 py-1">Keterangan</th> -->
				<th class="border px-2 py-1">Aksi</th>
			</tr>
		</thead>
		<tbody>
			{#each list as item}
				<tr>
					{#if editingId === item.masuk_id}
						<td class="border px-2 py-1">
							<input type="date" bind:value={editData.tanggal} class="w-full border p-1" />
						</td>
						<td class="border px-2 py-1">
							<input type="number" bind:value={editData.jumlah} class="w-full border p-1" />
						</td>
						<td class="border px-2 py-1">
							<input type="number" bind:value={editData.harga_beli} class="w-full border p-1" />
						</td>
						<td class="border px-2 py-1">
							<input type="number" bind:value={editData.sisa_stok} class="w-full border p-1" />
						</td>
						<td class="border px-2 py-1">
							<button
								disabled={loading}
								on:click={saveEdit}
								class="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
							>
								{loading ? 'Menyimpan...' : 'Simpan'}
							</button>
						</td>
					{:else}
						<td class="border px-2 py-1">{item.tanggal}</td>
						<td class="border px-2 py-1">{item.jumlah}</td>
						<td class="border px-2 py-1">{item.harga_beli}</td>
						<td class="border px-2 py-1">{item.sisa_stok}</td>
						<td class="border px-2 py-1">
							<button
								on:click={() => startEdit(item)}
								class="rounded bg-yellow-500 px-2 py-1 text-xs text-white hover:bg-yellow-600"
							>
								Edit
							</button>
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	input {
		transition: background-color 0.2s ease-in-out;
	}
	input:focus {
		background-color: #f0f9ff;
	}
	tr.editing {
		background-color: #fff8dc;
	}
</style>
