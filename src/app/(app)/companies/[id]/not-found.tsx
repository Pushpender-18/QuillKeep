import Link from 'next/link';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function CompanyNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#161618]/90 backdrop-blur-xl border border-white/[0.12] rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-[#FF453A]/15 border border-[#FF453A]/30 flex items-center justify-center text-[#FF453A] mb-4 shadow-sm">
          <FileQuestion className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-semibold text-white tracking-tight mb-2">
          Company Not Found
        </h1>
        <p className="text-sm text-[#8E8E93] mb-6">
          This company no longer exists or may have been permanently deleted.
        </p>
        <Link
          href="/companies"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A84FF] hover:bg-[#0077ED] text-white text-xs font-semibold transition duration-150 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Companies
        </Link>
      </div>
    </div>
  );
}
