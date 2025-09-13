<script>
	import { onMount } from 'svelte';
	import ApexRaw from './ApexRaw.svelte';
	import { API_BASE_URL } from '../api/apiconfigs';

	const API = API_BASE_URL;

	let selectedYear = new Date().getFullYear();
	let selectedMonth = String(new Date().getMonth() + 1).padStart(2, '0');

	let summary = {
		revenue: 0,
		expense: 0,
		cogs: 0,
		netIncome: 0,
		cashBank: 0,
		inventory: 0,
		beginInv: 0,
		purchases: 0,
		endInv: 0
	};
	let incomeTrend = []; // [{month, revenue, expense, cogs, netIncome}]
	let expenseBreakdown = []; // [{name, amount}]
	let topProducts = []; // [{name, qty}]
	let inoutTrend = []; // [{month, inQty, outQty}]

	const mLabel = (m) => new Date(2000, m - 1, 1).toLocaleString('id-ID', { month: 'short' });
	const fmt = (n) => (Number(n) || 0).toLocaleString('id-ID');

	async function loadAll() {
		const [s, t, e, p, io] = await Promise.all([
			fetch(`${API}/api/dashboard/summary?year=${selectedYear}&month=${+selectedMonth}`).then((r) =>
				r.json()
			),
			fetch(`${API}/api/dashboard/income-trend?year=${selectedYear}`).then((r) => r.json()),
			fetch(
				`${API}/api/dashboard/expense-breakdown?year=${selectedYear}&month=${+selectedMonth}`
			).then((r) => r.json()),
			fetch(
				`${API}/api/dashboard/top-products?year=${selectedYear}&month=${+selectedMonth}&limit=5`
			).then((r) => r.json()),
			fetch(`${API}/api/dashboard/qty-inout-trend?year=${selectedYear}`).then((r) => r.json())
		]);
		summary = s;
		incomeTrend = t;
		expenseBreakdown = e;
		topProducts = p;
		inoutTrend = io;

		console.log({ summary, t, e, p, io });
	}

	onMount(loadAll);
</script>

<div class="min-h-screen bg-gray-100 p-6">
	<div class="mx-auto max-w-6xl rounded bg-white p-6 shadow-md">
		<div class="mb-6 flex flex-wrap items-end gap-4">
			<!-- Tahun -->
			<div class="flex flex-col">
				<label for="year" class="text-xs font-medium tracking-wide text-gray-600 uppercase">
					Tahun
				</label>
				<div class="relative">
					<select
						id="year"
						bind:value={selectedYear}
						on:change={loadAll}
						class="w-[110px] appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					>
						{#each Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i) as y}
							<option value={y}>{y}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Bulan -->
			<div class="flex flex-col">
				<label for="month" class="text-xs font-medium tracking-wide text-gray-600 uppercase">
					Bulan
				</label>
				<div class="relative">
					<select
						id="month"
						bind:value={selectedMonth}
						on:change={loadAll}
						class="w-40 appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
					>
						{#each Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')) as m}
							<option value={m}>
								{new Date(2000, +m - 1, 1).toLocaleString('id-ID', { month: 'long' })}
							</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- KPI -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-500">Revenue (Bulan ini)</div>
				<div class="text-2xl font-semibold">Rp {fmt(summary.revenue)}</div>
			</div>
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-500">COGS (Bulan ini)</div>
				<div class="text-2xl font-semibold">Rp {fmt(summary.cogs)}</div>
			</div>
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-500">Net Income (Bulan ini)</div>
				<div class="text-2xl font-semibold">Rp {fmt(summary.netIncome)}</div>
			</div>
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-500">Kas & Bank</div>
				<div class="text-2xl font-semibold">Rp {fmt(summary.cashBank)}</div>
			</div>
		</div>

		<!-- COGS Card -->
		<div class="mt-4 grid gap-4 sm:grid-cols-3">
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-500">Beginning Inventory</div>
				<div class="text-xl font-semibold">Rp {fmt(summary.beginInv)}</div>
			</div>
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-500">Purchases</div>
				<div class="text-xl font-semibold">Rp {fmt(summary.purchases)}</div>
			</div>
			<div class="rounded-lg border p-4">
				<div class="text-sm text-gray-500">Ending Inventory</div>
				<div class="text-xl font-semibold">Rp {fmt(summary.endInv)}</div>
			</div>
		</div>

		<!-- Revenue vs Expense -->
		<div class="mt-6 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Revenue vs Expense (Tahunan)</div>
			<ApexRaw
				type="line"
				height={280}
				options={{
					xaxis: { categories: incomeTrend.map((d) => mLabel(d.month)) },
					dataLabels: { enabled: false },
					stroke: { curve: 'smooth' },
					tooltip: { y: { formatter: (v) => 'Rp ' + fmt(v) } }
				}}
				series={[
					{ name: 'Revenue', data: incomeTrend.map((d) => d.revenue || 0) },
					{ name: 'Expense', data: incomeTrend.map((d) => d.expense || 0) }
				]}
			/>
		</div>

		<!-- Expense Breakdown + Top Products -->
		<div class="mt-6 grid gap-4 lg:grid-cols-2">
			<div class="rounded-lg border p-4">
				<div class="mb-2 font-semibold">Expense Breakdown (Bulan ini)</div>
				<ApexRaw
					type="donut"
					height={320}
					options={{
						labels: expenseBreakdown.map((x) => x.name),
						legend: { position: 'bottom' },
						tooltip: { y: { formatter: (v) => 'Rp ' + fmt(v) } }
					}}
					series={expenseBreakdown.map((x) => x.amount || 0)}
				/>
			</div>

			<div class="rounded-lg border p-4">
				<div class="mb-2 font-semibold">Top 5 Produk Terjual (Bulan ini)</div>
				<ApexRaw
					type="bar"
					height={320}
					options={{
						xaxis: { categories: topProducts.map((x) => x.name) },
						plotOptions: { bar: { horizontal: true } },
						tooltip: { y: { formatter: (v) => fmt(v) + ' unit' } }
					}}
					series={[{ name: 'Qty', data: topProducts.map((x) => x.qty || 0) }]}
				/>
			</div>
		</div>

		<!-- Qty Purchases vs Sales (stacked) -->
		<div class="mt-6 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Pembelian vs Penjualan (Qty / Bulanan)</div>
			<ApexRaw
				type="bar"
				height={300}
				options={{
					xaxis: { categories: inoutTrend.map((d) => mLabel(d.month)) },
					plotOptions: { bar: { stacked: true } },
					tooltip: { y: { formatter: (v) => fmt(v) + ' unit' } }
				}}
				series={[
					{ name: 'Pembelian (Masuk)', data: inoutTrend.map((d) => d.inQty || 0) },
					{ name: 'Penjualan (Keluar)', data: inoutTrend.map((d) => d.outQty || 0) }
				]}
			/>
		</div>
	</div>
</div>
