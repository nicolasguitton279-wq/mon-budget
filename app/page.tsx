'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/client';

type Prelevement = {
  id: number;
  nom: string;
  montant: number;
  paye: boolean;
};

type Depense = {
  id: number;
  nom: string;
  montant: number;
};

const prelevementsInitiaux: Prelevement[] = [
  {
    id: 1,
    nom: 'Loyer',
    montant: 841.46,
    paye: true,
  },
  {
    id: 2,
    nom: 'Électricité',
    montant: 162,
    paye: false,
  },
  {
    id: 3,
    nom: 'Eau',
    montant: 71,
    paye: false,
  },
  {
    id: 4,
    nom: 'Internet',
    montant: 29.99,
    paye: false,
  },
];

export default function Home() {
  const router = useRouter();

  const [sessionVerifiee, setSessionVerifiee] = useState(false);
  const [donneesChargees, setDonneesChargees] = useState(false);

  const [solde, setSolde] = useState(3500);

  const [prelevements, setPrelevements] =
    useState<Prelevement[]>(prelevementsInitiaux);

  const [depenses, setDepenses] = useState<Depense[]>([]);

  const [afficherFormulaire, setAfficherFormulaire] =
    useState(false);

  const [nomDepense, setNomDepense] = useState('');
  const [montantDepense, setMontantDepense] = useState('');
  const [messageErreur, setMessageErreur] = useState('');

  const moisActuel = new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
  })
    .format(new Date())
    .toUpperCase();

  /*
   * Vérification de la connexion Supabase.
   * Si aucune session n'existe, l'utilisateur est envoyé
   * vers la page de connexion.
   */
  useEffect(() => {
    let composantActif = true;

    async function verifierConnexion() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!composantActif) {
        return;
      }

      if (error || !session) {
        router.replace('/connexion');
        return;
      }

      setSessionVerifiee(true);
    }

    verifierConnexion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setSessionVerifiee(false);
        router.replace('/connexion');
        return;
      }

      setSessionVerifiee(true);
    });

    return () => {
      composantActif = false;
      subscription.unsubscribe();
    };
  }, [router]);

  /*
   * Chargement des données enregistrées dans le navigateur.
   * Cette sauvegarde locale sera ensuite remplacée par Supabase.
   */
  useEffect(() => {
    if (!sessionVerifiee) {
      return;
    }

    try {
      const donneesEnregistrees =
        localStorage.getItem('mon-budget');

      if (donneesEnregistrees) {
        const budget = JSON.parse(donneesEnregistrees);

        if (typeof budget.solde === 'number') {
          setSolde(budget.solde);
        }

        if (Array.isArray(budget.prelevements)) {
          setPrelevements(budget.prelevements);
        }

        if (Array.isArray(budget.depenses)) {
          setDepenses(budget.depenses);
        }
      }
    } catch (error) {
      console.error(
        'Impossible de charger les données enregistrées :',
        error
      );
    } finally {
      setDonneesChargees(true);
    }
  }, [sessionVerifiee]);

  /*
   * Sauvegarde automatique dans le navigateur.
   */
  useEffect(() => {
    if (!sessionVerifiee || !donneesChargees) {
      return;
    }

    try {
      localStorage.setItem(
        'mon-budget',
        JSON.stringify({
          solde,
          prelevements,
          depenses,
        })
      );
    } catch (error) {
      console.error(
        'Impossible de sauvegarder les données :',
        error
      );
    }
  }, [
    solde,
    prelevements,
    depenses,
    sessionVerifiee,
    donneesChargees,
  ]);

  const totalRestantPrelevements = prelevements
    .filter((prelevement) => !prelevement.paye)
    .reduce(
      (total, prelevement) =>
        total + prelevement.montant,
      0
    );

  const totalDepenses = depenses.reduce(
    (total, depense) => total + depense.montant,
    0
  );

  const resteAVivre =
    solde - totalRestantPrelevements - totalDepenses;

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(montant);
  };

  const modifierPrelevement = (id: number) => {
    setPrelevements((listeActuelle) =>
      listeActuelle.map((prelevement) =>
        prelevement.id === id
          ? {
              ...prelevement,
              paye: !prelevement.paye,
            }
          : prelevement
      )
    );
  };

  const ajouterDepense = (
    evenement: FormEvent<HTMLFormElement>
  ) => {
    evenement.preventDefault();

    setMessageErreur('');

    const montantTransforme = montantDepense
      .trim()
      .replace(/\s/g, '')
      .replace(',', '.');

    const montant = Number(montantTransforme);

    if (!nomDepense.trim()) {
      setMessageErreur(
        'Indique le nom de la dépense.'
      );
      return;
    }

    if (!Number.isFinite(montant) || montant <= 0) {
      setMessageErreur(
        'Indique un montant supérieur à zéro.'
      );
      return;
    }

    const nouvelleDepense: Depense = {
      id: Date.now(),
      nom: nomDepense.trim(),
      montant,
    };

    setDepenses((listeActuelle) => [
      ...listeActuelle,
      nouvelleDepense,
    ]);

    setNomDepense('');
    setMontantDepense('');
    setMessageErreur('');
    setAfficherFormulaire(false);
  };

  const supprimerDepense = (id: number) => {
    setDepenses((listeActuelle) =>
      listeActuelle.filter(
        (depense) => depense.id !== id
      )
    );
  };

  /*
   * Déconnexion Supabase.
   */
  const seDeconnecter = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(
        'Erreur pendant la déconnexion :',
        error
      );
      return;
    }

    setSessionVerifiee(false);
    router.replace('/connexion');
    router.refresh();
  };

  /*
   * Écran affiché pendant la vérification de la session
   * et le chargement des données.
   */
  if (!sessionVerifiee || !donneesChargees) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-3xl">
            💰
          </div>

          <p className="mt-5 text-sm font-semibold text-white">
            Chargement de Mon Budget…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 pb-16 text-slate-900">
      <div className="mx-auto max-w-md">
        <header className="bg-slate-950 px-5 pb-8 pt-8 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Bonjour Nicolas
            </p>

            <button
              type="button"
              onClick={seDeconnecter}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-900"
            >
              Déconnexion
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">
              Mon Budget
            </h1>

            <div className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-950">
              {moisActuel}
            </div>
          </div>

          <div className="mt-7">
            <label
              htmlFor="solde"
              className="text-sm font-medium text-slate-400"
            >
              Solde actuel du compte
            </label>

            <div className="mt-1 flex items-center">
              <input
                id="solde"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={solde}
                onChange={(evenement) => {
                  const nouvelleValeur = Number(
                    evenement.target.value
                  );

                  setSolde(
                    Number.isFinite(nouvelleValeur)
                      ? nouvelleValeur
                      : 0
                  );
                }}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-4xl font-bold text-white outline-none"
              />

              <span className="ml-2 text-3xl font-bold">
                €
              </span>
            </div>
          </div>
        </header>

        <section className="-mt-4 px-4">
          <div className="rounded-3xl bg-yellow-400 p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-700">
              Reste à vivre
            </p>

            <p
              className={`mt-1 break-words text-4xl font-black ${
                resteAVivre < 0
                  ? 'text-red-700'
                  : 'text-slate-950'
              }`}
            >
              {formatMontant(resteAVivre)}
            </p>

            <p className="mt-2 text-sm text-slate-700">
              Après les prélèvements restants et les
              dépenses ajoutées
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 px-4 py-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              À payer
            </p>

            <p className="mt-2 break-words text-xl font-bold">
              {formatMontant(totalRestantPrelevements)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Dépenses
            </p>

            <p className="mt-2 break-words text-xl font-bold">
              {formatMontant(totalDepenses)}
            </p>
          </div>
        </section>

        <section className="px-4">
          <div className="mb-3">
            <h2 className="text-lg font-bold">
              Prélèvements
            </h2>

            <p className="text-sm text-slate-500">
              Coche ceux qui sont déjà passés
            </p>
          </div>

          <div className="space-y-2">
            {prelevements.map((prelevement) => (
              <label
                key={prelevement.id}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 shadow-sm ${
                  prelevement.paye
                    ? 'border-green-200 bg-green-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={prelevement.paye}
                  onChange={() =>
                    modifierPrelevement(prelevement.id)
                  }
                  className="h-6 w-6 shrink-0 accent-green-600"
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate font-semibold ${
                      prelevement.paye
                        ? 'text-slate-500 line-through'
                        : 'text-slate-900'
                    }`}
                  >
                    {prelevement.nom}
                  </p>

                  <p className="text-xs text-slate-500">
                    {prelevement.paye
                      ? 'Prélevé'
                      : 'En attente'}
                  </p>
                </div>

                <p className="shrink-0 font-bold">
                  {formatMontant(prelevement.montant)}
                </p>
              </label>
            ))}
          </div>
        </section>

        <section className="mt-7 px-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                Dépenses ajoutées
              </h2>

              <p className="text-sm text-slate-500">
                Courses, carburant, sorties…
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setAfficherFormulaire(
                  !afficherFormulaire
                );
                setMessageErreur('');
              }}
              className="shrink-0 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white"
            >
              + Ajouter
            </button>
          </div>

          {afficherFormulaire && (
            <form
              onSubmit={ajouterDepense}
              className="mb-3 rounded-2xl bg-white p-4 shadow-sm"
            >
              <label
                htmlFor="nom-depense"
                className="block text-sm font-semibold"
              >
                Nom de la dépense
              </label>

              <input
                id="nom-depense"
                type="text"
                value={nomDepense}
                onChange={(evenement) =>
                  setNomDepense(evenement.target.value)
                }
                placeholder="Exemple : Courses"
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />

              <label
                htmlFor="montant-depense"
                className="mt-4 block text-sm font-semibold"
              >
                Montant
              </label>

              <input
                id="montant-depense"
                type="text"
                inputMode="decimal"
                value={montantDepense}
                onChange={(evenement) =>
                  setMontantDepense(
                    evenement.target.value
                  )
                }
                placeholder="0,00"
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />

              {messageErreur && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
                >
                  {messageErreur}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAfficherFormulaire(false);
                    setMessageErreur('');
                  }}
                  className="rounded-xl bg-slate-200 p-3 font-semibold"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-yellow-400 p-3 font-bold text-slate-950"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          )}

          {depenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
              <p className="text-sm text-slate-500">
                Aucune dépense ajoutée pour le moment.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {depenses.map((depense) => (
                <div
                  key={depense.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {depense.nom}
                    </p>

                    <p className="text-sm text-slate-500">
                      {formatMontant(depense.montant)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      supprimerDepense(depense.id)
                    }
                    className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}