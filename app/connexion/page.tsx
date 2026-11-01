'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/client';

export default function Connexion() {
  const router = useRouter();
const [sessionVerifiee, setSessionVerifiee] = useState(false);

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(false);
  const [verification, setVerification] = useState(true);

  useEffect(() => {
    async function verifierSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.replace('/');
        return;
      }

      setVerification(false);
    }

    verifierSession();
  }, [router]);

  async function seConnecter(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();

    setMessage('');
    setChargement(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: motDePasse,
    });

    if (error) {
      setMessage(
        "Adresse e-mail ou mot de passe incorrect. Vérifie les informations saisies."
      );
      setChargement(false);
      return;
    }

    router.replace('/');
    router.refresh();
  }

  if (verification) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <p className="text-sm text-slate-300">
          Vérification de la connexion…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="mb-8">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-3xl">
            💰
          </div>

          <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
            Mon Budget
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Connexion
          </h1>

          <p className="mt-3 text-slate-400">
            Connecte-toi pour retrouver ton solde, tes prélèvements et tes dépenses.
          </p>
        </div>

        <form
          onSubmit={seConnecter}
          className="rounded-3xl bg-white p-5 text-slate-950 shadow-2xl"
        >
          <label
            htmlFor="email"
            className="block text-sm font-bold"
          >
            Adresse e-mail
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(evenement) => setEmail(evenement.target.value)}
            placeholder="Ton adresse e-mail"
            required
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
          />

          <label
            htmlFor="motDePasse"
            className="mt-5 block text-sm font-bold"
          >
            Mot de passe
          </label>

          <input
            id="motDePasse"
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={(evenement) =>
              setMotDePasse(evenement.target.value)
            }
            placeholder="Ton mot de passe"
            required
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
          />

          {message && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="mt-6 w-full rounded-xl bg-yellow-400 p-4 font-black text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {chargement
              ? 'Connexion en cours…'
              : 'Se connecter'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Tes informations sont protégées par ton compte personnel.
        </p>
      </div>
    </main>
  );
}
