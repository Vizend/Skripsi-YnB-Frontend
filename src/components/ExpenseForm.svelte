<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let tanggal = new Date().toISOString().slice(0, 10);
	let kategori = 'gaji'; // gaji | listrik | transport
	let metode = 'kas'; // kas | bank | utang
	let jumlah = 0;
	let keterangan = '';

	let isSubmitting = false;

	async function submit() {
		if (jumlah <= 0) {
			alert('Jumlah harus > 0');
			return;
		}
		isSubmitting = true;
		try {
			const res = await fetch('http://localhost:8080/api/akuntansi/expenses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tanggal, kategori, metode, jumlah, keterangan })
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.message || 'Gagal simpan beban');
			alert('Beban tersimpan');
			dispatch('success');
		} catch (e) {
			alert(e.message);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="space-y-4 text-sm">
	<div class="grid gap-3">
		<div>
			<label class="mb-1 block font-medium text-gray-700">Tanggal</label>
			<input
				type="date"
				bind:value={tanggal}
				class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
			/>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="mb-1 block font-medium text-gray-700">Kategori</label>
				<select
					bind:value={kategori}
					class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
				>
					<option value="gaji">Beban Gaji</option>
					<option value="listrik">Beban Listrik & Air</option>
					<option value="transport">Beban Transportasi</option>
				</select>
			</div>
			<div>
				<label class="mb-1 block font-medium text-gray-700">Metode</label>
				<select
					bind:value={metode}
					class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
				>
					<option value="kas">Kas</option>
					<option value="bank">Bank</option>
					<option value="utang">Utang Usaha (akrual)</option>
				</select>
			</div>
		</div>

		<div>
			<label class="mb-1 block font-medium text-gray-700">Jumlah (Rp)</label>
			<input
				type="number"
				min="0"
				step="100"
				bind:value={jumlah}
				class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
			/>
		</div>

		<div>
			<label class="mb-1 block font-medium text-gray-700">Keterangan</label>
			<input
				type="text"
				placeholder="Opsional"
				bind:value={keterangan}
				class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
			/>
		</div>
	</div>

	<button
		on:click={submit}
		class="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
		disabled={isSubmitting}
	>
		{isSubmitting ? 'Menyimpan...' : 'Simpan Beban'}
	</button>
</div>
