import { AdminDashboard } from "@/components/admin-dashboard";
import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Админ - Код Хэвлэх</h1>
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
            Нүүр хуудас
          </Link>
        </div>
        <AdminDashboard />
      </div>
    </main>
  );
}
