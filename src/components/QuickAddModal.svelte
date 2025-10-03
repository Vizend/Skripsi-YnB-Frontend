<script>
	import PembelianForm from './PembelianForm.svelte';
	import ExpenseForm from './ExpenseForm.svelte';
	import EquityForm from './EquityForm.svelte';
	import { API_BASE_URL } from '../api/apiconfigs';

	export let open = false;
	export let onClose = () => {};
	export let onAfterAnySubmit = async () => {};

	let previewData = null; // { transactions: [...] }
	let previewOpen = false;
	let previewFile = null;
	let hasDuplicate = false;
	let missingCount = 0;

	let COOLDOWN_MS = 2500; // jeda 2.5 detik
	let cooldownMap = new Map(); // key: `${tIndex}:${iIndex}` -> true (sedang cooldown)

	const startCooldown = (k) => {
		cooldownMap.set(k, true);
		cooldownMap = new Map(cooldownMap); // trigger reaktif
		setTimeout(() => {
			cooldownMap.delete(k); // selesai cooldown
			cooldownMap = new Map(cooldownMap);
		}, COOLDOWN_MS);
	};

	const isCooling = (k) => cooldownMap.has(k);

	// state tampilan isi modal
	let mode = 'menu'; // "menu" | "pembelian" | "beban" | "equity" | "txt"
	let isProcessing = false;

	let defaultBuyRatio = 0.9; // 90% dari harga jual
	let creatingMap = new Map(); // key: `${tIndex}:${iIndex}` -> boolean
	const setCreating = (k, v) => {
		creatingMap.set(k, v);
		creatingMap = new Map(creatingMap);
	};

	// hitung harga satuan yang benar (TXT kadang harga baris=total)
	function unitPrice(it) {
		const qty = Number(it?.qty ?? 0);
		const price = Number(it?.price ?? 0);
		if (!price) return 0;
		return Math.round(qty > 1 ? price / qty : price);
	}

	const buildFD = (file) => {
		const fd = new FormData();
		fd.append('file', file);
		return fd;
	};

	//reset ke menu ketika setiap kali modal ditutup
	$: if (!open && mode !== 'menu') {
		mode = 'menu';
		isProcessing = false;
	}

	$: {
		const txs = previewData?.transactions ?? [];
		hasDuplicate = txs.some((t) => t.duplicate);
		missingCount = txs.reduce(
			(sum, t) => sum + (t.items?.filter?.((it) => !it.barang_id)?.length || 0),
			0
		);
	}

	function closeAndReset() {
		mode = 'menu';
		isProcessing = false;
		onClose();
	}

	async function handleDone() {
		await onAfterAnySubmit();
		closeAndReset();
	}

	async function handleTxt(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		isProcessing = true;
		previewFile = file;

		try {
			const pvRes = await fetch(`${API_BASE_URL}/api/xjd/preview`, {
				method: 'POST',
				body: buildFD(file)
			});
			if (!pvRes.ok) throw new Error('Preview gagal');
			previewData = await pvRes.json();
			console.log('Preview:', previewData);
			previewOpen = true;
		} catch (err) {
			alert(err.message || 'Gagal memproses TXT');
		} finally {
			isProcessing = false;
			e.target.value = '';
		}
	}

	async function commitTxt() {
		if (!previewFile) return;

		// // 1) JSON transaksi
		// await fetch(`${API_BASE_URL}/api/transactions`, { method: 'POST', body: buildFD(previewFile) });

		// // 2) Download CSV
		// const csvRes = await fetch(`${API_BASE_URL}/api/convert`, {
		// 	method: 'POST',
		// 	body: buildFD(previewFile)
		// });
		// if (csvRes.ok) {
		// 	const blob = await csvRes.blob();
		// 	const url = URL.createObjectURL(blob);
		// 	const a = document.createElement('a');
		// 	a.href = url;
		// 	a.download = 'transactions.csv';
		// 	document.body.appendChild(a);
		// 	a.click();
		// 	a.remove();
		// 	URL.revokeObjectURL(url);
		// }

		// commit ke jurnal
		const resp = await fetch(`${API_BASE_URL}/api/xjd/upload`, {
			method: 'POST',
			body: buildFD(previewFile)
		});
		if (!resp.ok) {
			const t = await resp.text();
			alert('Commit gagal: ' + t);
			return;
		}
		alert('Berhasil commit penjualan dari TXT.');

		previewOpen = false;
		await onAfterAnySubmit(); // refresh data
	}

	async function createNewItem(tIndex, iIndex) {
		const key = `${tIndex}:${iIndex}`;

		// anti-spam: jika masih proses atau masih cooldown, abaikan klik
		if (creatingMap.get(key) || isCooling(key)) return;

		try {
			setCreating(key, true);

			const trx = previewData.transactions[tIndex];
			const it = trx.items[iIndex];

			const jual = unitPrice(it); // HJ satuan dari TXT
			if (!jual) {
				alert('Harga jual tidak valid');
				return;
			}

			// 1) Buat barang (HB = ratio × HJ)
			const resp1 = await fetch(
				`${API_BASE_URL}/api/barang/quick-create?buy_ratio=${defaultBuyRatio}`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						nama_barang: it.src_nama,
						harga_jual: jual
						// (opsional) harga_beli: Math.round(jual * defaultBuyRatio)
					})
				}
			);
			const barang = await resp1.json();
			if (!resp1.ok) throw new Error(barang?.error || 'Gagal membuat master barang');

			// 2) Buat pembelian untuk mengisi stok (qty = qty terjual)
			const hb = Number(barang.harga_beli); // pakai HB yang dibulatkan dari backend
			const qty = Number(it.qty || 1);
			const total = hb * qty;

			const resp2 = await fetch(`${API_BASE_URL}/api/pembelian/manual`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					// field-field yang diharapkan CreatePembelianManual (models.PembelianManual)
					tanggal: trx.tanggal, // "YYYY-MM-DD" dari preview
					kode_barang: barang.kode_barang, // dari quick-create
					nama_barang: barang.nama_barang, // atau it.src_nama juga boleh
					jumlah: qty,
					harga_satuan: hb,
					total: total
				})
			});
			const pb = await resp2.json();
			if (!resp2.ok) throw new Error(pb?.error || 'Gagal membuat pembelian');

			// --- Sukses -> patch preview supaya item tidak "missing" lagi ---
			it.barang_id = barang.barang_id;
			it.match_name = barang.nama_barang;
			it.match_price = barang.harga_jual;
			it.score = 1.0;
			it.note = `Dibuat & dibelikan ${qty} @ Rp ${hb.toLocaleString()}`;
			previewData = { ...previewData };
		} catch (err) {
			alert(err.message || 'Gagal membuat barang baru + pembelian');
		} finally {
			setCreating(key, false);
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
		<div class="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
			<div class="mb-3 flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if mode !== 'menu'}
						<button
							type="button"
							class="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
							on:click={() => (mode = 'menu')}
							aria-label="Kembali ke menu"
						>
							⬅ Menu
						</button>
					{/if}
					<h3 class="text-lg font-semibold">
						{mode === 'menu'
							? 'Tambah Transaksi'
							: mode === 'pembelian'
								? 'Form Pembelian'
								: mode === 'beban'
									? 'Form Beban'
									: mode === 'equity'
										? 'Form Modal / Prive'
										: 'Upload Penjualan dari TXT'}
					</h3>
				</div>

				<button
					class="text-xl text-gray-500 hover:text-red-500"
					on:click={closeAndReset}
					aria-label="Tutup">&times;</button
				>
			</div>

			{#if mode === 'menu'}
				<!-- 🎨 Card-style -->
				<div class="grid grid-cols-2 gap-3">
					<button
						type="button"
						class="group rounded-xl border border-gray-200 p-4 text-left transition hover:border-indigo-300 hover:shadow-sm"
						on:click={() => (mode = 'pembelian')}
					>
						<div class="flex items-start gap-3">
							<div class="rounded-lg bg-indigo-100 p-2 text-xl">🛒</div>
							<div>
								<div class="font-semibold text-gray-800 group-hover:text-indigo-700">Pembelian</div>
								<div class="text-xs text-gray-500">Input stok masuk + jurnal</div>
							</div>
						</div>
					</button>

					<button
						type="button"
						class="group rounded-xl border border-gray-200 p-4 text-left transition hover:border-rose-300 hover:shadow-sm"
						on:click={() => (mode = 'beban')}
					>
						<div class="flex items-start gap-3">
							<div class="rounded-lg bg-rose-100 p-2 text-xl">💸</div>
							<div>
								<div class="font-semibold text-gray-800 group-hover:text-rose-700">Beban</div>
								<div class="text-xs text-gray-500">Gaji, Listrik/Air, Transport</div>
							</div>
						</div>
					</button>

					<button
						type="button"
						class="group rounded-xl border border-gray-200 p-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
						on:click={() => (mode = 'equity')}
					>
						<div class="flex items-start gap-3">
							<div class="rounded-lg bg-emerald-100 p-2 text-xl">💰</div>
							<div>
								<div class="font-semibold text-gray-800 group-hover:text-emerald-700">
									Modal / Prive
								</div>
								<div class="text-xs text-gray-500">Setoran modal & pengambilan</div>
							</div>
						</div>
					</button>

					<button
						type="button"
						class="group rounded-xl border border-dashed border-gray-300 p-4 text-left transition hover:border-sky-300 hover:shadow-sm"
						on:click={() => (mode = 'txt')}
					>
						<div class="flex items-start gap-3">
							<div class="rounded-lg bg-sky-100 p-2 text-xl">📄</div>
							<div>
								<div class="font-semibold text-gray-800 group-hover:text-sky-700">
									Penjualan dari TXT
								</div>
								<div class="text-xs text-gray-500">Proses TXT → CSV + jurnal</div>
							</div>
						</div>
					</button>
				</div>
			{:else if mode === 'pembelian'}
				<PembelianForm on:success={handleDone} />
			{:else if mode === 'beban'}
				<ExpenseForm on:success={handleDone} />
			{:else if mode === 'equity'}
				<EquityForm on:success={handleDone} />
			{:else if mode === 'txt'}
				<div class="space-y-3 text-sm">
					<p>
						Pilih file TXT penjualan Anda. Sistem akan: (1) ekstrak transaksi, (2) buat jurnal
						otomatis.
					</p>
					<input
						type="file"
						accept=".txt"
						on:change={handleTxt}
						class="w-full rounded border px-3 py-2"
					/>
					<button
						class="rounded bg-gray-200 px-3 py-1.5"
						on:click={() => (mode = 'menu')}
						disabled={isProcessing}
					>
						{isProcessing ? 'Memproses...' : 'Kembali'}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if previewOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
		<div class="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
			<div class="mb-3 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Preview Penjualan (TXT)</h3>
				<div class="flex items-center gap-2">
					<label class="text-xs text-gray-500">Rasio HB/HJ:</label>
					<input
						type="number"
						min="0"
						max="1"
						step="0.05"
						class="w-20 rounded border px-2 py-1 text-xs"
						bind:value={defaultBuyRatio}
					/>
				</div>

				<button
					class="text-xl text-gray-500 hover:text-red-500"
					on:click={() => (previewOpen = false)}>&times;</button
				>
			</div>

			{#if hasDuplicate || missingCount}
				<div class="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{#if hasDuplicate}• Ada transaksi <b>duplikat</b> (tanggal + RefNo). Perbaiki RefNo pada
						TXT terlebih dulu.<br />{/if}
					{#if missingCount}• Ada <b>{missingCount}</b> item yang <b>tidak ditemukan</b> di master barang.
						Tambah/mapping dulu barangnya.{/if}
				</div>
			{/if}

			<div class="max-h-[60vh] overflow-auto text-sm">
				{#each previewData?.transactions ?? [] as t, idx}
					<div class="mb-4 rounded-lg border p-3">
						<div class="mb-1 flex flex-wrap gap-3">
							<div><span class="font-medium">Tanggal:</span> {t.tanggal} {t.jam}</div>
							<div><span class="font-medium">Metode:</span> {t.metode}</div>
							<div>
								<span class="font-medium">Subtotal:</span> Rp {t.subtotal?.toLocaleString?.() ??
									t.subtotal}
							</div>
							<div>
								<span class="font-medium">Bayar:</span> Rp {t.bayar?.toLocaleString?.() ?? t.bayar}
							</div>
							<div>
								<span class="font-medium">Kembalian:</span> Rp {t.kembalian?.toLocaleString?.() ??
									t.kembalian}
							</div>
							<div class={t.duplicate ? 'font-semibold text-red-600' : 'text-gray-500'}>
								{t.duplicate ? 'DUPLIKAT (tanggal+refno sama)' : `RefNo: ${t.ref_no || '-'}`}
							</div>
						</div>
						<table class="w-full border text-xs">
							<thead class="bg-gray-100">
								<tr>
									<th class="p-2 text-left">Item</th>
									<th class="p-2">Qty</th>
									<th class="p-2">Harga</th>
									<th class="p-2 text-left">Match</th>
									<th class="p-2 text-left">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{#each t.items as it, i}
									<tr class="border-t">
										<td class="p-2">{it.src_nama}</td>
										<td class="p-2 text-center">{it.qty}</td>
										<td class="p-2 text-right">Rp {it.price?.toLocaleString?.() ?? it.price}</td>
										<td class="p-2">
											{#if it.barang_id}
												<div>
													<div class="font-medium">#{it.barang_id} — {it.match_name}</div>
													{#if it.score}<div class="text-gray-500">
															similarity: {(it.score * 100).toFixed(0)}%
														</div>{/if}
													{#if it.match_price}<div class="text-gray-500">
															harga_jual: Rp {it.match_price}
														</div>{/if}
												</div>
											{:else}
												<span class="font-semibold text-red-600">Tidak ditemukan</span>
												{#if it.note}<span class="text-gray-500"> — {it.note}</span>{/if}
											{/if}
										</td>
										<td class="p-2">
											{#if it.barang_id}
												<div class="flex flex-wrap items-center gap-2">
													<span class="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
														>Pakai hasil match</span
													>
													<button
														type="button"
														class="rounded bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600 disabled:opacity-50"
														on:click={() => createNewItem(idx, i)}
														disabled={creatingMap.get(`${idx}:${i}`) || isCooling(`${idx}:${i}`)}
													>
														{creatingMap.get(`${idx}:${i}`)
															? 'Memproses...'
															: `Buat barang baru (HB≈${Math.round(unitPrice(it) * defaultBuyRatio).toLocaleString()})`}
													</button>
												</div>
											{:else}
												<div class="flex flex-col gap-1">
													<span class="text-sm font-medium text-red-600">Tidak ditemukan</span>
													<button
														type="button"
														class="rounded bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600"
														on:click={() => createNewItem(idx, i)}
													>
														Buat barang baru (HB≈{Math.round(
															unitPrice(it) * defaultBuyRatio
														).toLocaleString()})
													</button>
													<small class="text-gray-500">
														HJ: Rp {unitPrice(it).toLocaleString()} · HB default {Math.round(
															defaultBuyRatio * 100
														)}% dr HJ
													</small>
												</div>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/each}
			</div>

			<div class="mt-4 flex justify-end gap-2">
				<button class="rounded border px-3 py-1.5" on:click={() => (previewOpen = false)}
					>Batal</button
				>
				<button
					class="rounded bg-indigo-600 px-4 py-1.5 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
					on:click={commitTxt}
					disabled={isProcessing || hasDuplicate || missingCount > 0}
				>
					{#if hasDuplicate}
						Perbaiki RefNo Duplikat
					{:else if missingCount > 0}
						Perbaiki {missingCount} Item
					{:else}
						Commit ke Jurnal
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
