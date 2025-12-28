"use client";

import React from "react";
import {
    Receipt,
    Calendar,
    Download,
    Loader2
} from "lucide-react";
import { downloadReceiptAsPDF } from "@/lib/pdfUtils";
import { toast } from "sonner";

export default function BillingHistory({ billingHistory, theme }) {
    if (!billingHistory || billingHistory.length === 0) {
        return (
            <div className={`p-8 rounded-2xl border border-dashed text-center ${theme === 'dark' ? "bg-gray-800/20 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <Receipt size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">No transactions found</p>
            </div>
        );
    }

    const handleDownload = async (entry) => {
        try {
            toast.loading("Generating receipt...");
            await downloadReceiptAsPDF(entry);
            toast.dismiss();
            toast.success("Receipt downloaded");
        } catch (e) {
            console.error("Download failed", e);
            toast.dismiss();
            toast.error("Failed to download receipt");
        }
    };

    return (
        <div className="space-y-3">
            {billingHistory.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)).map((entry, idx) => (
                <div key={entry.reference || idx} className={`p-4 rounded-2xl border ${theme === 'dark' ? "bg-gray-800 border-gray-700 hover:bg-gray-700/50" : "bg-white border-gray-100 hover:bg-gray-50"} flex items-center justify-between transition-colors`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? "bg-gray-700 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                            <Calendar size={18} />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-bold tracking-tight uppercase">
                                {entry.plan} {entry.billingCycle}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                {new Date(entry.paidAt || entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: entry.currency || 'USD' }).format(entry.amount)}
                            </div>
                            <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Success</div>
                        </div>

                        <button
                            onClick={() => handleDownload(entry)}
                            className={`p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center ${theme === 'dark' ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                            title="Download Receipt"
                        >
                            <Download size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
