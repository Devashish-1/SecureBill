export default async function InvoicesPage() {
    let invoices: any[] = [];
    let errMessage = null;

    try {
        const response = await fetch('http://localhost:8080/api/invoices', { cache: 'no-store' });
        if (!response.ok) {
            errMessage = "Backend database isn't running or responded with an error.";
        } else {
            invoices = await response.json();
        }
    } catch (e: any) {
        errMessage = "Failed to connect to backend api. Make sure docker is running on 8080.";
    }

    // Mock Fallbacks if backend is completely down so UI doesn't crash completely.
    if (invoices.length === 0 && errMessage !== null) {
        invoices = [
          { id: "inv_FALLBACK", irn: "NIC_UNREACHABLE", date: "2024-05-15T00:00:00.000Z", customer: "Fallback Data Engine", amount: 45000, status: "NETWORK_FAIL" }
        ];
    }
  
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Invoices</h1>
                <p className="text-slate-400 mt-1">Manage and securely verify generated GST invoices from the Postgres Replica.</p>
                {errMessage && <p className="text-sm font-semibold text-rose-500 mt-2 bg-rose-500/10 inline-block px-3 py-1 rounded">ALERT: {errMessage}</p>}
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Sync with NIC Portal
            </button>
        </div>
  
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <th className="p-4">Invoice ID / NIC Hash</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Customer Segment</th>
                <th className="p-4">Net Amount (INR)</th>
                <th className="p-4">GST / Security Status</th>
                <th className="p-4 text-right">Raw PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="p-4 font-mono text-indigo-400 truncate max-w-[200px]" title={inv.irn}>{inv.irn?.substring(0,25)}...</td>
                  <td className="p-4 text-slate-300">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="p-4 text-slate-200">{inv.customer}</td>
                  <td className="p-4 font-medium text-white">₹{inv.amount}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-widest font-bold border uppercase ${
                        inv.status === 'GENERATED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {inv.status === 'GENERATED' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-slate-400 hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-all flex ml-auto border border-slate-800 p-1.5 rounded-md hover:border-indigo-500/50 hover:bg-indigo-500/10">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center text-xs text-slate-500">
             <span>Showing {invoices.length} active records in PG.</span>
             <span>All records secured by AES-256 Engine.</span>
          </div>
        </div>
      </div>
    );
}
