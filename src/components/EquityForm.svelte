<script>
	import { createEventDispatcher } from 'svelte';
	import { API_BASE_URL } from '../api/apiconfigs';
	const dispatch = createEventDispatcher();

	let tanggal = new Date().toISOString().slice(0, 10);
	let tipe = 'modal'; // modal | prive
	let metode = 'kas'; // kas | bank
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
			const res = await fetch(`${API_BASE_URL}/api/akuntansi/equity`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tanggal, tipe, metode, jumlah, keterangan })
			});

			// baca body sekali → coba JSON, kalau gagal pakai text kosong
			let data = null;
			try {
				data = await res.json();
			} catch {
				data = {};
			}

			if (!res.ok) {
				const msg = data?.message || 'Gagal menyimpan';
				// tangkap guard “saldo tidak cukup” dari backend
				if (res.status === 400 && /saldo/i.test(msg)) {
					const saran = data?.saran || '';
					const saldo = fmtIDR(data?.saldo);
					const kurang = fmtIDR(data?.kurang);
					alert(`${msg}\nSaldo: Rp ${saldo}\nKurang: Rp ${kurang}\n${saran}`);
				} else {
					alert(msg);
				}
				return; 
			}

			// const data = await res.json();
			// if (!res.ok) throw new Error(data?.message || 'Gagal simpan equity');
			alert('Transaksi Ekuitas tersimpan');
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
			<label class="mb-1 block font-medium">Tanggal</label>
			<input type="date" bind:value={tanggal} class="w-full rounded border px-3 py-2" />
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<label class="mb-1 block font-medium">Tipe</label>
				<select bind:value={tipe} class="w-full rounded border px-3 py-2">
					<option value="modal">Modal (Setoran)</option>
					<option value="prive">Prive (Pengambilan)</option>
				</select>
			</div>
			<div>
				<label class="mb-1 block font-medium">Metode</label>
				<select bind:value={metode} class="w-full rounded border px-3 py-2">
					<option value="kas">Kas</option>
					<option value="bank">Bank</option>
				</select>
			</div>
		</div>

		<div>
			<label class="mb-1 block font-medium">Jumlah (Rp)</label>
			<input
				type="number"
				min="0"
				step="100"
				bind:value={jumlah}
				class="w-full rounded border px-3 py-2"
			/>
		</div>

		<div>
			<label class="mb-1 block font-medium">Keterangan</label>
			<input
				type="text"
				placeholder="Opsional"
				bind:value={keterangan}
				class="w-full rounded border px-3 py-2"
			/>
		</div>
	</div>

	<button
		on:click={submit}
		class="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
		disabled={isSubmitting}
	>
		{isSubmitting ? 'Menyimpan...' : 'Simpan'}
	</button>
</div>
