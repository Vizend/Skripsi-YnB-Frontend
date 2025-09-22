

<script>

	//tidak dipakai
	export let show = false;
	export let onClose = () => {};
	export let kodeBarang = '';
	export let list = [];

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	let editingId = null;
	let editData = {};

	function startEdit(entry) {
		editingId = entry.masuk_id;
		editData = { ...entry };
	}

	async function saveEdit() {
		const res = await fetch(`/api/barang-masuk/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(editData)
		});
		if (res.ok) {
			alert('Berhasil update!');
			editingId = null;
			dispatch('refresh');
		}
	}
</script>

{#if show}
	<div class="bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-black/20">
		<div class="w-full max-w-2xl rounded bg-white p-4 shadow">
			<h3 class="mb-2 text-lg font-bold">Detail Barang Masuk - {kodeBarang}</h3>

			<table class="w-full border text-sm">
				<thead>
					<tr>
						<th>ID</th>
						<th>Tanggal</th>
						<th>Jumlah</th>
						<th>Harga Beli</th>
						<th>Sisa Stok</th>
						<th>Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each list as item}
						<tr>
							<td>{item.masuk_id}</td>
							{#if editingId === item.masuk_id}
								<td><input type="date" bind:value={editData.tanggal} /></td>
								<td><input type="number" bind:value={editData.jumlah} /></td>
								<td><input type="number" bind:value={editData.harga_beli} /></td>
								<td><input type="number" bind:value={editData.sisa_stok} /></td>
								<!-- <td><input type="text" bind:value={editData.keterangan} /></td> -->
								<td><button on:click={saveEdit} class="text-green-600">Simpan</button></td>
							{:else}
								<td>{item.tanggal}</td>
								<td>{item.jumlah}</td>
								<td>{item.harga_beli}</td>
								<td>{item.sisa_stok}</td>
								<!-- <td>{item.keterangan}</td> -->
								<td><button class="text-blue-600" on:click={() => startEdit(item)}>Edit</button></td
								>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="mt-4 text-right">
				<button class="rounded bg-gray-600 px-3 py-1 text-white" on:click={onClose}>Tutup</button>
			</div>
		</div>
	</div>
{/if}
