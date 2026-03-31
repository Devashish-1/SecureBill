import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-8">
        
        <div className="flex flex-col items-center space-y-4 text-center">
            <div className="p-4 bg-indigo-500/10 rounded-full ring-1 ring-indigo-500/30 mb-4">
                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
                Secure<span className="text-indigo-400">Bill</span> India
            </h1>
            <p className="max-w-[600px] text-lg text-slate-300">
                The most secure post-payment billing engine. Fully compliant with Indian GST norms and AWS architectural best practices.
            </p>
        </div>

        <div className="w-full max-w-md mt-10">
          <form className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-xl flex flex-col gap-6 w-full">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Merchant ID</label>
              <input 
                type="text" 
                defaultValue="merch_1029381"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">JWT Secret / Password</label>
              <input 
                type="password" 
                defaultValue="••••••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
            
            <Link 
              href="/dashboard/invoices"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-lg text-center transition-all mt-4 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(79,70,229,0.3)]"
            >
              Secure Login via AWS Cognito
            </Link>
          </form>
        </div>

      </div>
    </main>
  );
}
