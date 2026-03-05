import { SubmitForm } from "@/components/submit-form";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">NUM Print</h1>
          <p className="mt-2 text-gray-600">
            Кодоо хуулж тавиад илгээнэ үү
          </p>
        </div>
        <SubmitForm />
        <div className="mt-6 text-center">
          <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600">
            Админ
          </Link>
        </div>
      </div>
    </main>
  );
}
