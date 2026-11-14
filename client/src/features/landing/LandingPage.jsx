import { Link } from "react-router-dom";
import ApiStatus from "../../components/ApiStatus.jsx";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link className="font-semibold tracking-tight" to="/">Campus Open Source</Link>
          <span className="text-sm text-slate-600">Development setup</span>
        </nav>
      </header>
      <main className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section>
          <p className="text-sm font-semibold text-blue-700">Campus projects, built together</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Campus Open Source
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            This development scaffold connects the React client to the Express API. Project workflows will be added in later phases.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="inline-flex min-h-11 items-center rounded-md bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" href="#connection">
              View system status
            </a>
          </div>
        </section>
        <div id="connection" className="scroll-mt-8">
          <ApiStatus />
        </div>
      </main>
    </div>
  );
}