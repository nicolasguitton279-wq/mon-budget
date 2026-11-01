'use client';

import { useEffect, useState } from 'react';

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
  { id: 1, nom: 'Loyer', montant: 841.46, paye: true },
  { id: 2, nom: 'Electricite', montant: 162, paye: false },
  { id: 3, nom: 'Eau', montant: 71, paye: false },
  { id: 4, nom: 'Internet', montant: 29.99, paye: false },
];

export default function Home() {
  const [solde, setSolde] = useState(3500);
  const [prelevements, setPrelevements] =
    useState<Prelevement[]>(prelevementsInitiaux);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [nomDepense, setNomDepense] = useState('');
  const [montantDepense, setMontantDepense] = useState('');

  useEffect(() => {
    const donnees = localStorage.getItem('mon-budget');

    if (donnees) {
      const budget = JSON.parse(donnees);

      setSolde(budget.solde ?? 3500);
      setPrelevements(budget.prelevements ?? prelevementsInitiaux);
      setDepenses(budget.depenses ?? []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      'mon-budget',
      JSON.stringify({
        solde,
        prelevements,
        depenses,
      })
    );
  }, [solde, prelevements, depenses]);

  const totalRestantPrelevements = prelevements
    .filter((prelevement) => !prelevement.paye)
    .reduce((total, prelevement) => total + prelevement.montant, 0);

  const totalDepenses = depenses.reduce(
    (total, depense) => total + depense.montant,
    0
  );

  const resteAVivre = solde - totalRestantPrelevements - totalDepenses;

  const formatMontant = (montant: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(montant);

  const modifierPrelevement = (id: number) => {
    setPrelevements((liste) =>
      liste.map((prelevement) =>
        prelevement.id === id
          ? { ...prelevement, paye: !prelevement.paye }
          : prelevement
      )
    );
  };

  const ajouterDepense = (evenement: React.FormEvent) => {
    evenement.preventDefault();

    const montant = Number(montantDepense.replace(',', '.'));

    if (!nomDepense.trim() || !Number.isFinite(montant) || montant <= 0) {
      return;
    }

    setDepenses((liste) => [
      ...liste,
      {
        id: Date.now(),
        nom: nomDepense.trim(),
        montant,
      },
    ]);

    setNomDepense('');
    setMontantDepense('');
    setAfficherFormulaire(false);
  };

  const supprimerDepense = (id: number) => {
    setDepenses((liste) => liste.filter((depense) => depense.id !== id));
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-28 text-slate-900">
      <div className="mx-auto max-w-md">
        <header className="bg-slate-950 px-5 pb-8 pt-8 text-white">
          <p className="text-sm text-slate-400">Bonjour Nicolas</p>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Mon Budget</h1>
            <div className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-slate-950">
              NOVEMBRE
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
                value={solde}
                onChange={(event) => setSolde(Number(event.target.value))}
                className="w-full border-0 bg-transparent p-0 text-4xl font-bold text-white outline-none"
              />
              <span className="ml-2 text-3xl font-bold">€</span>
            </div>
          </div>
        </header>

        <section className="-mt-4 px-4">
          <div className="rounded-3xl bg-yellow-400 p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-700">
              Reste à vivre
            </p>

            <p
              className={`mt-1 text-4xl font-black ${
                resteAVivre < 0 ? 'text-red-700' : 'text-slate-950'
              }`}
            >
              {formatMontant(resteAVivre)}
            </p>

            <p className="mt-2 text-sm text-slate-700">
              Après les prélèvements restants et les dépenses ajoutées
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 px-4 py-5">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              À payer
            </p>
            <p className="mt-2 text-xl font-bold">
              {formatMontant(totalRestantPrelevements)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Dépenses
            </p>
            <p className="mt-2 text-xl font-bold">
              {formatMontant(totalDepenses)}
            </p>
          </div>
        </section>

        <section className="px-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Prélèvements</h2>
              <p className="text-sm text-slate-500">
                Coche ceux qui sont déjà passés
              </p>
            </div>
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
                  onChange={() => modifierPrelevement(prelevement.id)}
                  className="h-6 w-6 accent-green-600"
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={`font-semibold ${
                      prelevement.paye
                        ? 'text-slate-500 line-through'
                        : 'text-slate-900'
                    }`}
                  >
                    {prelevement.nom}
                  </p>
                  <p className="text-xs text-slate-500">
                    {prelevement.paye ? 'Prélevé' : 'En attente'}
                  </p>
                </div>

                <p className="font-bold">
                  {formatMontant(prelevement.montant)}
                </p>
              </label>
            ))}
          </div>
        </section>

        <section className="mt-7 px-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Dépenses ajoutées</h2>
              <p className="text-sm text-slate-500">
                Courses, carburant, sorties...
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAfficherFormulaire(!afficherFormulaire)}
              className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white"
            >
              + Ajouter
            </button>
          </div>

          {afficherFormulaire && (
            <form
              onSubmit={ajouterDepense}
              className="mb-3 rounded-2xl bg-white p-4 shadow-sm"
            >
              <label className="block text-sm font-semibold">
                Nom de la dépense
              </label>
              <input
                type="text"
                value={nomDepense}
                onChange={(event) => setNomDepense(event.target.value)}
                placeholder="Exemple : Courses"
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500"
              />

              <label className="mt-4 block text-sm font-semibold">
                Montant
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={montantDepense}
                onChange={(event) => setMontantDepense(event.target.value)}
                placeholder="0,00"
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-yellow-500"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAfficherFormulaire(false)}
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
                  className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-semibold">{depense.nom}</p>
                    <p className="text-sm text-slate-500">
                      {formatMontant(depense.montant)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => supprimerDepense(depense.id)}
                    className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
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