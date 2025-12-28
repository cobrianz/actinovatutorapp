"use client";

import React, { useState, useEffect } from "react";
import {
    Receipt,
    Calendar,
    Download,
    Loader2
} from "lucide-react";

export default function BillingHistory({ billingHistory, theme }) {
    const [LinkComponent, setLinkComponent] = useState(null);
    const [DocumentComponent, setDocumentComponent] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Dynamically import only on the client
        const loadPdfComponents = async () => {
            try {
                const [pdfMod, docMod] = await Promise.all([
                    import("@react-pdf/renderer"),
                    import("./ReceiptDocument")
                ]);

                setLinkComponent(() => pdfMod.PDFDownloadLink);
                setDocumentComponent(() => docMod.default);
                setIsLoaded(true);
            } catch (error) {
                console.error("Error loading PDF components:", error);
            }
        };

        loadPdfComponents();
    }, []);

    if (!billingHistory || billingHistory.length === 0) {
        return (
            <div className={`p-8 rounded-2xl border border-dashed text-center ${theme === 'dark' ? "bg-gray-800/20 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <Receipt size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">No transactions found</p>
            </div>
        );
    }

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

                        {(isLoaded && DocumentComponent) && (
                            <div className="flex items-center gap-2">
                                {/* Web Download Link (Hidden on Mobile) */}
                                <div className="hidden md:block">
                                    {LinkComponent && (
                                        <LinkComponent
                                            document={<DocumentComponent transaction={entry} />}
                                            fileName={`receipt-${entry.reference}.pdf`}
                                            className={`p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center ${theme === 'dark' ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                                        >
                                            {({ loading }) => (
                                                loading ? (
                                                    <Loader2 size={18} className="animate-spin opacity-50" />
                                                ) : (
                                                    <Download size={18} />
                                                )
                                            )}
                                        </LinkComponent>
                                    )}
                                </div>

                                {/* Mobile Save/Share Button (Shown on Mobile) */}
                                <button
                                    onClick={async () => {
                                        try {
                                            const { pdf } = await import("@react-pdf/renderer");
                                            const blob = await pdf(<DocumentComponent transaction={entry} />).toBlob();
                                            const reader = new FileReader();
                                            reader.readAsDataURL(blob);
                                            reader.onloadend = async () => {
                                                const base64data = reader.result.split(',')[1];
                                                try {
                                                    const isNative = typeof window !== 'undefined' &&
                                                        (window.Capacitor?.isNative || window.location.protocol === 'capacitor:');

                                                    if (!isNative) {
                                                        const url = window.URL.createObjectURL(blob);
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.download = `receipt-${entry.reference}.pdf`;
                                                        link.click();
                                                        window.URL.revokeObjectURL(url);
                                                        return;
                                                    }

                                                    const { Filesystem, Directory } = await import('@capacitor/filesystem').catch(() => ({}));
                                                    const { Share } = await import('@capacitor/share').catch(() => ({}));
                                                    const { LocalNotifications } = await import('@capacitor/local-notifications').catch(() => ({}));

                                                    const fileName = `receipt-${entry.reference}.pdf`;
                                                    const result = await Filesystem.writeFile({
                                                        path: fileName,
                                                        data: base64data,
                                                        directory: Directory.Cache
                                                    });

                                                    if (LocalNotifications) {
                                                        await LocalNotifications.schedule({
                                                            notifications: [{
                                                                title: 'Receipt Downloaded',
                                                                body: `Receipt for ${entry.plan} has been saved.`,
                                                                id: Math.floor(Math.random() * 100000),
                                                                schedule: { at: new Date(Date.now() + 100) },
                                                                sound: null,
                                                                attachments: null,
                                                                actionTypeId: "",
                                                                extra: null
                                                            }]
                                                        });
                                                    }

                                                    await Share.share({
                                                        title: 'Receipt Download',
                                                        text: `Receipt for ${entry.plan}`,
                                                        url: result.uri,
                                                        dialogTitle: 'Open Receipt'
                                                    });
                                                } catch (err) {
                                                    console.error("Native save error", err);
                                                    // Final fallback for any error
                                                    const url = window.URL.createObjectURL(blob);
                                                    const link = document.createElement('a');
                                                    link.href = url;
                                                    link.download = `receipt-${entry.reference}.pdf`;
                                                    link.click();
                                                    window.URL.revokeObjectURL(url);
                                                }
                                            };
                                        } catch (e) {
                                            console.error("Download handling error", e);
                                        }
                                    }}
                                    className={`md:hidden flex items-center p-2 rounded-xl bg-indigo-600 text-white active:scale-95 transition-all`}
                                    title="Download Receipt"
                                >
                                    <Download size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
