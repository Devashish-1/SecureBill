export default function AuditPage() {
    const logs = [
        { time: "2 minutes ago", event: "Webhook signature verified", actor: "API Gateway -> backend/src/controllers/webhook", severity: "INFO" },
        { time: "5 minutes ago", event: "Generated 15-minute Presigned URL", actor: "Merchant (IP: 103.44.xx.xx)", severity: "WARN" },
        { time: "1 hour ago", event: "KMS Envelope Decryption Success", actor: "RDS PostgreSQL Engine", severity: "INFO" },
        { time: "2 hours ago", event: "Blocked Potential SQLi Pattern", actor: "AWS WAF", severity: "CRITICAL" }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="border border-red-900/50 bg-red-500/5 p-6 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>
                <h2 className="text-xl font-bold text-red-500 flex items-center gap-2 mb-2">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> 
                   GuardDuty Alerts
                </h2>
                <p className="text-red-300 text-sm">No anomalous data access patterns detected in the last 24 hours.</p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-800 pb-2">Immutable CloudTrail Timeline</h3>
                
                <div className="relative pl-6 border-l-2 border-slate-800 space-y-8 mt-6">
                    {logs.map((log, i) => (
                        <div key={i} className="relative">
                            <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-4 border-slate-950 ${
                                log.severity === 'CRITICAL' ? 'bg-red-500' : 
                                log.severity === 'WARN' ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}></span>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-slate-200">{log.event}</h4>
                                    <span className="text-xs text-slate-500 font-mono">{log.time}</span>
                                </div>
                                <p className="text-sm text-slate-400 font-mono">Actor: {log.actor}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
