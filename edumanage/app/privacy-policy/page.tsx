export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-16">
      <h1 className="text-4xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="mt-4 text-slate-700">EduManage is an internship demonstration project. It stores account and school records in the PostgreSQL database configured by the deployment owner.</p>
      <p className="mt-4 text-slate-700">Only use fictional or authorised data in a local demonstration. The project does not make claims about regulatory compliance, monitoring, encryption, or production retention policies.</p>
      <p className="mt-4 text-slate-700">For questions, contact the address configured through <code>NEXT_PUBLIC_CONTACT_EMAIL</code>.</p>
    </main>
  );
}
